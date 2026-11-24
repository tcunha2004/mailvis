from typing import Literal

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langmem import create_manage_memory_tool, create_search_memory_tool
from pydantic import BaseModel, Field

from mailvis import db

MEMORY_NAMESPACE = ("mailvis", "{user_id}", "collection")


class EmailMetadata(BaseModel):
    priority: Literal["low", "medium", "high"] = Field(
        description="How urgent the email is for the user"
    )
    summary: str = Field(
        description="One sentence describing what the email is about and any action needed"
    )


@tool
def classify_email(metadata: EmailMetadata) -> dict:
    """Add tags and metadata to the email. Always call this before save_email.

    Fill `metadata` from the email content and the facts found in memory. Returns the
    metadata, ready to be passed to save_email.
    """
    return metadata.model_dump()


@tool
def save_email(metadata: EmailMetadata, config: RunnableConfig) -> str:
    """Store the email, with its metadata, in the database.

    Only call this after classify_email. Returns a confirmation message.
    """
    email_id = config["configurable"]["email_id"]
    db.update_email(email_id, priority=metadata.priority, summary=metadata.summary)
    return "Email saved."


TOOLS = [
    classify_email,
    save_email,
    create_manage_memory_tool(namespace=MEMORY_NAMESPACE),
    create_search_memory_tool(namespace=MEMORY_NAMESPACE),
]
