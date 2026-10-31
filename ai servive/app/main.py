"""HTTP entry point. Run with: uvicorn app.main:app --reload --port 8000"""

import logging

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.chains import chat, incident_draft
from app.config import get_settings
from app.llm import LLMNotConfiguredError
from app.schemas import ChatRequest, ChatResponse, HealthResponse, IncidentDraft, IncidentDraftRequest
from app.security import require_service_token

logger = logging.getLogger("trackit.ai")

settings = get_settings()
app = FastAPI(title="Trackit AI Service", version="0.1.0")

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Service-Token"],
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    current = get_settings()
    return HealthResponse(status="ok", model=current.gemini_model, llm_configured=bool(current.google_api_key))


api = APIRouter(prefix="/api", dependencies=[Depends(require_service_token)])


@api.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    try:
        answer = await chat.answer(request.question, request.history)
    except LLMNotConfiguredError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except Exception as error:
        logger.exception("Chat chain failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI model could not answer right now. Please try again.",
        ) from error
    return ChatResponse(answer=answer, model=get_settings().gemini_model)


@api.post("/incident-draft", response_model=IncidentDraft)
async def incident_draft_endpoint(request: IncidentDraftRequest) -> IncidentDraft:
    """Fills the New Incident form from the employee's own description; they review it before submitting."""
    try:
        return await incident_draft.draft(request.description)
    except LLMNotConfiguredError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except Exception as error:
        # Includes answers that don't match the ticket fields (OutputParserException)
        logger.exception("Incident draft chain failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI model could not fill in the ticket right now. Please try again or fill it in yourself.",
        ) from error


app.include_router(api)
