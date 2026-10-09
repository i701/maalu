# Maalu (މާލު)

Open-source personal finance tracker. *Maalee thanavas kan* — financial prosperity.

## Layout

```
apps/
  api/          FastAPI + SQLAlchemy 2.0 (async) + Alembic
  web/          TanStack Start + Material UI v9, oxlint/oxfmt
```

Layers in `apps/api/app`: `models` (SQLAlchemy) → `schemas` (Pydantic) → `services` (business logic) → `routers` (HTTP).

## Getting started

Requires [uv](https://docs.astral.sh/uv/), [just](https://just.systems) and Docker.

```bash
just install   # uv sync
just db-up     # Postgres via docker compose
just migrate   # alembic upgrade head
cp apps/web/.env.example apps/web/.env   # set SESSION_SECRET (openssl rand -hex 32)
just dev       # API :8000 (/docs) + web :3000
```

Other recipes: `just fmt`, `just check`, `just test`, `just dev-api`, `just dev-web`, `just migration "message"`, `just rollback`.

## Web auth

Login goes through server functions to the API; the API's JWT is kept in an encrypted httpOnly cookie (`SESSION_SECRET`) and never reaches the browser. Tokens last 30 minutes, then the user signs in again.

## Notes

- Money is `Numeric(19, 4)` / `Decimal` end to end and serialised as strings in JSON.
- Auth: email + password (argon2id), JWT bearer access tokens. `POST /api/v1/auth/register` (includes your primary `base_currency`), `POST /api/v1/auth/login` (form fields `username`=email, `password`), `GET /api/v1/users/me`. Set `SECRET_KEY` in `apps/api/.env` (`openssl rand -hex 32`); the Authorize button in `/docs` works.
