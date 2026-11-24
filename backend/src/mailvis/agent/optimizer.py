import logging

from langgraph.store.base import BaseStore
from langmem import create_multi_prompt_optimizer

from mailvis.agent.config import LLM
from mailvis.agent.instructions import get_prompt, set_prompt

logger = logging.getLogger(__name__)

# "gradient": two steps (one call proposes improvements, another applies them to the prompt)
optimizer = create_multi_prompt_optimizer(LLM, kind="gradient")

# name the optimizer sees -> key in the store
prompt_keys = {
    "triage-save": "triage_save",
    "triage-trash": "triage_trash",
    "executor-priority-and-memory": "executor_instructions",
}

# Tells the optimizer WHEN to touch each prompt
when_to_update = {
    "triage-save": "Update this prompt only when the feedback says an email should have been "
    "SAVED instead of trashed",
    "triage-trash": "Update this prompt only when the feedback says an email should have been "
    "TRASHED instead of saved",
    "executor-priority-and-memory": "Update this prompt whenever the feedback is about what to do "
    "with an email that was already saved: its priority, its summary, or what to remember",
}


def update_instructions(store: BaseStore, user_id: str, messages: list, feedback: str) -> list[str]:
    """Rewrite in the store the instructions affected by the user's feedback.

    Returns the keys of the instructions that changed."""
    prompts = [
        {
            "name": name,
            "prompt": get_prompt(store, user_id, key),
            "update_instructions": "keep the instructions short and to the point",
            "when_to_update": when_to_update[name],
        }
        for name, key in prompt_keys.items()
    ]
    updated = optimizer.invoke({"trajectories": [(messages, feedback)], "prompts": prompts})  # type: ignore[arg-type]

    changed = []
    for old, new in zip(prompts, updated, strict=True):  # same order as the input
        if new["prompt"] != old["prompt"]:
            key = prompt_keys[old["name"]]
            set_prompt(store, user_id, key, new["prompt"])
            changed.append(key)
            logger.info("Instruction %s updated for user %s", key, user_id)
    return changed
