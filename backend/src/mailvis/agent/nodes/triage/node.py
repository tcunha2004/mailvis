import logging
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.store.base import BaseStore
from langgraph.types import Command
from pydantic import BaseModel, Field

from mailvis import db
from mailvis.agent.config import LLM, AgentState
from mailvis.agent.instructions import get_prompt
from mailvis.agent.nodes.triage.prompts import (
    format_email,
    triage_system_prompt,
    triage_user_prompt,
)

logger = logging.getLogger(__name__)


class TriageOutput(BaseModel):
    """Analyze the unread email and route it according to its content."""

    reasoning: str = Field(description="One or two sentences explaining the decision.")
    classification: Literal["trash", "save"] = Field(
        description="'trash' for irrelevant emails, 'save' for relevant emails",
    )


llm_router = LLM.with_structured_output(TriageOutput)


example_template = """Subject: {subject}
From: {author}
To: {to}
Body:
```
{body}
```
> Triage Result: {result}"""


def examples_namespace(user_id: str) -> tuple[str, ...]:
    return ("mailvis", user_id, "examples")


def format_examples(examples) -> str:
    """Render few-shot examples (store items with an email and the correct label)."""
    return "\n\n------------\n\n".join(
        example_template.format(
            subject=eg.value["email"]["subject"],
            author=eg.value["email"]["author"],
            to=eg.value["email"]["to"],
            body=eg.value["email"]["body"][:400],
            result=eg.value["label"],
        )
        for eg in examples
    )


def node_triage(
    state: AgentState, config: RunnableConfig, store: BaseStore
) -> Command[Literal["node_executor", "__end__"]]:
    email = state["email_input"]
    user_id = config["configurable"]["user_id"]
    email_id = config["configurable"]["email_id"]

    examples = store.search(examples_namespace(user_id), query=format_email(email), limit=3)

    response: TriageOutput = llm_router.invoke(  # type: ignore[assignment]
        [
            SystemMessage(
                content=triage_system_prompt.format(
                    triage_save=get_prompt(store, user_id, "triage_save"),
                    triage_trash=get_prompt(store, user_id, "triage_trash"),
                    examples=format_examples(examples) or "No examples yet.",
                )
            ),
            HumanMessage(content=triage_user_prompt.format(email=format_email(email))),
        ]
    )
    logger.info("Email %s triaged as %s", email_id, response.classification)

    status = "saved" if response.classification == "save" else "trashed"
    db.update_email(email_id, status=status, triage_reasoning=response.reasoning)

    if response.classification == "trash":
        return Command(goto="__end__")
    return Command(
        goto="node_executor",
        update={"messages": [HumanMessage(content=format_email(email))]},
    )
