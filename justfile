default:
    @just --list

# ── Setup ───────────────────────────────────────────────

# Install Python and Node dependencies
install:
    uv sync --all-packages
    pnpm install

# Start local Postgres
db-up:
    docker compose up -d --wait db

db-down:
    docker compose down

# ── Run ─────────────────────────────────────────────────

# Run API and web together
[parallel]
dev: dev-api dev-web

# API with autoreload (http://localhost:8000/docs)
dev-api:
    cd apps/api && uv run fastapi dev main.py

# Web app (http://localhost:3000)
dev-web:
    pnpm --filter @maalu/web dev

# ── Quality ─────────────────────────────────────────────

# Format everything (ruff + oxfmt) and autofix lint
fmt: fmt-api fmt-web

fmt-api:
    uv run ruff format .
    uv run ruff check --fix .

fmt-web:
    pnpm --filter @maalu/web fmt
    pnpm --filter @maalu/web lint:fix

# Regenerate the web app's API types: the API's OpenAPI schema, then TypeScript types from it
# (needs network the first time, to fetch the generator). Run after changing an API schema.
api-types:
    uv run --directory apps/api python -m app.openapi ../web/openapi.json
    pnpm --filter @maalu/web gen:api

# CI-style checks for everything. Regenerates the API types first, so tsc checks the web against
# the API as it is now; commit the regenerated files with the API change (CI fails if they are stale).
check: api-types check-api check-web

check-api:
    uv run ruff check .
    uv run ruff format --check .

# The committed OpenAPI schema must match the API (CI, API job)
check-openapi:
    uv run --directory apps/api python -m app.openapi ../web/openapi.json
    git diff --exit-code apps/web/openapi.json

# The generated TypeScript types must match the committed schema (CI, web job)
check-generated-types:
    pnpm --filter @maalu/web gen:api
    git diff --exit-code apps/web/src/types/api.generated.ts

check-web:
    pnpm --filter @maalu/web fmt:check
    pnpm --filter @maalu/web lint
    pnpm --filter @maalu/web typecheck

# React health check (react-doctor); fails on errors, warnings are advisory
doctor-web:
    pnpm --filter @maalu/web run react-doctor

# Lint only (no changes)
lint: lint-api lint-web

lint-api:
    uv run ruff check .

lint-web:
    pnpm --filter @maalu/web lint

test: test-api test-web

test-api:
    cd apps/api && uv run pytest

# Unit tests for the web app's pure helpers (money maths, charts, budget); no browser, no API
test-web:
    pnpm --filter @maalu/web test

# ── Build ───────────────────────────────────────────────

build-web:
    pnpm --filter @maalu/web build

# ── Seed data ───────────────────────────────────────────

# Fill the DB with realistic random data for the demo user (replaces only that user's data).
# Usage: just seed        just seed 600
seed transactions="250":
    cd apps/api && uv run python -m app.seed {{transactions}}

# ── Accounts ────────────────────────────────────────────

# Turn two-factor off for someone who lost their app and recovery codes (works on the database).
# In Docker: docker compose -f docker-compose.prod.yml exec api python -m app.admin disable-2fa EMAIL
disable-2fa email:
    cd apps/api && uv run python -m app.admin disable-2fa {{email}}

# ── Database migrations ─────────────────────────────────

# Create a new migration: just migration "add accounts"
migration message:
    cd apps/api && uv run alembic revision --autogenerate -m "{{message}}"

# Apply migrations
migrate:
    cd apps/api && uv run alembic upgrade head

# Roll back one migration
rollback:
    cd apps/api && uv run alembic downgrade -1
