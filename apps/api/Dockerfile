# syntax=docker/dockerfile:1
# The API image: FastAPI on port 8000. Applies database migrations, then serves.
# Build from the repository root: docker build -f apps/api/Dockerfile .

FROM python:3.13-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.9.3 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_FROZEN=1 UV_PYTHON_DOWNLOADS=never
WORKDIR /app
# Dependencies first, so a code change doesn't reinstall them.
COPY pyproject.toml uv.lock ./
COPY apps/api/pyproject.toml apps/api/
RUN --mount=type=cache,target=/root/.cache/uv uv sync --package maalu-api --no-dev

FROM python:3.13-slim
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
WORKDIR /app/apps/api
COPY --from=build /app/.venv /app/.venv
COPY apps/api/ ./
RUN useradd --system --uid 10001 maalu
USER maalu
EXPOSE 8000
# Needs SECRET_KEY and DATABASE_URL (postgresql+asyncpg://...).
CMD ["sh", "-c", "alembic upgrade head && exec fastapi run main.py --host 0.0.0.0 --port 8000"]
