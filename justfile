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

# Start the local S3-compatible store (floci) and create the attachments bucket in it. Needs
# ATTACHMENTS_S3_* set in apps/api/.env (see .env.example); without them attachments use a folder.
storage-up:
    docker compose up -d storage
    sleep 3
    cd apps/api && uv run python -m app.admin create-bucket

# ── Run ─────────────────────────────────────────────────

# Run API, background worker and web together
[parallel]
dev: dev-api dev-worker dev-web

# API with autoreload (http://localhost:8000/docs)
dev-api:
    cd apps/api && uv run fastapi dev main.py

# Background job worker (daily clean-up and the like); needs the database up and migrated
dev-worker:
    cd apps/api && PYTHONPATH=. uv run procrastinate --app=app.jobs.app worker

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

# iOS: make apps/ios/Maalu.xcodeproj from project.yml (needs `brew install xcodegen`; the project file is not committed)
ios-project:
    cd apps/ios && xcodegen generate

# iOS: build and run the unit tests on a simulator
test-ios: ios-project
    cd apps/ios && xcodebuild test -project Maalu.xcodeproj -scheme Maalu -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath build -quiet

# The guides as JSON for the Android app (apps/android/app/src/main/assets/docs.json), made from apps/web/src/lib/docs.
# Run after changing a guide and commit the file (CI fails if it is stale).
docs-json:
    pnpm --filter @maalu/web gen:docs

# PARITY.md (what each platform has) from parity/features.json. Edit the JSON, run this, commit both.
parity:
    node scripts/parity.mjs write

# The feature manifest is valid, every web page and API endpoint is claimed by a feature, and PARITY.md is current.
check-parity:
    node scripts/parity.mjs check

# CI-style checks for everything. Regenerates the API types first, so tsc checks the web against
# the API as it is now; commit the regenerated files with the API change (CI fails if they are stale).
check: api-types check-api check-web check-parity

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

# The Android app's bundled guides must match the web guides (CI, web job)
check-docs-json:
    pnpm --filter @maalu/web exec vitest run src/lib/docs/export.test.ts

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

# The API tests, in parallel (one worker per core; each test has its own in-memory database).
# For one test run pytest directly: cd apps/api && uv run pytest tests/test_x.py::test_name -q
test-api:
    cd apps/api && uv run pytest -n auto

# Unit tests for the web app's pure helpers (money maths, charts, budget); no browser, no API
test-web:
    pnpm --filter @maalu/web test

# End-to-end tests: a real browser (Playwright) against a real API and a production build of the
# web app, on their own ports (8101, 3101) and their own database (maalu_e2e), so `just dev` and its
# data are untouched. Needs `just db-up` and, once, `just e2e-install`. Pass Playwright options after
# the recipe, for example `just e2e --headed` or `just e2e e2e/auth.spec.ts`. It runs at the lowest
# CPU priority so the machine stays usable, with half the cores as workers, at most 4 (`E2E_WORKERS=6 just e2e` or
# `E2E_WORKERS=50% just e2e` to pick; CI uses 2).
e2e *args:
    docker compose exec -T db sh -c "psql -U maalu -d postgres -tc \"SELECT 1 FROM pg_database WHERE datname='maalu_e2e'\" | grep -q 1 || createdb -U maalu maalu_e2e"
    nice -n 19 pnpm --filter @maalu/web e2e {{args}}

# Remake the screenshots in the guides (apps/web/public/docs/*.webp) from a seeded account, in the same
# e2e environment. Run it when a screen a guide shows has changed, then commit the images.
docs-shots:
    docker compose exec -T db sh -c "psql -U maalu -d postgres -tc \"SELECT 1 FROM pg_database WHERE datname='maalu_e2e'\" | grep -q 1 || createdb -U maalu maalu_e2e"
    DOCS_SHOTS=1 nice -n 19 pnpm --filter @maalu/web e2e

# Download the browser the end-to-end tests drive (once, about 150 MB)
e2e-install:
    pnpm --filter @maalu/web exec playwright install chromium

# ── Build ───────────────────────────────────────────────

build-web:
    pnpm --filter @maalu/web build

# ── Seed data ───────────────────────────────────────────

# Fill the DB with a realistic first month for the demo user (replaces only that user's data).
# Usage: just seed        just seed --seed 7        just seed --email sample@maalu.dev
# (the last one seeds a separate user and leaves the demo user's data alone)
seed *args:
    cd apps/api && uv run python -m app.seed {{args}}

# ── Accounts ────────────────────────────────────────────

# Turn two-factor off for someone who lost their app and recovery codes (works on the database).
# In Docker: docker compose -f docker-compose.prod.yml exec api python -m app.admin disable-2fa EMAIL
disable-2fa email:
    cd apps/api && uv run python -m app.admin disable-2fa {{email}}

# Send a test email with the API's SMTP settings (apps/api/.env), to check Brevo or any provider works.
# In Docker: docker compose -f docker-compose.prod.yml exec api python -m app.admin test-email TO
test-email to:
    cd apps/api && uv run python -m app.admin test-email {{to}}

# Set a new password for someone who forgot theirs (asks for it, hidden; signs them out everywhere).
# In Docker: docker compose -f docker-compose.prod.yml exec -it api python -m app.admin reset-password EMAIL
reset-password email:
    cd apps/api && uv run python -m app.admin reset-password {{email}}

# ── Database migrations ─────────────────────────────────

# Create a new migration: just migration "add accounts"
migration message:
    cd apps/api && uv run alembic revision --autogenerate -m "{{message}}"

# Apply migrations
migrate:
    cd apps/api && uv run alembic upgrade head

# Accounts, transactions, categories, budgets, imports and the rest go; you stay signed in and start
# from empty. It migrates first, asks before deleting, and refuses a database that is not on this
# machine. Attachment files in storage are not touched (the daily sweep removes the orphans).
# `just seed` fills the demo user afterwards if you want sample data.
# Development only: delete all data (not users, sessions or two-factor) from the local database
[confirm("This deletes ALL data in the local Maalu database (users and sessions are kept). Continue?")]
reset-db:
    cd apps/api && uv run alembic upgrade head
    cd apps/api && uv run python -m app.admin reset-data

# Roll back one migration
rollback:
    cd apps/api && uv run alembic downgrade -1
