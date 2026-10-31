"""Chat models used by the chains: Gemini for general features, an OpenRouter model for ticket routing."""

from functools import lru_cache

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from app.config import get_settings


class LLMNotConfiguredError(RuntimeError):
    """Raised when a chain runs without the API key its model needs."""


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


@lru_cache
def get_routing_llm() -> BaseChatModel:
    """The OpenRouter model that recommends which department should handle a ticket."""
    settings = get_settings()
    if not settings.openrouter_api_key:
        raise LLMNotConfiguredError(
            "OPENROUTER_API_KEY is not set. Add it to the .env file and restart the service."
        )
    # OpenRouter speaks the OpenAI API, so LangChain's OpenAI chat model works with its base URL
    return ChatOpenAI(
        model=settings.openrouter_model,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        temperature=settings.openrouter_temperature,
        timeout=settings.openrouter_timeout_seconds,
        max_retries=2,
        # Optional attribution headers OpenRouter shows in its dashboard
        default_headers={"X-Title": "Trackit"},
    )
