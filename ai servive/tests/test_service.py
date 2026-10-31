"""Runs without a Gemini key: the model is replaced by LangChain's fake chat model."""

import pytest
from fastapi.testclient import TestClient
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from app.chains import chat
from app.config import Settings, get_settings
from app.main import app
from app.schemas import ChatMessage


@pytest.fixture
def client():
    yield TestClient(app)
    app.dependency_overrides.clear()


def use_settings(**values):
    app.dependency_overrides[get_settings] = lambda: Settings(**values)


def test_health_reports_model(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_chat_chain_returns_model_text():
    fake = FakeListChatModel(responses=["Restart the VPN client."])
    history = [ChatMessage(role="user", content="Hi"), ChatMessage(role="assistant", content="Hello!")]
    assert await chat.answer("My VPN keeps dropping", history, llm=fake) == "Restart the VPN client."


def test_chat_endpoint_uses_chain(client, monkeypatch):
    use_settings(SERVICE_TOKEN="")

    async def fake_answer(question, history):
        return f"echo: {question}"

    monkeypatch.setattr(chat, "answer", fake_answer)
    response = client.post("/api/chat", json={"question": "ping"})
    assert response.status_code == 200
    assert response.json()["answer"] == "echo: ping"


def test_service_token_is_enforced_when_set(client):
    use_settings(SERVICE_TOKEN="secret")
    assert client.post("/api/chat", json={"question": "ping"}).status_code == 401
    wrong = client.post("/api/chat", json={"question": "ping"}, headers={"X-Service-Token": "nope"})
    assert wrong.status_code == 401


def test_chat_validates_input(client):
    use_settings(SERVICE_TOKEN="")
    assert client.post("/api/chat", json={"question": ""}).status_code == 422
