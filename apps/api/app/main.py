from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.rate_limit import RateLimitedError
from app.routers import (
    account,
    auth,
    backup,
    budget,
    category,
    currency,
    goal,
    stats,
    subscription,
    tag,
    template,
    transaction,
    vendor,
)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    @app.exception_handler(RateLimitedError)
    async def rate_limited(_: Request, exc: RateLimitedError) -> JSONResponse:
        return JSONResponse(
            {"detail": exc.message},
            status_code=429,
            headers={"Retry-After": str(exc.retry_after)},
        )

    @app.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(transaction.router, prefix="/api/v1")
    app.include_router(account.router, prefix="/api/v1")
    app.include_router(stats.router, prefix="/api/v1")
    app.include_router(goal.router, prefix="/api/v1")
    app.include_router(budget.router, prefix="/api/v1")
    app.include_router(category.router, prefix="/api/v1")
    app.include_router(tag.router, prefix="/api/v1")
    app.include_router(template.router, prefix="/api/v1")
    app.include_router(vendor.router, prefix="/api/v1")
    app.include_router(subscription.router, prefix="/api/v1")
    app.include_router(currency.router, prefix="/api/v1")
    app.include_router(backup.router, prefix="/api/v1")
    return app
