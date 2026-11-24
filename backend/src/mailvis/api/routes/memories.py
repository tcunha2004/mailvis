import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from langgraph.store.base import BaseStore

from mailvis.api.deps import get_store, get_user_id
from mailvis.api.schemas import Memory

router = APIRouter(prefix="/memories", tags=["memories"])

UserId = Annotated[str, Depends(get_user_id)]
Store = Annotated[BaseStore, Depends(get_store)]


def namespace(user_id: str) -> tuple[str, ...]:
    # Must match MEMORY_NAMESPACE used by the langmem tools.
    return ("mailvis", user_id, "collection")


def memory_text(value: dict) -> str:
    content = value.get("content")
    return content if isinstance(content, str) else json.dumps(content or value)


@router.get("", response_model=list[Memory], summary="List what the agent remembers")
def list_memories(user_id: UserId, store: Store, limit: Annotated[int, Query(ge=1, le=1000)] = 200):
    items = store.search(namespace(user_id), limit=limit)
    items.sort(key=lambda item: item.updated_at, reverse=True)
    return [
        Memory(
            id=item.key,
            content=memory_text(item.value),
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in items
    ]


@router.delete("/{memory_id}", status_code=204, summary="Forget a memory")
def delete_memory(memory_id: str, user_id: UserId, store: Store):
    if store.get(namespace(user_id), memory_id) is None:
        raise HTTPException(status_code=404, detail="Memory not found")
    store.delete(namespace(user_id), memory_id)
    return Response(status_code=204)
