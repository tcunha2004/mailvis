from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

EmailStatus = Literal["processing", "saved", "trashed", "failed"]
Priority = Literal["low", "medium", "high"]


class EmailIn(BaseModel):
    author: str = Field(min_length=1, max_length=320, examples=["Alice <alice@company.com>"])
    to: str = Field(min_length=1, max_length=320, examples=["Me <me@company.com>"])
    subject: str = Field(max_length=998, examples=["Quick question about the API docs"])
    body: str = Field(min_length=1, max_length=50_000)


class EmailOut(BaseModel):
    id: UUID
    author: str
    to: str
    subject: str
    body: str
    status: EmailStatus
    triage_reasoning: str | None
    priority: Priority | None
    summary: str | None
    error: str | None
    created_at: datetime
    updated_at: datetime


class TraceStep(BaseModel):
    role: Literal["human", "ai", "tool"]
    content: str
    name: str | None = None
    tool_calls: list[dict] = []


class EmailDetail(EmailOut):
    trace: list[TraceStep]


class FeedbackIn(BaseModel):
    label: Literal["save", "trash"] | None = Field(
        default=None, description="The decision the triage step should have made."
    )
    feedback: str | None = Field(
        default=None,
        max_length=2_000,
        description="Free-text feedback used to rewrite the agent instructions.",
    )

    @model_validator(mode="after")
    def at_least_one(self):
        if self.label is None and not (self.feedback and self.feedback.strip()):
            raise ValueError("Provide a label, a feedback text, or both.")
        return self


class FeedbackOut(BaseModel):
    email: EmailOut
    example_saved: bool
    updated_instructions: list[str]


class Memory(BaseModel):
    id: str
    content: str
    created_at: datetime
    updated_at: datetime


class Instruction(BaseModel):
    key: str
    title: str
    description: str
    prompt: str
    is_default: bool


class InstructionIn(BaseModel):
    prompt: str = Field(min_length=1, max_length=4_000)
