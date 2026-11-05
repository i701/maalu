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

Want something to look at? `just seed` fills the database with a realistic first month for a demo user and prints the login: a 10,000 MVR salary, accounts at BML and MIB (current and savings), a USD account and cash, the monthly bills (rent, internet, electricity, water, insurance, phone, Netflix, iCloud, a VPS), the salary split, a month of groceries, taxis and meals, a budget, savings goals and what is still to come. Run it again for a fresh start. It only replaces the demo user's data and refuses to run against a non-local database.

Other recipes: `just fmt`, `just check`, `just test`, `just dev-api`, `just dev-web`, `just migration "message"`, `just rollback`.

## Web auth

Login goes through server functions to the API; the API's JWT is kept in an encrypted httpOnly cookie (`SESSION_SECRET`) and never reaches the browser. Tokens last 30 minutes, then the user signs in again.

## Notes

- Money is `Numeric(19, 4)` / `Decimal` end to end and serialised as strings in JSON.
- Auth: email + password (argon2id), JWT bearer access tokens. `POST /api/v1/auth/register` (includes your primary `base_currency`; by default only the first account can register, see `REGISTRATION` in `apps/api/.env.example`), `POST /api/v1/auth/login` (form fields `username`=email, `password`), `GET /api/v1/users/me`. Two-factor (authenticator app) can be turned on in Settings; with it on, `POST /api/v1/auth/login` answers with a `challenge_token` and the code goes to `POST /api/v1/auth/login/2fa`. `just disable-2fa EMAIL` turns it off for someone locked out. Sign-ins are sessions you can list and end in Settings (30 days after last use), and you can change your password there. A forgotten password is reset on the server with `just reset-password EMAIL`. Password and code guessing is rate limited (`RATE_LIMIT`, on by default; see `docker-compose.prod.yml` for the proxy setting). Set `SECRET_KEY` in `apps/api/.env` (`openssl rand -hex 32`); the Authorize button in `/docs` works.

## License

[Apache License 2.0](LICENSE)
