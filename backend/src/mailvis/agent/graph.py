from langchain.agents import create_agent
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import START, StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.store.base import BaseStore

from mailvis.agent.config import LLM, AgentState
from mailvis.agent.nodes.executor.prompts import executor_prompt
from mailvis.agent.nodes.executor.tools import TOOLS
from mailvis.agent.nodes.triage.node import node_triage


def build_graph(checkpointer: BaseCheckpointSaver, store: BaseStore) -> CompiledStateGraph:
    """triage -> (trash: end) | (save: executor agent -> end)."""
    builder = StateGraph(AgentState)
    builder.add_node(node_triage)
    builder.add_node(
        "node_executor",
        create_agent(model=LLM, tools=TOOLS, middleware=[executor_prompt]),
    )
    builder.add_edge(START, "node_triage")
    return builder.compile(checkpointer=checkpointer, store=store)
