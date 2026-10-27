# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git: never commit without an explicit go-ahead

**Never run `git commit` (or amend, cherry-pick or anything else that creates a commit) unless the user has clearly said to commit, in that same request.** Finishing a task, passing checks, a clean working tree or an earlier "commit" does **not** count as permission. Each commit needs a fresh, explicit go-ahead; one approval does not carry over to later work. Do the work, leave the changes uncommitted, say what changed, and wait to be told to commit. Pushing is a separate step that also needs an explicit request.

When you are told to commit, split unrelated work into separate commits.

Maalu is a personal finance tracker. It is a monorepo: `apps/api` (FastAPI, async SQLAlchemy 2.0, Alembic, Python 3.13, uv workspace) and `apps/web` (TanStack Start, React 19, MUI v9, Zod, pnpm workspace `@maalu/web`). Both are driven from the root `justfile`.

## Commands

```bash
just install          # uv sync --all-packages + pnpm install
just db-up            # Postgres 17 via docker compose (maalu/maalu@localhost:5432/maalu)
just migrate          # alembic upgrade head
just dev              # API :8000 (/docs) + web :3000 in parallel; or dev-api / dev-web
just seed [N]         # random demo data for the demo user (local DB only); prints the login

just check            # what CI runs: ruff check + format --check; oxfmt --check, oxlint, tsc --noEmit
just fmt              # ruff format/fix + oxfmt + oxlint --fix
just doctor-web       # react-doctor (CI runs it on PRs; advisory only)
just test             # API pytest (there are no web tests)

just migration "msg"  # alembic autogenerate; review the generated file
just rollback         # downgrade -1
```

To run one test: `cd apps/api && uv run pytest tests/test_transfers.py::test_name -q`. Tests use in-memory SQLite (aiosqlite with foreign keys turned on) through `dependency_overrides[get_db]`, so they don't need Postgres. Fixtures in `tests/conftest.py`: `client`, `signup(email)` returns bearer headers, and `auth` is a ready-made user. CI does not run pytest, so run it yourself.

Env files: `apps/api/.env` (`SECRET_KEY` is required; `DATABASE_URL`) and `apps/web/.env` (`API_URL`, `SESSION_SECRET` of at least 32 chars). Copy them from the `.env.example` files.

## API architecture (`apps/api/app`)

The layers go `models` → `schemas` (Pydantic) → `services` → `routers`, connected in `dependencies.py`:
- Each service is a class built from an `AsyncSession` and injected through `*ServiceDep` aliases. Routers take `CurrentUserId` and pass `user_id` into every service call. **Every query is scoped to the user**, and a row belonging to another user returns 404, never 403.
- Services raise domain exceptions (exported from `app/services/__init__.py`, for example `VendorNameTakenError` and `TransactionRuleError`). Routers turn them into `HTTPException`s (409 or 422). Services never import FastAPI.
- `get_db` commits at the end of each request.
- List endpoints return plain JSON arrays. `limit` is optional (leave it out to get all rows, which dropdowns use), and the total count goes in the `X-Total-Count` header via `app/pagination.py` (`PageDep`, `set_total`). Services provide a `list_for_user` / `count_for_user` pair built on a shared `_conditions()` filter builder.
- Text search uses `icontains(..., autoescape=True)`.

Money domain rules:
- Money is `Numeric(19, 4)` and `Decimal` from end to end, serialised as **strings** in JSON. Never use float.
- A transaction's `amount` is always positive, and `type` (income/expense/transfer) sets the direction. `exchange_rate` is in base-currency units per 1 unit of `currency`, and `base_amount = amount * exchange_rate`, rounded half-even to 4dp (`services/money.py`). The rate is forced to 1 when the currency matches the user's `base_currency`; otherwise the client must supply a rate.
- For a transfer, `account` is the source and `amount` is what left it; `to_account` and `to_amount` (in the destination's currency) are what arrived.
- Categories are a table (unique per user ignoring case). Requests send the category *name* and the API finds-or-creates it, like vendors; responses carry `category` (name) and `category_id`. Transactions, split lines and subscriptions all point at it, and transfers have none. A category in use can't be deleted, only merged into another (`POST /categories/{id}/merge`).
- A transaction can be split into items (`transaction_splits`: name, quantity, category, tax-inclusive `amount`, optional `tax_amount`) that must add up exactly to its `amount`; its own category is then the biggest item's. Category reporting (`/transactions/categories`, the export's By category sheet) shares a split's `base_amount` across its items with `app/allocation.py`, so totals agree exactly. Filtering by category lists every transaction touching it but counts only the matching items' share in totals.
- FKs to vendor/subscription/account use `ON DELETE SET NULL`, so deleting them unlinks transactions and keeps them. User FKs cascade.
- `schedule.py` is pure subscription billing-date maths. Month and year steps clamp to month length but keep the anchor day.
- The currency list is fetched from Frankfurter and cached; only the codes are used, never the rates.

Models use a deterministic constraint `NAMING_CONVENTION` (`models/base.py`), and enums are stored as non-native strings (`native_enum=False`, `values_callable`). Keep both conventions when you add columns, so autogenerated migrations stay clean. Ruff excludes `migrations/versions`.

## Web architecture (`apps/web/src`)

- **The browser never talks to the API.** Everything goes through TanStack server functions in `src/server/*.ts`, which call `apiRequest()` (`server/api.ts`). That function attaches the JWT from an encrypted httpOnly session cookie (`utils/session.ts`) and calls `API_URL/api/v1...`. The one exception is file download: `routes/api.export.transactions.ts` is a server route that forwards a fixed set of filters along with the token.
- Server functions validate input with Zod and **return `ApiResult<T>` values** (`{ok, data, total?}` / `{ok:false, status, error}`) instead of throwing, so errors survive serialisation. FastAPI `detail` errors are flattened into readable strings.
- Route loaders call server functions and `unwrap()` the results (a 401 redirects to `/login`). Mutations go through `useAction().run(...)` (`lib/use-action.ts`). It handles pending and error state, sends a 401 to `/login`, and on success calls `router.invalidate({ sync: true })` to refetch **all** route data. Don't add per-query caches.
- Protected pages live under `routes/_protected/`. The `beforeLoad` guard there is for UX only, because server functions and the API check auth again. List state (page, pageSize, q, filters) lives in URL search params validated by Zod `validateSearch`, with `loaderDeps` passing it to the loader. See `lib/pagination.ts` (`pageSearch`, `lastPageIfOutOfRange`) and `lib/transaction-filters.ts`.
- `src/types/api.ts` holds hand-written mirrors of the API schemas and enums (const arrays plus label maps). Update it whenever an API schema changes.
- Imports use the `#/` alias for `src/`. `routeTree.gen.ts` is generated, so don't edit it.
- New `@mui/icons-material` icons must be added to `optimizeDeps.include` in `vite.config.ts`. Without that, dev mode re-optimises mid-session and throws a duplicate-React "Invalid hook call".
- Style: oxfmt (tabs, double quotes) and oxlint. react-doctor is a gate, so recent work memoises table rows/components and splits large components (see `components/transaction-form/`). Theme colours come from CSS variables and theme tokens, not hard-coded values. The look is Material 3 Expressive (MUI default blue primary): colour roles in `lib/m3.ts`, springs, the `--shape-*` corner scale in `styles/m3.css`, wired up in `theme.ts`. Use the shape variables, not pixel radii; use `var(--md-sys-color-*)` or `color-mix` for anything that must follow light/dark (not `theme.palette`, which is always the light scheme). Icons that animate use `components/Symbol`, whose bundled font is a subset, so check a new icon name renders.
