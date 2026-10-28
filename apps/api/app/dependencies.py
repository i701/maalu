import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.security import decode_access_token
from app.services import (
    AccountService,
    BudgetService,
    CategoryService,
    SubscriptionService,
    TransactionService,
    UserService,
    VendorService,
)

DbSession = Annotated[AsyncSession, Depends(get_db)]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_user_service(db: DbSession) -> UserService:
    return UserService(db)


def get_transaction_service(db: DbSession) -> TransactionService:
    return TransactionService(db)


def get_vendor_service(db: DbSession) -> VendorService:
    return VendorService(db)


def get_budget_service(db: DbSession) -> BudgetService:
    return BudgetService(db)


def get_category_service(db: DbSession) -> CategoryService:
    return CategoryService(db)


def get_account_service(db: DbSession) -> AccountService:
    return AccountService(db)


def get_subscription_service(db: DbSession) -> SubscriptionService:
    return SubscriptionService(db)


UserServiceDep = Annotated[UserService, Depends(get_user_service)]
TransactionServiceDep = Annotated[TransactionService, Depends(get_transaction_service)]
VendorServiceDep = Annotated[VendorService, Depends(get_vendor_service)]
BudgetServiceDep = Annotated[BudgetService, Depends(get_budget_service)]
CategoryServiceDep = Annotated[CategoryService, Depends(get_category_service)]
AccountServiceDep = Annotated[AccountService, Depends(get_account_service)]
SubscriptionServiceDep = Annotated[SubscriptionService, Depends(get_subscription_service)]


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)], users: UserServiceDep
) -> User:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = decode_access_token(token)
    if user_id is None:
        raise unauthorized
    user = await users.get(user_id)
    if user is None or not user.is_active:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_user_id(user: CurrentUser) -> uuid.UUID:
    return user.id


CurrentUserId = Annotated[uuid.UUID, Depends(get_current_user_id)]
