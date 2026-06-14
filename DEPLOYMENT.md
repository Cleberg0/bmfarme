# BM Farm God Mode Deployment

## Stack

- `backend/`: Node.js + Express + Prisma
- `frontend/`: Vite + React SPA served by Nginx
- `postgres`: PostgreSQL 16

## Files

- `docker-compose.yml`: orchestrates PostgreSQL, backend, and frontend
- `deploy.env.example`: deployment environment template
- `backend/Dockerfile`: production image for the API with Prisma migrations on startup
- `frontend/Dockerfile`: multi-stage build for the SPA
- `frontend/nginx/default.conf`: SPA routing and health endpoint

## Deploy with Docker Compose

1. Copy the environment template:

   - Windows PowerShell: `Copy-Item deploy.env.example .env`
   - CMD: `copy deploy.env.example .env`

2. Fill in all secrets and external API credentials in `.env`.

3. Start the stack:

   - `docker compose up -d --build`

4. Check status:

   - `docker compose ps`
   - `docker compose logs backend --tail 100`
   - `docker compose logs frontend --tail 100`

## Exposed services

- Frontend: `http://localhost`
- Backend API: `http://localhost:3000`
- Backend health: `http://localhost:3000/health`
- PostgreSQL: `localhost:5432`

## Notes

- The frontend build injects `VITE_API_URL` at build time.
- The backend container runs `prisma migrate deploy` before starting the API.
- `DATABASE_URL` is assembled in Compose to point the backend at the internal `postgres` service.
- For production behind a public domain, set `CORS_ORIGIN` and `VITE_API_URL` to the final frontend and API URLs before building.