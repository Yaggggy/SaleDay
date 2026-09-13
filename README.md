# SaleDay — The operating system for your yard sale

A multi-tenant app for running yard/garage/estate sales:
create a sale, add inventory (one at a time or in bulk), print QR labels,
stick them on physical items, and let shoppers scan straight to a public
item page while staff manage everything — including inviting family/team
members by email — from the same app.

**Stack:** React + TypeScript + Vite + Tailwind(frontend) · FastAPI + SQLAlchemy + Alembic + MySQL (backend) · Docker Compose.

## Quick start (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API + docs: http://localhost:8000/docs
- MySQL: localhost:3306 (user/pass: `saleday` / `saleday`)

The backend container automatically waits for MySQL and runs Alembic
migrations on startup — no manual DB setup needed.

Open http://localhost:5173, click **Create your family's account**, then
create a sale and start adding items.

## Local development (without Docker)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # point DATABASE_URL at a local MySQL instance
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
The Vite dev server proxies `/api` to `http://backend:8000` by default —
set `VITE_API_PROXY_TARGET=http://localhost:8000` in `frontend/.env` when
running the backend outside Docker.

## Architecture highlights

- **Multi-tenant isolation**: every protected request resolves
  `User → OrganizationMember → Sale → Item` server-side before any data is
  returned; client-supplied IDs are never trusted for authorization.
- **Public vs. private data**: the QR/shopper endpoint (`/api/v1/public/items/{token}`)
  uses a dedicated Pydantic response model that can never leak internal
  fields (minimum price, notes, who sold it, etc.), even by accident.
- **Race-safe transactions**: marking an item sold uses `SELECT ... FOR UPDATE`
  row locking inside a single DB transaction, so two sellers racing to sell
  the same item can't both succeed — the loser gets a friendly "already sold"
  conflict.
- **Auth**: Argon2id password hashing, short-lived JWT access tokens in
  httpOnly cookies, rotating refresh tokens, `logout-all` session revocation.
- **Role-based access**: OWNER > ADMIN > SELLER > VIEWER, enforced by FastAPI
  dependencies on every mutating route — never inferred from the frontend.
- **Audit trail**: an append-only `activity_logs` table records who changed
  what, with before/after values, surfaced in the Activity tab and dashboard.
- **QR codes are stable**: labels encode an opaque token, never the price —
  changing a price or description never requires reprinting a label.

## Project layout

```
backend/
  app/
    api/routes/          # FastAPI routers (auth, sales, items, public, team, ...)
    api/dependencies/    # auth + tenant-isolation dependencies
    core/                # config, db session, security (hashing/JWT), logging
    models/               # SQLAlchemy models
    schemas/              # Pydantic request/response models (public vs staff)
    services/             # business logic (transactions, item state, activity,
                           #   email sending, bulk import)
    utils/                # QR generation, file storage
  alembic/                # migrations
frontend/
  src/
    features/             # one folder per product area (auth, sales, inventory,
                           #   scanner, team, ...)
    components/           # shared layout + UI primitives
    services/, api/        # typed API client
    hooks/                 # auth context, role helpers
docker-compose.yml
```

---

## What's new in this update

Three things were added/fixed on top of the existing app, without touching
any other feature: **bulk item import**, a **scanner camera bug fix**, and a
**complete, working email-based team invitation flow**.
