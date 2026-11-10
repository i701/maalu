from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.rate_limit import RateLimitedError
from app.routers import (
    account,
    api_key,
    attachment,
    auth,
    backup,
    budget,
    card,
    category,
    currency,
    email,
    goal,
    group,
    imports,
    notification,
    place,
    salary,
    stats,
    subscription,
    tag,
    template,
    transaction,
    transfer_link,
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
    app.include_router(api_key.router, prefix="/api/v1")
    app.include_router(api_key.whoami_router, prefix="/api/v1")
    # before the transactions router: its fixed paths must not be read as a transaction id
    app.include_router(transfer_link.router, prefix="/api/v1")
    app.include_router(transaction.router, prefix="/api/v1")
    app.include_router(account.router, prefix="/api/v1")
    app.include_router(stats.router, prefix="/api/v1")
    app.include_router(goal.router, prefix="/api/v1")
    app.include_router(salary.router, prefix="/api/v1")
    app.include_router(budget.router, prefix="/api/v1")
    app.include_router(category.router, prefix="/api/v1")
    app.include_router(card.router, prefix="/api/v1")
    app.include_router(email.router, prefix="/api/v1")
    app.include_router(tag.router, prefix="/api/v1")
    app.include_router(template.router, prefix="/api/v1")
    app.include_router(vendor.router, prefix="/api/v1")
    app.include_router(subscription.router, prefix="/api/v1")
    app.include_router(currency.router, prefix="/api/v1")
    app.include_router(backup.router, prefix="/api/v1")
    app.include_router(attachment.router, prefix="/api/v1")
    app.include_router(group.router, prefix="/api/v1")
    app.include_router(imports.router, prefix="/api/v1")
    app.include_router(notification.router, prefix="/api/v1")
    app.include_router(place.router, prefix="/api/v1")
    return app
