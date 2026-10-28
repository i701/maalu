from fastapi import FastAPI

from app.config import settings
from app.routers import (
    account,
    auth,
    budget,
    category,
    currency,
    goal,
    stats,
    subscription,
    template,
    transaction,
    vendor,
)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)

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
    app.include_router(template.router, prefix="/api/v1")
    app.include_router(vendor.router, prefix="/api/v1")
    app.include_router(subscription.router, prefix="/api/v1")
    app.include_router(currency.router, prefix="/api/v1")
    return app
