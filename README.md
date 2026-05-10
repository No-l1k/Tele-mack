# Tele-makc

Production-oriented ecommerce project built with Next.js and FastAPI.

## Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, Alembic
- Database: SQLite for local development, PostgreSQL for production
- Package manager: npm

## Local Development

1. Install frontend dependencies:

```powershell
npm install
```

2. Create frontend environment:

```powershell
Copy-Item .env.example .env.local
```

3. Create and install backend environment:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
cd ..
```

4. Choose data-source mode:

`NEXT_PUBLIC_DATA_SOURCE` supports:
- `mock` - frontend uses only local mock data (backend optional)
- `api` - frontend uses backend API only (no silent mock fallback)
- `api-with-mock-fallback` - dev mode with API first and mock fallback (default for local dev)

5. Run both apps:

```powershell
npm run dev:all
```

Frontend runs on http://localhost:3000. Backend runs on http://localhost:8000.

## Quality Gates

Run these before shipping changes:

```powershell
npm run lint
npm run typecheck
npm run build
```

## Backend Checks

```powershell
cd backend
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Health check: http://localhost:8000/health

Readiness check: http://localhost:8000/health/ready

API docs: http://localhost:8000/docs

Run backend tests:

```powershell
cd backend
.venv\Scripts\python -m pytest
```

Seed demo catalog for API mode (only on empty DB):

```powershell
cd backend
.venv\Scripts\python scripts\seed_demo_data.py
```

## Production Notes

- Do not commit real `.env` files or secrets.
- `docker-compose.server.yml` expects secrets from the runtime environment.
- Use `.env.server.example` as a starting point for server deploy variables:
  - `cp .env.server.example .env.server`
  - `docker compose --env-file .env.server -f docker-compose.server.yml up -d --build`
- Production must use PostgreSQL and Alembic migrations, not automatic table creation.
- Rotate any credentials that were previously committed.
- For production backend config set: `ENVIRONMENT=production`, `DB_AUTO_CREATE=false`, `ALLOW_DEV_AUTH_CODES=false`, `ALLOW_ADMIN_BOOTSTRAP=false`, `EXPOSE_DOCS=false`.
- Set strict `CORS_ORIGINS` and `TRUSTED_HOSTS` for real domains only.
- Mount persistent storage for backend uploads (`/app/uploads`) to avoid image loss on container recreation.
- Set `NEXT_IMAGE_HOSTS` with comma-separated production image/CDN hostnames used by storefront.
- Use `deploy/nginx/tele-makc.conf` as a reverse-proxy template for `/`, `/api`, and `/uploads` with TLS.

## Release Checklist

Before go-live:

```powershell
npm run lint
npm run typecheck
npm run build
cd backend
.venv\Scripts\python -m pytest
```

Operational checks:
- Run DB migrations: `alembic upgrade head`.
- Verify `/health` and `/health/ready`.
- Verify checkout flow: product -> cart -> checkout -> order page.
- Verify admin flow: orders status update, payment mark, product CSV export.
- Verify catalog admin flow: create root/subcategory, upload category image, create product, upload/reorder product images, verify public pages (`/`, `/catalog`, `/catalog/[category]`, `/search`, `/product/[id]`).
- Verify security posture: `/docs` disabled, allowed hosts configured, CORS allows only storefront domains.
