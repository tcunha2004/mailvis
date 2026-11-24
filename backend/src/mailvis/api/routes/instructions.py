from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from langgraph.store.base import BaseStore

from mailvis.agent.instructions import INSTRUCTIONS, get_prompt, set_prompt
from mailvis.api.deps import get_store, get_user_id
from mailvis.api.schemas import Instruction, InstructionIn

router = APIRouter(prefix="/instructions", tags=["instructions"])

UserId = Annotated[str, Depends(get_user_id)]
Store = Annotated[BaseStore, Depends(get_store)]


def to_schema(store: BaseStore, user_id: str, key: str) -> Instruction:
    meta = INSTRUCTIONS[key]
    prompt = get_prompt(store, user_id, key)
    return Instruction(
        key=key,
        title=meta["title"],
        description=meta["description"],
        prompt=prompt,
        is_default=prompt == meta["default"],
    )


def check_key(key: str) -> None:
    if key not in INSTRUCTIONS:
        raise HTTPException(status_code=404, detail="Instruction not found")


@router.get("", response_model=list[Instruction], summary="Current agent instructions")
def list_instructions(user_id: UserId, store: Store):
    return [to_schema(store, user_id, key) for key in INSTRUCTIONS]


@router.put("/{key}", response_model=Instruction, summary="Edit an instruction")
def update_instruction(key: str, body: InstructionIn, user_id: UserId, store: Store):
    check_key(key)
    set_prompt(store, user_id, key, body.prompt.strip())
    return to_schema(store, user_id, key)


@router.delete("/{key}", response_model=Instruction, summary="Reset an instruction to default")
def reset_instruction(key: str, user_id: UserId, store: Store):
    check_key(key)
    set_prompt(store, user_id, key, INSTRUCTIONS[key]["default"])
    return to_schema(store, user_id, key)
