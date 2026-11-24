from langchain.chat_models import init_chat_model
from langgraph.graph import MessagesState

from mailvis import settings


class AgentState(MessagesState):
    email_input: dict


LLM = init_chat_model(settings.LLM_MODEL)
