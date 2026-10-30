import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, UserSession
from app.services import (
    AccountService,
    BackupService,
    BudgetService,
    CategoryService,
    GoalService,
    SessionService,
    StatsService,
    SubscriptionService,
    TagService,
    TemplateService,
    TransactionService,
    UserService,
    VendorService,
)

# scope="function": the session commits (or rolls back) as soon as the route returns, **before** the
# response is sent. Without it FastAPI runs the code after `yield` once the response has gone, so a
# client that refetches the moment it hears back (the web app does, after every mutation) can read
# the old data, and a failed commit would never reach the client at all.
DbSession = Annotated[AsyncSession, Depends(get_db, scope="function")]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_user_service(db: DbSession) -> UserService:
    return UserService(db)


def get_session_service(db: DbSession) -> SessionService:
    return SessionService(db)


def get_transaction_service(db: DbSession) -> TransactionService:
    return TransactionService(db)


def get_vendor_service(db: DbSession) -> VendorService:
    return VendorService(db)


def get_budget_service(db: DbSession) -> BudgetService:
    return BudgetService(db)


def get_stats_service(db: DbSession) -> StatsService:
    return StatsService(db)


def get_goal_service(db: DbSession) -> GoalService:
    return GoalService(db)


def get_category_service(db: DbSession) -> CategoryService:
    return CategoryService(db)


def get_account_service(db: DbSession) -> AccountService:
    return AccountService(db)


def get_subscription_service(db: DbSession) -> SubscriptionService:
    return SubscriptionService(db)


def get_tag_service(db: DbSession) -> TagService:
    return TagService(db)


def get_backup_service(db: DbSession) -> BackupService:
    return BackupService(db)


def get_template_service(db: DbSession) -> TemplateService:
    return TemplateService(db)


UserServiceDep = Annotated[UserService, Depends(get_user_service)]
SessionServiceDep = Annotated[SessionService, Depends(get_session_service)]
TransactionServiceDep = Annotated[TransactionService, Depends(get_transaction_service)]
VendorServiceDep = Annotated[VendorService, Depends(get_vendor_service)]
BudgetServiceDep = Annotated[BudgetService, Depends(get_budget_service)]
StatsServiceDep = Annotated[StatsService, Depends(get_stats_service)]
GoalServiceDep = Annotated[GoalService, Depends(get_goal_service)]
CategoryServiceDep = Annotated[CategoryService, Depends(get_category_service)]
AccountServiceDep = Annotated[AccountService, Depends(get_account_service)]
SubscriptionServiceDep = Annotated[SubscriptionService, Depends(get_subscription_service)]
TagServiceDep = Annotated[TagService, Depends(get_tag_service)]
TemplateServiceDep = Annotated[TemplateService, Depends(get_template_service)]
BackupServiceDep = Annotated[BackupService, Depends(get_backup_service)]


async def get_signed_in(
    token: Annotated[str, Depends(oauth2_scheme)], sessions: SessionServiceDep
) -> tuple[UserSession, User]:
    signed_in = await sessions.authenticate(token)
    if signed_in is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return signed_in


async def get_current_user(
    signed_in: Annotated[tuple[UserSession, User], Depends(get_signed_in)],
) -> User:
    return signed_in[1]


async def get_current_session(
    signed_in: Annotated[tuple[UserSession, User], Depends(get_signed_in)],
) -> UserSession:
    return signed_in[0]


CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentSession = Annotated[UserSession, Depends(get_current_session)]


async def get_current_user_id(user: CurrentUser) -> uuid.UUID:
    return user.id


CurrentUserId = Annotated[uuid.UUID, Depends(get_current_user_id)]
