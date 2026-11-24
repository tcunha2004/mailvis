import logging
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langgraph.graph.state import CompiledStateGraph
from langgraph.store.base import BaseStore

from mailvis import db
from mailvis.agent.nodes.triage.node import examples_namespace
from mailvis.agent.nodes.triage.prompts import format_email
from mailvis.agent.optimizer import update_instructions
from mailvis.api.deps import get_graph, get_store, get_user_id
from mailvis.api.schemas import (
    EmailDetail,
    EmailIn,
    EmailOut,
    EmailStatus,
    FeedbackIn,
    FeedbackOut,
    TraceStep,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emails", tags=["emails"])

UserId = Annotated[str, Depends(get_user_id)]
Graph = Annotated[CompiledStateGraph, Depends(get_graph)]
Store = Annotated[BaseStore, Depends(get_store)]


def run_config(user_id: str, email_id: str) -> dict:
    return {"configurable": {"thread_id": email_id, "user_id": user_id, "email_id": email_id}}


def email_fields(email: dict) -> dict:
    return {key: email[key] for key in ("author", "to", "subject", "body")}


def serialize_message(message: BaseMessage) -> TraceStep | None:
    if message.type not in ("human", "ai", "tool"):
        return None
    tool_calls = [
        {"name": call["name"], "args": call["args"]}
        for call in getattr(message, "tool_calls", None) or []
    ]
    return TraceStep(
        role=message.type,  # type: ignore[arg-type]
        content=message.text,
        name=message.name if message.type == "tool" else None,
        tool_calls=tool_calls,
    )


def build_trajectory(email: dict, messages: list[BaseMessage]) -> list[BaseMessage]:
    """The full story the optimizer needs: the email, the triage decision, and the executor run.

    `messages[0]` (when present) is the email itself, added by the triage node."""
    decision = "save" if email["status"] == "saved" else "trash"
    triage = AIMessage(
        content=f"Triage decision: {decision}. Reasoning: {email['triage_reasoning'] or 'n/a'}"
    )
    return [HumanMessage(content=format_email(email)), triage, *messages[1:]]


def get_or_404(user_id: str, email_id: UUID) -> dict:
    email = db.get_email(user_id, str(email_id))
    if email is None:
        raise HTTPException(status_code=404, detail="Email not found")
    return email


@router.post("", response_model=EmailOut, status_code=201, summary="Process a new email")
def process_email(email: EmailIn, user_id: UserId, graph: Graph):
    """Run the agent on an incoming email: triage it, then prioritize, summarize and
    remember what matters. Blocks until the agent finishes (usually a few seconds)."""
    row = db.create_email(user_id, email.model_dump())
    email_id = str(row["id"])
    try:
        graph.invoke(
            {"email_input": email.model_dump(), "messages": []}, run_config(user_id, email_id)
        )
    except Exception as exc:
        logger.exception("Agent failed on email %s", email_id)
        db.update_email(email_id, status="failed", error=f"{type(exc).__name__}: {exc}"[:500])
    return db.get_email(user_id, email_id)


@router.get("", response_model=list[EmailOut], summary="List processed emails")
def list_emails(
    user_id: UserId,
    status: EmailStatus | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
):
    return db.list_emails(user_id, status, limit)


@router.get("/{email_id}", response_model=EmailDetail, summary="Get an email and its agent trace")
def get_email(email_id: UUID, user_id: UserId, graph: Graph):
    email = get_or_404(user_id, email_id)
    state = graph.get_state(run_config(user_id, str(email_id)))
    messages = state.values.get("messages", []) if state else []
    trace = [step for m in messages if (step := serialize_message(m))]
    return {**email, "trace": trace}


@router.delete("/{email_id}", status_code=204, summary="Delete an email")
def delete_email(email_id: UUID, user_id: UserId, request: Request):
    if not db.delete_email(user_id, str(email_id)):
        raise HTTPException(status_code=404, detail="Email not found")
    request.app.state.checkpointer.delete_thread(str(email_id))
    return Response(status_code=204)


@router.post(
    "/{email_id}/feedback", response_model=FeedbackOut, summary="Teach the agent from a mistake"
)
def give_feedback(email_id: UUID, body: FeedbackIn, user_id: UserId, graph: Graph, store: Store):
    """- `label` corrects the triage decision and is stored as a few-shot example, so similar
    emails are handled correctly next time.
    - `feedback` is free text. An optimizer rewrites the agent instructions affected by it."""
    email = get_or_404(user_id, email_id)

    updated: list[str] = []
    if body.feedback and body.feedback.strip():
        state = graph.get_state(run_config(user_id, str(email_id)))
        messages = state.values.get("messages", []) if state else []
        updated = update_instructions(
            store, user_id, build_trajectory(email, messages), body.feedback.strip()
        )

    if body.label:
        store.put(
            examples_namespace(user_id),
            str(uuid4()),
            {"email": email_fields(email), "label": body.label},
        )
        new_status = "saved" if body.label == "save" else "trashed"
        if email["status"] != new_status:
            # ponytail: a trashed->saved correction doesn't re-run the executor, so the email
            # stays without priority/summary. Re-run the graph here if that matters.
            original = email["triage_reasoning"] or "n/a"
            db.update_email(
                str(email_id),
                status=new_status,
                triage_reasoning=f"Corrected by you. The agent originally said: {original}",
            )

    return FeedbackOut(
        email=get_or_404(user_id, email_id),  # type: ignore[arg-type]
        example_saved=body.label is not None,
        updated_instructions=updated,
    )
