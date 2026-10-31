"""Incident draft chain and route; runs without a Gemini key (fake chat model)."""

import json

import pytest
from fastapi.testclient import TestClient
from langchain_core.exceptions import OutputParserException
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from app.chains import incident_draft
from app.config import Settings, get_settings
from app.llm import LLMNotConfiguredError
from app.main import app
from app.schemas import IncidentDraft

DESCRIPTION = "My VPN keeps dropping every few minutes since this morning and I can't reach the CRM."

VALID_DRAFT = {
    "title": "VPN disconnects every few minutes",
    "description": "My VPN drops every few minutes since this morning, so I can't reach the CRM.",
    "category": "NETWORK",
    "affected_service": "VPN",
    "impact": "LOW",
    "urgency": "HIGH",
}


@pytest.fixture
def client():
    app.dependency_overrides[get_settings] = lambda: Settings(SERVICE_TOKEN="")
    yield TestClient(app)
    app.dependency_overrides.clear()


def fake_model(reply: dict | str) -> FakeListChatModel:
    text = reply if isinstance(reply, str) else json.dumps(reply)
    return FakeListChatModel(responses=[text])


async def test_chain_parses_model_json():
    draft = await incident_draft.draft(DESCRIPTION, llm=fake_model(VALID_DRAFT))
    assert draft == IncidentDraft(**VALID_DRAFT)


async def test_chain_accepts_json_in_a_code_fence_and_caps_text():
    reply = {**VALID_DRAFT, "title": "x" * 300, "affected_service": "   "}
    draft = await incident_draft.draft(DESCRIPTION, llm=fake_model(f"```json\n{json.dumps(reply)}\n```"))
    assert len(draft.title) == 120
    assert draft.affected_service is None


async def test_chain_rejects_unknown_category():
    with pytest.raises(OutputParserException):
        await incident_draft.draft(DESCRIPTION, llm=fake_model({**VALID_DRAFT, "category": "PRINTERS"}))


def test_endpoint_returns_draft(client, monkeypatch):
    async def fake_draft(description):
        assert description == DESCRIPTION
        return IncidentDraft(**VALID_DRAFT)

    monkeypatch.setattr(incident_draft, "draft", fake_draft)
    response = client.post("/api/incident-draft", json={"description": DESCRIPTION})
    assert response.status_code == 200
    assert response.json() == VALID_DRAFT


def test_endpoint_validates_description(client):
    assert client.post("/api/incident-draft", json={"description": "too short"}).status_code == 422
    assert client.post("/api/incident-draft", json={"description": "x" * 2001}).status_code == 422


def test_endpoint_reports_missing_key(client, monkeypatch):
    async def not_configured(description):
        raise LLMNotConfiguredError("GOOGLE_API_KEY is not set.")

    monkeypatch.setattr(incident_draft, "draft", not_configured)
    assert client.post("/api/incident-draft", json={"description": DESCRIPTION}).status_code == 503


def test_endpoint_reports_model_failure(client, monkeypatch):
    async def broken(description):
        raise OutputParserException("not JSON")

    monkeypatch.setattr(incident_draft, "draft", broken)
    response = client.post("/api/incident-draft", json={"description": DESCRIPTION})
    assert response.status_code == 502
    assert "fill it in yourself" in response.json()["detail"]
