"""User-editable instructions. They live in the store so the optimizer can rewrite them
from feedback, and each user ends up with their own version."""

from langgraph.store.base import BaseStore

INSTRUCTIONS = {
    "triage_save": {
        "title": "Emails to keep",
        "description": "What the triage step considers relevant and saves.",
        "default": """Messages from real people (colleagues, clients, recruiters, friends, family),
questions or requests, meeting invitations or scheduling, deadlines, follow-ups,
important notices (bills, security alerts, account or legal matters).""",
    },
    "triage_trash": {
        "title": "Emails to trash",
        "description": "What the triage step considers noise and discards.",
        "default": """Marketing and promotions, newsletters, mass mailings, automated
notifications with no action required, spam, phishing attempts.""",
    },
    "executor_instructions": {
        "title": "Processing workflow",
        "description": "How a kept email is prioritized, summarized and remembered.",
        "default": """1. Call search_memory_tool to retrieve known facts that help classify the email.
2. Call classify_email, choosing the priority (low, medium or high) from the email content
   and the retrieved facts, and writing a one-sentence summary.
3. Call save_email with the metadata returned by classify_email.
4. If the email reveals a durable fact worth remembering, call manage_memory_tool to
   save it. If the fact already exists in memory, update it instead of creating a duplicate.""",
    },
}


def namespace(user_id: str) -> tuple[str, ...]:
    return ("mailvis", user_id, "instructions")


def get_prompt(store: BaseStore, user_id: str, key: str) -> str:
    """Read the user's instruction from the store, seeding the default on first use."""
    item = store.get(namespace(user_id), key)
    if item is None:
        default = INSTRUCTIONS[key]["default"]
        set_prompt(store, user_id, key, default)
        return default
    return item.value["prompt"]


def set_prompt(store: BaseStore, user_id: str, key: str, prompt: str) -> None:
    store.put(namespace(user_id), key, {"prompt": prompt}, index=False)
