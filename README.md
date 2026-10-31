# Trackit

IT Incident Management System — a Spring Boot REST API with a React frontend.

| Folder | Stack |
|---|---|
| [`trackit/`](trackit) | Backend: Java 21, Spring Boot 3.3, Spring Security (JWT), MongoDB |
| [`frontend/`](frontend) | Frontend: React 19, Vite, React Router, Axios |

## Features

- **Authentication** — login with email and password (BCrypt), cookie-based sessions with short-lived access tokens and rotating refresh tokens in Redis. See [Security](#security).
- **Account requests** — nobody can create an account directly. Sign-up files a request; an admin approves it (creating an `EMPLOYEE`) or rejects it. Until then, logging in explains that the request is pending or rejected.
- **Roles** — `EMPLOYEE`, `ENGINEER`, `ADMIN`. Approved requests become `EMPLOYEE`; an admin assigns other roles from the user list.
- **User management (admin)** — paginated user list, change roles, activate / deactivate accounts. The last active admin cannot be demoted or deactivated.
- **Incidents** — employees report incidents (auto-numbered `INC-YYYY-000001`), filter and page through them, and view details. Employees see their own incidents, engineers see incidents assigned to them, admins see everything.
- **AI-assisted reporting** — on New Incident, an employee can describe the problem in their own words and have AI (Google Gemini via the [AI service](#ai-service)) fill in every field. They review and edit before submitting; the AI box disappears once used, and **Start over** clears the form and brings it back.
- **Ticket routing between departments** — a new ticket goes to the reporter's department Lead. AI suggests which department should handle it (from its title, description and category); the Lead decides whether to pass it to that department's Lead, who can then assign it to their own team. See [Ticket routing](#ticket-routing).

## Prerequisites

- Java 21+
- Node.js 20.19+
- A MongoDB instance (e.g. a free MongoDB Atlas cluster)
- A Redis instance (e.g. a free Upstash Redis database)
- Python 3.11+ and a [Google AI Studio](https://aistudio.google.com/app/apikey) key, for the optional AI service
- An [OpenRouter](https://openrouter.ai/keys) key with credits, for optional AI routing suggestions

## Running locally

### Backend

```bash
cd trackit
cp .env.example .env   # then fill in MONGO_URI, JWT_SECRET and REDIS_URL
./mvnw spring-boot:run # Windows: .\mvnw.cmd spring-boot:run
```

The API starts on <http://localhost:8081>. Swagger UI: <http://localhost:8081/swagger-ui.html>.

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGO_URI` | yes | — | MongoDB connection string |
| `JWT_SECRET` | yes | — | Base64 key, at least 256 bits (`openssl rand -base64 32`) |
| `REDIS_URL` | yes | `redis://localhost:6379` | Redis connection string; for Upstash the TLS `rediss://default:<password>@<host>.upstash.io:6379` URL |
| `CORS_ALLOWED_ORIGINS` | no | `http://localhost:5173` | Comma-separated exact frontend origins allowed to send cookies (`*` is rejected) |
| `COOKIE_SECURE` | no | `true` | `false` only for plain-http local development (SameSite=Lax, no Secure flag) |
| `ACCESS_TOKEN_TTL` | no | `10m` | Access-token lifetime |
| `REFRESH_TOKEN_TTL` | no | `7d` | Refresh-token lifetime; each refresh starts a new period (sliding) |
| `REDIS_KEY_PREFIX` | no | `trackit:` | Prefix for every Redis key, so environments can share a database |
| `MONGO_DATABASE` | no | `trackit` | Database name |
| `PORT` | no | `8081` | HTTP port |
| `API_DOCS_ENABLED` | no | `true` | Serve Swagger UI and `/v3/api-docs` |
| `ADMIN_EMAIL` | no | — | First admin, created at startup only if no active admin exists |
| `ADMIN_PASSWORD` | no | — | Password for that admin (at least 8 characters) |
| `ADMIN_NAME` | no | `Administrator` | Display name for that admin |
| `AI_SERVICE_URL` | no | `http://localhost:8000` | Base URL of the [AI service](#ai-service) |
| `AI_SERVICE_TOKEN` | no | — | Must equal the AI service's `SERVICE_TOKEN` |

### AI service

A separate Python service ([`ai service/`](ai%20service)) runs LangChain chains: Gemini for the incident draft, and an OpenRouter model (`typesafe/jev-router` by default) for [ticket routing](#ticket-routing). Only the backend calls it, so no AI key ever reaches the browser. Without it Trackit works normally: the AI box reports that the assistant is unavailable, and Leads pass tickets without a suggestion.

```powershell
cd "ai service"
python -m venv .venv
.\.venv\Scripts\pip install -r requirements-dev.txt
copy .env.example .env    # set GOOGLE_API_KEY, OPENROUTER_API_KEY, and SERVICE_TOKEN to the same value as the backend's AI_SERVICE_TOKEN
.\.venv\Scripts\python -m uvicorn app.main:app --port 8000
```

`GET http://localhost:8000/health` should report `"llm_configured": true`, and `"routing_configured": true` once `OPENROUTER_API_KEY` is set. See [`ai service/README.md`](ai%20service/README.md) for its settings and tests.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. To point the frontend at a different API URL, copy `.env.example` to `.env` and set `VITE_API_URL`.

### First admin

Account requests need an admin to approve them, so the first admin comes from configuration. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (in `.env` locally, or on Render) and restart the backend. On startup, if there is no active admin, Trackit creates that account — or, if a user with that email already exists, promotes it to admin and keeps its password. Once any active admin exists the variables are ignored, so you can remove them afterwards.

Admins review sign-ups under **Account Requests** in the sidebar, and change roles (e.g. to Engineer) under **Admin Users**.

## Ticket routing

Every ticket has a **handling department**, whose Lead sees it under **Work Assignments** and can assign it to their own employees.

1. An employee raises a ticket; it is handled by their own department's Lead.
2. In the background, the backend asks the AI service which department fits best. It sends the ticket's title, description, category and affected service, plus every department's name and description. The model (OpenRouter, `typesafe/jev-router` by default) answers with a department, a confidence (High / Medium / Low) and a one-line reason. Raising the ticket never waits for this.
3. The Lead sees the suggestion under the ticket and can **Re-run AI**. With **Pass to department…** they send it to another department's Lead, with an optional note. Nothing moves without a Lead's decision.
4. The receiving Lead sees the ticket with "Passed from …" and can assign it to their team, or pass it on again.

Rules: only the handling department's Lead can pass a ticket; resolved or closed tickets can't be passed, nor can tickets with employees still assigned (finish or reassign that work first). Every pass is kept, and the ticket page shows the **Routing history** to the reporter, Leads and admins.

Department descriptions (set by admins under **Departments**) give the AI much better suggestions. If the AI service is down or out of OpenRouter credits, tickets simply have no suggestion and Leads pass them manually.

## Security

**Tokens never reach JavaScript.** Login sets two HttpOnly cookies on the API's domain; the frontend keeps only the user's name and role in memory.

| Cookie | Contents | Lifetime | Sent to |
|---|---|---|---|
| `__Host-trackit_at` | Access token: HS256 JWT with user id, role, `iss`, `aud`, `jti` | 10 minutes | Every API request |
| `__Secure-trackit_rt` | Refresh token: 256-bit random value | 7 days, renewed on each refresh | `/api/auth/*` only |

In production both are `HttpOnly; Secure; SameSite=None; Partitioned`. `SameSite=None` is required because the frontend (`*.vercel.app`) and API (`*.onrender.com`) are different sites; `Partitioned` keeps the cookies working in browsers that block third-party cookies but support CHIPS (Chrome, Edge, Firefox). Safari blocks third-party cookies outright, so sign-in only works there if the frontend and API share a domain (e.g. `app.example.com` and `api.example.com`).

**Access tokens** are verified without a database lookup. Deactivating a user revokes all their refresh tokens immediately; their current access token stops working within 10 minutes.

**Refresh tokens** live in Redis as SHA-256 hashes (a Redis leak exposes no usable tokens). Every refresh rotates the token atomically (Lua script). Each login starts a token *family*; presenting an already-rotated token means it was copied, so the whole family is revoked. A 20-second grace window covers two tabs refreshing at the same moment. The frontend also serializes refreshes across tabs with the Web Locks API.

**CSRF.** There is no CSRF token. Because the cookies are `SameSite=None`, the browser attaches them to requests started by any site, so cross-site requests are stopped instead by:
1. **Origin check** — browsers send `Origin` on every cross-origin `POST`/`PUT`/`PATCH`/`DELETE` (HTML form posts included). Any such request whose `Origin` is not in `CORS_ALLOWED_ORIGINS` is rejected with `403 ORIGIN_NOT_ALLOWED` before it reaches a controller.
2. **Credentialed CORS allowlist** — only those origins may send credentialed `fetch`/XHR requests or read any response. A wildcard is refused at startup.
3. **No state changes on `GET`.**

**Also:** login rate limiting (5 failures per email per 15 minutes, in Redis), logout revokes the session family and clears all cookies, Spring Security headers (HSTS, `X-Frame-Options: DENY`, nosniff, `Referrer-Policy: no-referrer`, no-store caching), and a strict Content-Security-Policy on the frontend ([`frontend/vercel.json`](frontend/vercel.json)).

## Deployment

The backend runs on **Render** (Docker), the frontend on **Vercel**, and refresh tokens in **Upstash Redis**. Deploy the backend first so you have its URL for the frontend.

### 0. Upstash Redis

Create a Redis database at [upstash.com](https://upstash.com) in the region closest to your Render region. On its page, under **Connect**, copy the **Redis URL** that starts with `rediss://` (TLS). The REST URL and token are not used.

### 1. MongoDB Atlas

Render's outbound IPs are not fixed, so in Atlas → **Network Access** allow `0.0.0.0/0`, and use a database user with a strong password.

### 2. Backend on Render

1. In Render choose **New → Blueprint** and select this repository. [`render.yaml`](render.yaml) creates the `trackit-api` web service from [`trackit/Dockerfile`](trackit/Dockerfile).
2. When prompted, set:
   - `MONGO_URI` — your Atlas connection string
   - `REDIS_URL` — your Upstash `rediss://` URL
   - `CORS_ALLOWED_ORIGINS` — your Vercel URL, e.g. `https://trackit.vercel.app` (you can update this after step 3)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — the first admin account (see [First admin](#first-admin))
   - `JWT_SECRET` is generated automatically.
3. Wait for the deploy; Render checks `GET /actuator/health`, which also reports DOWN if MongoDB or Redis is unreachable. Note the service URL, e.g. `https://trackit-api.onrender.com`.

Swagger UI is off in production (`API_DOCS_ENABLED=false`). If you enable it, log in through `POST /api/auth/login` in Swagger; the cookies are then sent with every other request.

On the free plan the service sleeps after inactivity; the first request afterwards takes up to a minute.

### 2b. AI service on Render

The same Blueprint also creates `trackit-ai`, a Python web service from `ai service/`.

1. When prompted, set `GOOGLE_API_KEY` (and `OPENROUTER_API_KEY` for ticket routing). `SERVICE_TOKEN` is generated automatically and copied into the backend's `AI_SERVICE_TOKEN`.
2. Once deployed, open `https://<trackit-ai URL>/health` and check `"llm_configured": true`.
3. On `trackit-api`, set `AI_SERVICE_URL` to the AI service's URL (e.g. `https://trackit-ai.onrender.com`, no trailing slash).

Like the backend, it sleeps when idle; the backend waits up to 55 seconds for it, so the first AI request after a pause can be slow.

### 3. Frontend on Vercel

1. **Add New → Project**, import this repository and set **Root Directory** to `frontend` (framework preset: Vite).
2. Add the environment variable `VITE_API_URL` = your Render URL (no trailing slash).
3. Deploy. [`frontend/vercel.json`](frontend/vercel.json) rewrites all routes to `index.html` so deep links like `/incidents/123` work.
4. If the Vercel URL differs from what you set in `CORS_ALLOWED_ORIGINS`, update it on Render (it redeploys automatically).

`VITE_API_URL` is baked in at build time — redeploy the frontend after changing it.

## API overview

| Method | Path | Access |
|---|---|---|
| `POST` | `/api/auth/register` | Public — files an account request (`202`) |
| `POST` | `/api/auth/login` | Public — sets the session cookies, returns the user |
| `POST` | `/api/auth/refresh` | Refresh cookie — rotates it and issues a new access token |
| `POST` | `/api/auth/logout` | Public — revokes the session and clears cookies (`204`) |
| `GET` | `/api/auth/me` | Authenticated |
| `POST` | `/api/incidents/draft` | Employee — suggests New Incident fields from a description (AI); nothing is saved, `503` if the AI service is unavailable |
| `GET` | `/api/admin/account-requests?status=PENDING&page=0&size=20` | Admin |
| `POST` | `/api/admin/account-requests/{id}/approve` | Admin |
| `POST` | `/api/admin/account-requests/{id}/reject` | Admin |
| `GET` | `/api/admin/users?page=0&size=20` | Admin |
| `GET` | `/api/admin/users/{id}` | Admin |
| `PATCH` | `/api/admin/users/{id}/role` | Admin |
| `PATCH` | `/api/admin/users/{id}/status` | Admin |
| `POST` | `/api/incidents` | Employee |
| `GET` | `/api/incidents?page&size&status&priority&category&assignedTo` | Authenticated (scoped by role) |
| `GET` | `/api/incidents/{id}` | Authenticated (scoped by role) |
| `PUT` | `/api/incidents/{id}` | Employee (creator, while `OPEN`) |
| `DELETE` | `/api/incidents/{id}` | Admin (soft delete) |
| `GET` | `/api/team/tickets` | Lead — unresolved tickets their department handles, with the AI suggestion and how each was passed in |
| `POST` | `/api/team/tickets/{id}/recommendation` | Lead (handling department) — re-runs the AI department suggestion; `503` if the AI is unavailable |
| `GET` | `/api/team/departments` | Lead — departments a ticket can be passed to, with their Leads |
| `POST` | `/api/team/tickets/{id}/transfer` | Lead (handling department) — passes the ticket to another department (`201`) |
| `GET` | `/actuator/health` | Public |

Errors use a consistent shape: `{ timestamp, status, error, message, path, fieldErrors?, code? }`. `code` is set where the client must react: `ORIGIN_NOT_ALLOWED`, `SESSION_EXPIRED`, `CONCURRENT_REFRESH`, `AI_UNAVAILABLE`.
