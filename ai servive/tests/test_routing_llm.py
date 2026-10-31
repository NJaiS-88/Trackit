"""The OpenRouter routing model is configured from settings; no network calls are made."""

import pytest
from fastapi.testclient import TestClient
from langchain_openai import ChatOpenAI

from app import llm
from app.config import Settings
from app.main import app


@pytest.fixture
def routing_settings(monkeypatch):
    """Points get_routing_llm at the given settings and clears its cache before and after."""

    def apply(**values):
        monkeypatch.setattr(llm, "get_settings", lambda: Settings(**values))
        llm.get_routing_llm.cache_clear()

    yield apply
    llm.get_routing_llm.cache_clear()


def test_routing_llm_requires_api_key(routing_settings):
    routing_settings(OPENROUTER_API_KEY="")
    with pytest.raises(llm.LLMNotConfiguredError, match="OPENROUTER_API_KEY"):
        llm.get_routing_llm()


def test_routing_llm_uses_openrouter(routing_settings):
    routing_settings(OPENROUTER_API_KEY="sk-or-test", OPENROUTER_MODEL="typesafe/jev-router")
    model = llm.get_routing_llm()
    assert isinstance(model, ChatOpenAI)
    assert model.model_name == "typesafe/jev-router"
    assert str(model.openai_api_base).startswith("https://openrouter.ai/api/v1")
    assert model.temperature == 0.0


def test_health_reports_routing_model():
    body = TestClient(app).get("/health").json()
    assert body["routing_model"]
    assert isinstance(body["routing_configured"], bool)
