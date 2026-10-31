# Trackit AI Service

LangChain chains served over HTTP with FastAPI: Google Gemini for chat and incident drafts, and an OpenRouter model for ticket routing. The Trackit backend calls this service; browsers normally don't.

## Setup

Requires Python 3.11+.

```powershell
cd "ai service"
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
copy .env.example .env                # then set GOOGLE_API_KEY and OPENROUTER_API_KEY
```

Get keys from [Google AI Studio](https://aistudio.google.com/app/apikey) and [OpenRouter](https://openrouter.ai/keys).
The default routing model is paid, so the OpenRouter account needs credits; without them `/api/tickets/route` returns `502`.

## Run

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

- `GET  /health`: status, model names, and whether each key is configured (`llm_configured`, `routing_configured`)
- `POST /api/chat`: `{ "question": "...", "history": [{ "role": "user" | "assistant", "content": "..." }] }`
- `POST /api/incident-draft`: `{ "description": "..." }` → New Incident form fields
- `POST /api/tickets/route`: a ticket (`title`, `description`, `category`, `affected_service`, `current_department_id`)
  and `departments` (`id`, `name`, `description`) → the recommended `department_id`, `department_name`, `confidence`
  (HIGH / MEDIUM / LOW), `reason` and `stay` (true when it recommends the current department). Only one of the given
  departments can be chosen.
- Interactive docs: <http://localhost:8000/docs>

If `SERVICE_TOKEN` is set, every `/api` request must send it in the `X-Service-Token` header.

## Test

```powershell
pytest
```

Tests use LangChain's fake chat model, so they need no API key and make no network calls.

## Adding a chain

1. Create `app/chains/<feature>.py` following `chat.py`: a prompt, `get_llm()`, and an output parser composed with `|`.
   Accept an optional `llm` argument so tests can pass a fake model.
2. Add request/response models to `app/schemas.py`.
3. Add a route to the `api` router in `app/main.py` (it already applies the service-token check).
4. Add a test in `tests/` using `FakeListChatModel`.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `GOOGLE_API_KEY` | (required) | Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model name |
| `GEMINI_TEMPERATURE` | `0.2` | 0 = focused, higher = more varied |
| `GEMINI_TIMEOUT_SECONDS` | `60` | Per-request timeout |
| `OPENROUTER_API_KEY` | (required for routing) | OpenRouter key for the ticket routing model |
| `OPENROUTER_MODEL` | `typesafe/jev-router` | Model that recommends a department |
| `OPENROUTER_TEMPERATURE` | `0` | 0 = the same ticket gets the same answer |
| `OPENROUTER_TIMEOUT_SECONDS` | `30` | Per-request timeout |
| `SERVICE_TOKEN` | empty (off) | Shared secret required from callers |
| `CORS_ALLOWED_ORIGINS` | empty (none) | Browser origins allowed to call directly |
