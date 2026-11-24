"""Fast tests: no database and no LLM calls. TestClient is used without `with`, so the
lifespan (DB connection) never runs; only validation and pure helpers are exercised."""

from types import SimpleNamespace

from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from mailvis.agent.nodes.triage.node import format_examples
from mailvis.api.deps import get_graph, get_store
from mailvis.api.main import app
from mailvis.api.routes.emails import build_trajectory, serialize_message
from mailvis.api.schemas import FeedbackIn

app.dependency_overrides = {get_graph: lambda: None, get_store: lambda: None}
client = TestClient(app)

EMAIL = {"author": "a@x.com", "to": "b@x.com", "subject": "Hi", "body": "Hello"}


def test_process_email_rejects_missing_body():
    response = client.post("/api/emails", json={**EMAIL, "body": ""})
    assert response.status_code == 422


def test_invalid_user_header_is_rejected():
    response = client.get("/api/emails", headers={"X-User-Id": "bad user!"})
    assert response.status_code == 422


def test_feedback_requires_label_or_text():
    assert (
        client.post(
            "/api/emails/00000000-0000-0000-0000-000000000000/feedback", json={"feedback": "  "}
        ).status_code
        == 422
    )
    assert FeedbackIn(label="save").label == "save"


def test_format_examples():
    examples = [SimpleNamespace(value={"email": {**EMAIL, "body": "x" * 1000}, "label": "trash"})]
    text = format_examples(examples)
    assert "Subject: Hi" in text and "> Triage Result: trash" in text
    assert "x" * 401 not in text  # body truncated to 400 chars
    assert format_examples([]) == ""


def test_serialize_message_keeps_tool_calls_and_skips_system():
    ai = AIMessage(content="ok", tool_calls=[{"name": "save_email", "args": {"p": 1}, "id": "1"}])
    step = serialize_message(ai)
    assert step and step.role == "ai"
    assert step.tool_calls == [{"name": "save_email", "args": {"p": 1}}]
    tool = serialize_message(ToolMessage(content="saved", name="save_email", tool_call_id="1"))
    assert tool and tool.name == "save_email"
    assert serialize_message(SimpleNamespace(type="system")) is None  # type: ignore[arg-type]


def test_build_trajectory_includes_triage_decision():
    email = {**EMAIL, "status": "trashed", "triage_reasoning": "spam"}
    executor_run = [HumanMessage(content="email"), AIMessage(content="done")]
    trajectory = build_trajectory(email, executor_run)
    assert "Triage decision: trash" in trajectory[1].content
    assert trajectory[2].content == "done"  # the duplicated email message is dropped
