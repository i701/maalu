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

# CI-style checks for everything
check: check-api check-web

check-api:
    uv run ruff check .
    uv run ruff format --check .

check-web:
    pnpm --filter @maalu/web fmt:check
    pnpm --filter @maalu/web lint
    pnpm --filter @maalu/web typecheck

# Lint only (no changes)
lint: lint-api lint-web

lint-api:
    uv run ruff check .

lint-web:
    pnpm --filter @maalu/web lint

test: test-api

test-api:
    cd apps/api && uv run pytest

# ── Build ───────────────────────────────────────────────

build-web:
    pnpm --filter @maalu/web build

# ── Seed data ───────────────────────────────────────────

# Fill the DB with realistic random data for the demo user (replaces only that user's data).
# Usage: just seed        just seed 600
seed transactions="250":
    cd apps/api && uv run python -m app.seed {{transactions}}

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
