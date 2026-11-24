from typing import Annotated

from fastapi import Header, Request
from langgraph.graph.state import CompiledStateGraph
from langgraph.store.base import BaseStore

from mailvis import settings


def get_user_id(
    x_user_id: Annotated[
        str, Header(max_length=64, pattern=r"^[\w.@-]+$", description="Tenant/user identifier")
    ] = settings.DEFAULT_USER_ID,
) -> str:
    return x_user_id


def get_graph(request: Request) -> CompiledStateGraph:
    return request.app.state.graph


def get_store(request: Request) -> BaseStore:
    return request.app.state.store
