"""Request and response bodies."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    # Earlier turns, oldest first, so the model can follow the conversation
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    answer: str
    model: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    model: str
    llm_configured: bool


# Must match Trackit's Category, Impact and Urgency enums
Category = Literal["NETWORK", "SOFTWARE", "HARDWARE", "DATABASE", "SECURITY", "BACKEND", "OTHER"]
Level = Literal["LOW", "MEDIUM", "HIGH"]


class IncidentDraftRequest(BaseModel):
    # The employee's own words, e.g. "VPN keeps dropping since this morning and I can't reach the CRM"
    description: str = Field(min_length=10, max_length=2000)


class IncidentDraft(BaseModel):
    """New Incident form fields filled from the employee's description; the employee reviews them before submitting."""

    title: str = Field(description="Short, specific summary of the problem, at most 120 characters")
    description: str = Field(
        description="The problem restated clearly, keeping every detail the employee gave, at most 3000 characters"
    )
    category: Category = Field(description="Which kind of IT problem this is")
    affected_service: str | None = Field(
        default=None, description="The system or application affected, e.g. 'Email', or null if none is named"
    )
    impact: Level = Field(
        description="Who is affected: LOW = just the reporter, MEDIUM = their team or department, "
        "HIGH = several teams or the whole company"
    )
    urgency: Level = Field(
        description="Can they keep working: LOW = yes, it is an annoyance, MEDIUM = partly, with a workaround, "
        "HIGH = no, completely blocked"
    )

    # Trim and cap free text instead of rejecting a slightly long answer from the model
    @field_validator("title", mode="before")
    @classmethod
    def _cap_title(cls, value: str) -> str:
        return str(value).strip()[:120]

    @field_validator("description", mode="before")
    @classmethod
    def _cap_description(cls, value: str) -> str:
        return str(value).strip()[:3000]

    @field_validator("affected_service", mode="before")
    @classmethod
    def _cap_affected_service(cls, value: str | None) -> str | None:
        if value is None:
            return None
        text = str(value).strip()[:120]
        return text or None
