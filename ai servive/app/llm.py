"""The shared Gemini chat model used by every chain."""

from functools import lru_cache

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings


class LLMNotConfiguredError(RuntimeError):
    """Raised when a chain runs without GOOGLE_API_KEY set."""


@lru_cache
def get_llm() -> BaseChatModel:
    settings = get_settings()
    if not settings.google_api_key:
        raise LLMNotConfiguredError("GOOGLE_API_KEY is not set. Add it to the .env file and restart the service.")
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=settings.gemini_temperature,
        timeout=settings.gemini_timeout_seconds,
        max_retries=2,
    )
