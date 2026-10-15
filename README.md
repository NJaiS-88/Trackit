# Trackit

IT Incident Management System — a Spring Boot REST API with a React frontend.

| Folder | Stack |
|---|---|
| [`trackit/`](trackit) | Backend: Java 21, Spring Boot 3.3, Spring Security (JWT), MongoDB |
| [`frontend/`](frontend) | Frontend: React 19, Vite, React Router, Axios |

## Features

- **Authentication** — register / login with email and password, BCrypt-hashed passwords, stateless JWT (HS256) auth.
- **Roles** — `EMPLOYEE`, `ENGINEER`, `ADMIN`. Self-registration always creates an `EMPLOYEE`.
- **User management (admin)** — paginated user list, change roles, activate / deactivate accounts. The last active admin cannot be demoted or deactivated.

## Prerequisites

- Java 21+
- Node.js 20+
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
| `JWT_EXPIRATION` | no | `86400000` | Token lifetime in milliseconds (24h) |
| `MONGO_DATABASE` | no | `trackit` | Database name |
| `PORT` | no | `8081` | HTTP port |

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The backend only allows CORS from this origin.
To point the frontend at a different API URL, copy `.env.example` to `.env` and set `VITE_API_URL`.

### First admin

New accounts are always `EMPLOYEE`. To bootstrap an admin, register a user, then set its `role` to `"ADMIN"` in the `users` collection and sign in again.

## API overview

| Method | Path | Access |
|---|---|---|
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/admin/users?page=0&size=20` | Admin |
| `GET` | `/api/admin/users/{id}` | Admin |
| `PATCH` | `/api/admin/users/{id}/role` | Admin |
| `PATCH` | `/api/admin/users/{id}/status` | Admin |

Errors use a consistent shape: `{ timestamp, status, error, message, path, fieldErrors? }`.
