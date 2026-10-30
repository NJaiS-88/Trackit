# Trackit

IT Incident Management System — a Spring Boot REST API with a React frontend.

| Folder | Stack |
|---|---|
| [`trackit/`](trackit) | Backend: Java 21, Spring Boot 3.3, Spring Security (JWT), MongoDB |
| [`frontend/`](frontend) | Frontend: React 19, Vite, React Router, Axios |

## Features

- **Authentication** — login with email and password, BCrypt-hashed passwords, stateless JWT (HS256) auth.
- **Account requests** — nobody can create an account directly. Sign-up files a request; an admin approves it (creating an `EMPLOYEE`) or rejects it. Until then, logging in explains that the request is pending or rejected.
- **Roles** — `EMPLOYEE`, `ENGINEER`, `ADMIN`. Approved requests become `EMPLOYEE`; an admin assigns other roles from the user list.
- **User management (admin)** — paginated user list, change roles, activate / deactivate accounts. The last active admin cannot be demoted or deactivated.
- **Incidents** — employees report incidents (auto-numbered `INC-YYYY-000001`), filter and page through them, and view details. Employees see their own incidents, engineers see incidents assigned to them, admins see everything.

## Prerequisites

- Java 21+
- Node.js 20.19+
- A MongoDB instance (e.g. a free MongoDB Atlas cluster)

## Running locally

### Backend

```bash
cd trackit
cp .env.example .env   # then fill in MONGO_URI and JWT_SECRET
./mvnw spring-boot:run # Windows: .\mvnw.cmd spring-boot:run
```

The API starts on <http://localhost:8081>. Swagger UI: <http://localhost:8081/swagger-ui.html>.

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGO_URI` | yes | — | MongoDB connection string |
| `JWT_SECRET` | yes | — | Base64 key, at least 256 bits (`openssl rand -base64 32`) |
| `CORS_ALLOWED_ORIGINS` | no | `http://localhost:5173` | Comma-separated frontend origins |
| `JWT_EXPIRATION` | no | `86400000` | Token lifetime in milliseconds (24h) |
| `MONGO_DATABASE` | no | `trackit` | Database name |
| `PORT` | no | `8081` | HTTP port |
| `API_DOCS_ENABLED` | no | `true` | Serve Swagger UI and `/v3/api-docs` |
| `ADMIN_EMAIL` | no | — | First admin, created at startup only if no active admin exists |
| `ADMIN_PASSWORD` | no | — | Password for that admin (at least 8 characters) |
| `ADMIN_NAME` | no | `Administrator` | Display name for that admin |

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

## Deployment

The backend runs on **Render** (Docker) and the frontend on **Vercel**. Deploy the backend first so you have its URL for the frontend.

### 1. MongoDB Atlas

Render's outbound IPs are not fixed, so in Atlas → **Network Access** allow `0.0.0.0/0`, and use a database user with a strong password.

### 2. Backend on Render

1. In Render choose **New → Blueprint** and select this repository. [`render.yaml`](render.yaml) creates the `trackit-api` web service from [`trackit/Dockerfile`](trackit/Dockerfile).
2. When prompted, set:
   - `MONGO_URI` — your Atlas connection string
   - `CORS_ALLOWED_ORIGINS` — your Vercel URL, e.g. `https://trackit.vercel.app` (you can update this after step 3)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — the first admin account (see [First admin](#first-admin))
   - `JWT_SECRET` is generated automatically.
3. Wait for the deploy; Render checks `GET /actuator/health`. Note the service URL, e.g. `https://trackit-api.onrender.com`.

On the free plan the service sleeps after inactivity; the first request afterwards takes up to a minute.

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
| `POST` | `/api/auth/login` | Public |
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
| `GET` | `/actuator/health` | Public |

Errors use a consistent shape: `{ timestamp, status, error, message, path, fieldErrors? }`.
