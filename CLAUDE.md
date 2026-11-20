# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git: stage the work, never commit it

**Never run `git commit` (or amend, cherry-pick or anything else that creates a commit), and never push.** The user makes every commit and push themselves. When a piece of work is finished (the checks pass and the parity file is current: after any change to `parity/features.json`, run `just parity` so the generated `PARITY.md` follows it, and stage both), do this instead:

1. `git add` exactly the files that belong to it (name them or the folder; never `git add -A` or `.`), so the user can look at `git diff --staged`. Do not stage `.claude/` or anything unrelated. Work that is two separate changes is staged as one change at a time, and the first is left for the user to commit before the second is staged.
2. Give the user the **commit message** to use, in the reply, in a fenced block they can copy: a `type(scope): subject` line in the style of `git log` (for example `feat(ios): ...`, `fix(api): ...`), then a short body saying what changed and why. Do not add attribution lines. When the work should be several commits, give one message per commit and say which files each covers.

A request to commit or push is not needed to do this, and it is not permission to run `git commit` or `git push`: if the user asks "commit this", stage it and give the message.

Maalu is a personal finance tracker. It is a monorepo: `apps/api` (FastAPI, async SQLAlchemy 2.0, Alembic, Python 3.13, uv workspace) and `apps/web` (TanStack Start, React 19, MUI v9, Zod, pnpm workspace `@maalu/web`), plus the native apps `apps/android` (Kotlin, Compose) and `apps/ios` (SwiftUI). The API and web are driven from the root `justfile`.

## Where the details live

This file holds the rules and the architecture. The detailed notes on each feature are in separate files, **not loaded automatically: before changing a feature, read its file, and when you change the feature, update that file in the same piece of work** (the same goes for adding a feature: give it an entry in the file whose theme fits, or a new file listed here).

- `docs/claude/api/transactions.md` — Transactions: trash, time of day, refunds, templates, bulk actions, groups, linking into a transfer, attachments, web links, locations and Places.
- `docs/claude/api/accounts.md` — Accounts and cards: archiving, default account, bank and number, credit limit, exclude from stats, balance adjustment, cards, credit card statements, the account page, account trends, exchange rates.
- `docs/claude/api/categories-tags-vendors.md` — Categories, tags and vendors: colours and parents, tags, vendor merge and defaults, the Salary category, needs and wants.
- `docs/claude/api/budget-goals.md` — Budget and goals: limits per period and for set dates, moving money between limits, savings goals.
- `docs/claude/api/auth-security.md` — Sign-in and security: registration, passwords, sessions, API keys and the outside door, sign-in alerts, rate limiting, two-factor.
- `docs/claude/api/platform.md` — Platform: balance snapshots, background jobs, backup and restore, notifications and email, the seed, settings, short numbers.
- `docs/claude/api/imports.md` — Statement import: bank CSV profiles, preview and commit, duplicates, aliases, the report.
- `docs/claude/api/subscriptions.md` — Subscriptions: installments and reminders, suggested subscriptions, planning the next payment, bills that vary, billing-date maths.
- `docs/claude/api/planning-salary.md` — Month plan and salary split: available to spend, the Month plan page, planned transfers, salary rules, pending approvals.
- `docs/claude/api/reports.md` — Reports: net worth drivers, Trends, Compare, the cash flow and money flow cards.
- `docs/claude/web-features.md` — web: the transaction form (seeds, tags, vendor defaults), row selection, passwords, sessions and two-factor screens, refunds and planned rows, budget warnings, sign-in pages, navigation, PWA, dashboard charts.
- `docs/claude/web-docs.md` — the in-app guides (Docs), screenshots and live examples, and the Android app's generated copy.
- `docs/claude/e2e.md` — the Playwright end-to-end tests: how they run, `open()`/`hydrated`, the specs.
- `docs/claude/deployment.md` — Docker images, `docker-compose.prod.yml`, `scripts/restore-drill.sh`, `scripts/backup.sh`.
- `apps/ios/CLAUDE.md` — the iOS app (loaded by Claude Code when working in `apps/ios`).
- `graphify-out/` — a knowledge graph of `apps/web`, `apps/api` and `docs/claude` (scope in `.graphifyignore`). For a question about how parts connect (what calls or depends on something, what a change reaches), ask it with `/graphify query "<question>"` before searching broadly; `GRAPH_REPORT.md` is its overview. It is a snapshot: refresh it with `/graphify . --update` after larger changes, and trust the code where they disagree.

## Web app (`apps/web`)

**After every change under `apps/web`, run `just check-web`** (oxfmt check, oxlint, and the type-aware typecheck `oxlint --type-aware --type-check`) and fix everything it reports, warnings included, before the work is done.

Whenever types from react is used for example in onSubmit handlers don't blindly use commonly known React types, for example FormEvent. Always look up the types from the react library itself or from [the React TypeScript docs](https://react.dev/reference/react).


### Avoid Naming Conflicts with Global APIs

- Before naming a function, check whether its name conflicts with commonly available global APIs, framework APIs, or built-in identifiers.
- Pay particular attention to globally exposed testing APIs such as `describe`, `it`, `test`, `expect`, and `vi` from Vitest/Jest.
- Avoid using generic names that overlap with framework or testing APIs, even when a local declaration technically shadows the global.
- Prefer descriptive, domain-specific names that communicate intent.

For example, avoid:

```ts
function describe(transaction: Transaction): string {
  // ...
}
```

Prefer:

```ts
function formatTransactionSummary(transaction: Transaction): string {
  // ...
}
```

- When introducing a new identifier, consider the project's installed dependencies, TypeScript ambient declarations, and configured global types.
- If a naming conflict is detected, rename the local identifier rather than relying on shadowing or suppressing the warning.
 




## TypeScript Type Safety & Test Fixtures

Follow these rules when writing or modifying TypeScript code, especially tests:

### 1. Never silence type errors with unsafe assertions
- Do not use `as unknown as SomeType` to force a value into a type.
- Do not use `as SomeType` to bypass missing required properties.
- Do not assert incomplete objects as complete API types, even when the test only needs a subset of their properties.
- Prefer `satisfies SomeType` for validating fixture objects while preserving their precise inferred types.
- Treat Oxlint's `no-unsafe-type-assertion` warnings as issues to fix, not warnings to suppress.

### 2. Build valid test fixtures
- When testing with API types (e.g. `Transaction`, `Account`, or nested objects), fixtures must satisfy the actual type definitions.
- Inspect the source type before constructing test data. Do not guess the required properties.
- Create reusable fixture factories for frequently used objects and nested types. The shared ones are in `apps/web/src/test/fixtures.ts` (`makeTransaction`, `accountRef`, `makeVendor`, `categoryTotal`, `makeCategory`, built with `withDefaults` from `lib/utils.ts`); add to it rather than writing a full object again in a test file.
- Use `NonNullable<T>` when a fixture factory should return the non-null variant of an optional or nullable property.
- Use TypeScript utility types (`Pick`, `Omit`) when a test or function only needs a subset of a larger object.

Example:

```ts
const account = (id: string): NonNullable<Transaction["account"]> => ({
    id,
    name: id,
    currency: "MVR",
    bank: null,
    account_number: null,
    exclude_from_stats: false,
    group: "accounts",
});

```

Prefer:

```ts
account: account("bml")

```

Instead of:

```ts
account: { id: "bml" } as Transaction["account"]

```

### 3. Avoid double assertions in test factories

* Do not use `as unknown as Transaction` to make incomplete fixtures compile.
* Build fixtures that satisfy the complete `Transaction` type.
* If constructing a complete object is too verbose, use a shared, strongly typed fixture factory with sensible defaults.
* Use `Partial<T>` for factory overrides, but ensure the final factory output is a valid `T`.
* A factory accepting `Partial<T>` must not blindly spread optional properties over required defaults if doing so can introduce `undefined` into required fields.

Example:

```ts
const makeTransaction = (
    overrides: Partial<Transaction> = {},
): Transaction => ({
    // All required Transaction properties with valid defaults.
    ...overrides,
});

```

### 4. Handle unknown data properly

* Never directly assert `unknown` as a domain type.
* For external data (API responses, JSON, user input), validate at the boundary using the project's existing validation approach or a runtime schema validator.
* Use type guards when narrowing values based on runtime checks.
* Do not introduce redundant validation when the data has already been validated by an established boundary.

### 5. Preserve type correctness in nested objects

* Do not construct partial nested objects and assert them as complete types.
* Create dedicated fixture factories for nested types such as accounts, splits, refunds, and vendors.
* Reuse these factories across tests rather than repeating unsafe assertions.

### 6. Respect generated API types & contracts

* Treat generated API types and production contracts as the source of truth.
* Do not invent, omit, or incorrectly cast fields to make fixtures compile.
* When a generated type changes, update the fixtures to reflect the actual contract rather than working around the new errors.

### 7. Type Assertions (`as`) — Use Sparingly

Treat TypeScript type assertions (`as TypeName`) as an escape hatch, not a normal way to satisfy the compiler.

* Do not use `as TypeName` simply to make code compile or silence type errors.
* Before using an assertion, determine why TypeScript cannot infer or establish the required type.
* Prefer type inference, explicit variable annotations, discriminated unions, type guards, and runtime validation.
* Never use assertions to make incomplete test fixtures appear to satisfy complete production types.
* Never use `as unknown as TypeName` to bypass type checking.
* Do not repeatedly cast the same value to different types to work around typing problems.
* When an assertion is genuinely necessary (e.g. DOM APIs, third-party library typing limitations, or a value whose type is guaranteed by an external invariant), keep it narrow and local.

Before introducing a type assertion, ask:

1. Why can't TypeScript determine this type naturally?
2. Have I actually verified that the value satisfies the asserted type?
3. Could a type guard, proper annotation, or better data structure eliminate the assertion?
4. Am I hiding a real type error?

If an assertion is necessary, add a brief explanation of the invariant that makes it safe. Do not treat every assertion as automatically wrong, but require a concrete justification for each one.

### 8. Systematic Troubleshooting & Verification

When TypeScript reports an error in a test:

1. Read the error and identify the actual type incompatibility.
2. Inspect the production function signature and the relevant source types.
3. Decide whether the fixture is incorrect, the function accepts an unnecessarily broad type, or the test is modeling an invalid scenario.
4. Fix the underlying issue using proper types, narrower inputs, or valid fixtures instead of workaround assertions.
5. Run the relevant tests and TypeScript typecheck/lint commands to verify the fix.

*Never consider a test implementation complete merely because it passes at runtime; it must also satisfy TypeScript's type system cleanly without relying on unsafe assertions.*


## Forms & Validation
- **Standard Stack**: Always use `react-hook-form` paired with `zod` (`@hookform/resolvers/zod`) for all form implementations.
- **No Raw FormData**: Avoid manual `new FormData(e.currentTarget)` parsing, repetitive `form.get()` type narrowing, and manual input state management.
- **Schema-First**: Define a strict `z.object(...)` schema for every form to handle validation, whitespace trimming (`.trim()`), and type coercion (`z.coerce.number()`), inferring TypeScript payload types via `z.infer<typeof schema>`.
- **How it is done here**: a dialog is a `FormDialog` given `onSubmit={handleSubmit(submit)}` (its `<form>` is `noValidate`: the schema's messages show, not the browser's). Text fields and selects are `FormTextField` (a MUI `TextField` bound to a field, the schema's message under it); anything else (pickers, switches, `RateField`, `LocationField`) goes in a `Controller`, and the pickers take an `error` prop. Where a dialog sends the same fields its server function checks, export the schema (or its pieces: `positiveAmount`, `exchangeRate`, `timeOfDay` in `server/transactions.ts`) from that `server/*.ts` file and use it in both; a form whose values differ from the request keeps its own schema beside it. A rule between fields is a `superRefine` issue on the field it is about. Read live values with `useWatch` (the React Compiler lint refuses `watch()`), and give `useForm` the schema's input and output types (`useForm<z.input<…>, unknown, z.output<…>>`) when a default would otherwise widen an enum to `string`.

## Material 3 Expressive UI Guidelines

This applies to both the web app (MUI, `theme.ts` and `lib/m3.ts`) and the Android app (Jetpack Compose).

When designing, implementing, or auditing UI components, combine both installed M3 Expressive skills using this division of responsibility:

1. **Architecture, Platform APIs & Audits (`material-expressive-skill`):**
   - Use this skill as the primary workflow for UI planning, state coverage (loading, empty, error, disabled), accessibility, and code reviews.
   - Follow its platform guardrails strictly so you never invent unsupported APIs for the target framework.

2. **Exact Tokens, Geometry & Motion Physics (`m3-expressive`):**
   - Consult this skill's references whenever exact numeric specifications are needed—including color roles, dynamic color schemes, `dp` measurements, corner radius scales, 35-shape morphing rules, emphasized typography, and spring damping/stiffness values.

3. **Conflict Resolution:**
   - If an exact M3 Expressive spec from `m3-expressive` is not natively supported by the current SDK version in `material-expressive-skill`, prioritize valid, compiling platform APIs and adapt the expressive tokens honestly.


## Commands

```bash
just install          # uv sync --all-packages + pnpm install
just db-up            # Postgres 17 via docker compose (maalu/maalu@localhost:5432/maalu)
just storage-up       # optional: floci (local S3) on :4566 plus the attachments bucket; needs ATTACHMENTS_S3_* in apps/api/.env
just migrate          # alembic upgrade head
just dev              # API :8000 (/docs) + background worker + web :3000 in parallel; or dev-api / dev-worker / dev-web
just seed             # a realistic first month for the demo user (local DB only; see below); prints the login. `just seed --email x@y.z` seeds that user instead and leaves the demo user alone
just reset-db         # dev only: delete ALL data but keep users, sessions and two-factor (asks first; local DB only)

just check            # just api-types, then what CI runs: ruff check + format --check; oxfmt --check, oxlint, tsc --noEmit
just fmt              # ruff format/fix + oxfmt + oxlint --fix
just docs-shots       # remake the screenshots the guides show (public/docs/*.webp), then commit them
just doctor-web       # react-doctor (CI runs it on PRs; advisory only)
just e2e [args]       # Playwright end-to-end tests against their own API (:8101), web build (:3101) and database (maalu_e2e); needs db-up and, once, e2e-install
just test             # API pytest (in parallel), then the web unit tests (just test-api / just test-web)
just api-types        # after ANY API schema change: rewrite apps/web/openapi.json and src/types/api.generated.ts, commit both

just disable-2fa EMAIL  # turn two-factor off for someone who lost their app and recovery codes
just reset-password EMAIL  # set a new password for someone who forgot theirs (asks for it, hidden)
just migration "msg"  # alembic autogenerate; review the generated file
just rollback         # downgrade -1
```

To run one test: `cd apps/api && uv run pytest tests/test_transfers.py::test_name -q`. Tests use in-memory SQLite (aiosqlite with foreign keys turned on) through `dependency_overrides[get_db]`, so they don't need Postgres. Fixtures in `tests/conftest.py`: `client`, `signup(email)` returns bearer headers, and `auth` is a ready-made user. CI runs them too (the `api-tests` job in `.github/workflows/ci.yml` runs `just test-api`, which is `pytest -n auto`, one worker per core; they need no Postgres and no network, and no `.env` since the job sets `SECRET_KEY`). Run them yourself before pushing all the same.

Env files: `apps/api/.env` (`SECRET_KEY` is required; `DATABASE_URL`) and `apps/web/.env` (`API_URL`, `SESSION_SECRET` of at least 32 chars, optionally `MAP_TILE_URL` and `MAP_ATTRIBUTION`). Copy them from the `.env.example` files.

The end-to-end tests are described in `docs/claude/e2e.md`; Docker images, deployment and the backup scripts in `docs/claude/deployment.md`.

## API architecture (`apps/api/app`)

The layers go `models` → `schemas` (Pydantic) → `services` → `routers`, connected in `dependencies.py`:
- Each service is a class built from an `AsyncSession` and injected through `*ServiceDep` aliases. Routers take `CurrentUserId` and pass `user_id` into every service call. **Every query is scoped to the user**, and a row belonging to another user returns 404, never 403.
- Services raise domain exceptions (exported from `app/services/__init__.py`, for example `VendorNameTakenError` and `TransactionRuleError`). Routers turn them into `HTTPException`s (409 or 422). Services never import FastAPI.
- `get_db` commits when the route returns, **before** the response is sent (`DbSession` is `Depends(get_db, scope="function")`). The default scope would commit after the response, so the web app's refetch after a mutation could read the old data and a failed commit would never reach the client. A test pins the scope. An explicit `commit()` inside a service (as `check_second_factor` does before it raises) is for state that must survive a failing request.
- List endpoints return plain JSON arrays. `limit` is optional (leave it out to get all rows, which dropdowns use), and the total count goes in the `X-Total-Count` header via `app/pagination.py` (`PageDep`, `set_total`). Services provide a `list_for_user` / `count_for_user` pair built on a shared `_conditions()` filter builder.
- Text search uses `icontains(..., autoescape=True)`.

Money domain rules:
- Money is `Numeric(19, 4)` and `Decimal` from end to end, serialised as **strings** in JSON. Never use float.
- A transaction's `amount` is always positive, and `type` (income/expense/transfer) sets the direction. `exchange_rate` is in base-currency units per 1 unit of `currency`, and `base_amount = amount * exchange_rate`, rounded half-even to 4dp (`services/money.py`). The rate is forced to 1 when the currency matches the user's `base_currency`; otherwise the client must supply a rate.
- For a transfer, `account` is the source and `amount` is what left it; `to_account` and `to_amount` (in the destination's currency) are what arrived.
- Categories are a table (unique per user ignoring case). Requests send the category *name* and the API finds-or-creates it, like vendors; responses carry `category` (name) and `category_id`. Transactions, split lines and subscriptions all point at it, and transfers have none. A category in use can't be deleted, only merged into another (`POST /categories/{id}/merge`).
- A transaction can be split into items (`transaction_splits`: name, quantity, category, tax-inclusive `amount`, optional `tax_amount`) that must add up exactly to its `amount`; its own category is then the biggest item's. Category reporting (`/transactions/categories`, the export's By category sheet) shares a split's `base_amount` across its items with `app/allocation.py`, so totals agree exactly. Filtering by category lists every transaction touching it but counts only the matching items' share in totals.
- FKs to vendor/subscription/account use `ON DELETE SET NULL`, so deleting them unlinks transactions and keeps them. User FKs cascade.
- **Planned transactions** (`planned`): something coming up that has not happened yet (rent due next month). `Transaction.live()` means not trashed and `Transaction.counted()` means not trashed and not planned. **Anything that sums money (balances, budgets, goals, totals, category totals, monthly stats, the balance trend, a subscription's last payment, the export) must use `counted()`, and anything that sums income or spending across accounts (totals, category totals, the budget, monthly stats) must use `Transaction.reported()`, which also drops balance adjustments and excluded accounts**, and `live()` is for anything that only needs the row (get, bulk, tags usage); `_conditions()` does it for the list, count, totals and export. The list shows posted transactions by default and `?planned=true` shows the planned ones instead, soonest first (so totals always match the list). `POST /transactions/{id}/post` (optional `{transaction_date, transaction_time, amount}`; an explicit `null` time clears the planned one) turns a planned one into a real one (409 if it is not planned); a plain `PATCH` with `planned` flips it either way. A planned transaction whose date has passed just stays planned: the web shows it as overdue, the API has no such state.
Web: the card lists each key (name, role, an Expired chip, prefix, when it ends, last used and from where, a line of permissions) with **Change** (name, a permission grid of areas by See, Change and Delete, with the role select following it: pick a role to fill the grid, edit the grid and the select becomes Custom), **Rotate** (the grace choice, then the new secret) and **Delete**; `SecretDialog` shows a secret once and only its button or Escape closes it. Not built: an account allow-list, hiding private text, a date window, write guardrails (maximum amount, daily cap, a `created_via` marker) and "needs approval" (writes landing as proposals), per-route scopes, an audit log of what a key did, and an administrator who is not the key's owner (until households there is one person per account; the owner manages their own keys).
Models use a deterministic constraint `NAMING_CONVENTION` (`models/base.py`), and enums are stored as non-native strings (`native_enum=False`, `values_callable`). Keep both conventions when you add columns, so autogenerated migrations stay clean. Ruff excludes `migrations/versions`.

## Web architecture (`apps/web/src`)

- **The browser never talks to the API.** Everything goes through TanStack server functions in `src/server/*.ts`, which call `apiRequest()` (`server/api.ts`). That function attaches the JWT from an encrypted httpOnly session cookie (`utils/session.ts`) and calls `API_URL/api/v1...`. The one exception is file download: `routes/api.export.transactions.ts` is a server route that forwards a fixed set of filters along with the token.
- `apiRequest` retries a **GET** once when the connection fails: the API closes idle kept-alive connections, and reusing one just closed fails with `ECONNRESET`, which showed as "Cannot reach the Maalu API" now and then. A write is never retried (it might have been applied).
- Server functions validate input with Zod and **return `ApiResult<T>` values** (`{ok, data, total?}` / `{ok:false, status, error}`) instead of throwing, so errors survive serialisation. FastAPI `detail` errors are flattened into readable strings.
- Route loaders call server functions and `unwrap()` the results (a 401 redirects to `/login`). Mutations go through `useAction().run(...)` (`lib/use-action.ts`). It handles pending and error state, sends a 401 to `/login`, and on success calls `router.invalidate({ sync: true })` to refetch **all** route data. Don't add per-query caches.
- Protected pages live under `routes/_protected/`. The `beforeLoad` guard there is for UX only, because server functions and the API check auth again. List state (page, pageSize, q, filters) lives in URL search params validated by Zod `validateSearch`, with `loaderDeps` passing it to the loader. See `lib/pagination.ts` (`pageSearch`, `lastPageIfOutOfRange`) and `lib/transaction-filters.ts`.
- **API types are generated, never hand-written.** The API's OpenAPI schema is the one source of truth: `just api-types` writes the committed `apps/web/openapi.json` (from `python -m app.openapi`) and `src/types/api.generated.ts` (openapi-typescript with `--enum-values`, run through `pnpm dlx` because it needs the TypeScript 5 compiler API and the app uses TS 7). `src/types/api.ts` is a thin layer of short names over it (`Transaction = components["schemas"]["TransactionResponse"]`), re-exports the generated enum arrays (`PAYMENT_METHODS = paymentMethodValues`) and holds the web's own display labels (`Record<Enum, string>`, so a new enum value is a type error until it gets a label). Never describe a response shape by hand in `api.ts`: change the Pydantic schema (field docs go in `Field(description=...)`, which reach the generated types), run `just api-types`, and add an alias if the web needs a new type. **Run `just api-types` after every API schema change and commit the two generated files with it**; `just check` runs it first. CI never regenerates, it fails if either committed file is stale (`just check-openapi`, `just check-generated-types`). Pure helpers in `src/lib` have vitest tests (`just test-web`); run `pnpm --filter @maalu/web test` rather than `pnpm exec vitest`, whose output the RTK hook swallows.
- Tables: every list goes through `components/ResponsiveTable.tsx`. In table mode both the wide table and the narrow card list draw each row as its own rounded bar (`ROW_FILL`, one tonal step above the card, so it shows in light mode too): the wide table does it with `borderSpacing`, tinted cells and the row's corners on its first and last cell, so hover and selection tint the cells (`.Mui-selected`) rather than the row. Don't add row borders or row backgrounds in a page's `renderRow`.
- **Shape morph (a universal rule):** anything that can be hovered or focused (cards, pills, chips, nav items, buttons, the search bar) rests at one corner token and springs to the next, less rounded one under the pointer or focus. Use `morph("xl")` (cards, 28px to 16px) or `morph("24px", "md")` (a pill, 24px to 12px) from `lib/shape.ts` instead of writing a radius by hand; MUI icon buttons and `Card` already do it through `theme.ts`. A pill rests at half its height, not `full` (999px), or the corners would not start moving until the spring's last frames. If the element sets its own `transition`, start it with `MORPH_TRANSITION`.
- Imports use the `#/` alias for `src/`. `routeTree.gen.ts` is generated, so don't edit it.
- New `@mui/icons-material` icons must be added to `optimizeDeps.include` in `vite.config.ts`. Without that, dev mode re-optimises mid-session and throws a duplicate-React "Invalid hook call".
- Style: oxfmt (tabs, double quotes) and oxlint. react-doctor is a gate, so recent work memoises table rows/components and splits large components (see `components/transaction-form/`). Theme colours come from CSS variables and theme tokens, not hard-coded values. The look is Material 3 Expressive, kept minimal: a soft cool-grey page (`surface`, `#f5f5f8`) with a white sidebar, white cards and white fields on it (`surface-container-low`; near-black and a step lighter in dark mode), the app icon's sky blue as primary (`#0a6e9e` where it is text or an outline, so it keeps 5.6:1 on white; the icon's pale `#dff3fb` / `#e2f3fa` as fills; `#8fd6f2` in dark mode) for links, focus and selection (selected nav items take `secondary-container`), not pushed onto everything else, every block (cards, tables, fields, section headings) starting on the header's left edge (`ResponsiveTable`'s frame has no side margin), the main contained buttons as pills in the logo's colour (`brand` / `onBrand` in `lib/m3.ts`: navy `#081d48` with white text, the logo's pale `#dff3fb` with navy text in dark mode; a variant rule in `theme.ts`), buttons are plain flat MUI (no raised keys; they went on 2026-11-20), pills that morph like the rest (`pressable` in `theme.ts`), the Delete and Move to trash ones in the theme's error colour, headline figures as pastel tiles (`StatCard`'s `tint`, `tintFill`/`tintInk` in `lib/m3.ts`), **a figure sits on the right of its card, big and bold** (label on the left, the number right-aligned at weight 600 through `--figure-weight`: `MetricCard`, `StatCard`, the dashboard's Available card and the transaction sheet's amount), the font Sora (`src/assets/Sora-Variable.woff2`, a variable font loaded by an `@font-face` in `styles/m3.css`, licence beside it, with a resized Arial fallback face so loading does not shift the page; it replaced Manrope, which replaced Inter, on 2026-11-19; Manrope is still in `assets/` and `m3.css` for going back, one line in `theme.ts`; weights need not be hundreds, running text and captions are 450 and the big headings are tracked -0.02em, `typography` in `theme.ts`, while many components still set their own `fontWeight` of 500 to 700), **large figures drawn in Sora** (`src/assets/Sora-Variable.woff2`, `@font-face` in `styles/m3.css`, `FIGURE_FONT` in `Figure.tsx`; the one place the app leaves Manrope, because Sora's round zeros and flagged 1 make big numbers read as one shape, as on the aero-slider site) through `Figure` (weight 400, or `--figure-weight` from a parent, tracking -0.03em, tabular digits, the currency at about 62% on the same baseline, in the figure's colour a step fainter; on a tinted `StatCard` the figure takes the tile's hue, `tintText`, so income reads green and spending red; split off by `splitCurrency` in `lib/format.ts`; `<Money figure />` for an amount, `<Figure>{text}</Figure>` for a formatted string; tables and rows keep the plain `Money`), and every page opening with a plain header on the grey (`PageHeader`: a small tinted icon tile, the title, a line of description, the action on the right, quiet `HeaderPill`s), no gradient banners (they went on 2026-11-12). Colour roles in `lib/m3.ts`, springs, the `--shape-*` corner scale in `styles/m3.css`, wired up in `theme.ts`. Ripples are MUI's own, on everywhere, and there is no custom focus ring: keyboard focus is the pulsing ripple (nav items opt in with `focusRipple` and also take their hover tint), links keep the browser's outline. Colour a nav ripple through `.MuiTouchRipple-root .MuiTouchRipple-child` (anything less specific loses to MUI's own rule). Text fields are outlined (`MuiTextField` default variant in `theme.ts`, 4px corners, hairline border, 2px primary ring on focus); the search boxes (`SearchField`) are the same outlined field with a floating label (the text callers pass as `placeholder`), a search icon on the right that becomes a clear button once there is text (they were a filled pill with a shadow until 2026-11-10; the `MuiFilledInput` theme override went with it). Use the shape variables, not pixel radii; use `var(--md-sys-color-*)` or `color-mix` for anything that must follow light/dark (not `theme.palette`, which is always the light scheme). Icons that animate use `components/Symbol`, whose bundled font is a subset, so check a new icon name renders.
