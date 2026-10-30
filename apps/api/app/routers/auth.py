from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.dependencies import CurrentUser, UserServiceDep
from app.schemas import RegistrationStatus, Token, UserCreate, UserResponse, UserUpdate
from app.security import create_access_token
from app.services import (
    AccountNotFoundError,
    EmailAlreadyRegisteredError,
    RegistrationClosedError,
    TransactionRuleError,
)

router = APIRouter(tags=["auth"])


@router.get("/auth/registration", response_model=RegistrationStatus)
async def registration_status(users: UserServiceDep):
    """Whether sign-up is open, so the sign-in and register pages can say so. No login needed."""
    return RegistrationStatus(open=await users.registration_open())


@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, users: UserServiceDep):
    try:
        return await users.register(data)
    except RegistrationClosedError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Registration is closed") from None
    except EmailAlreadyRegisteredError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered") from None


@router.post("/auth/login", response_model=Token)
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], users: UserServiceDep):
    """OAuth2 password flow: send `username` (the email) and `password` as form fields."""
    user = await users.authenticate(form.username, form.password)
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=create_access_token(user.id))


@router.get("/users/me", response_model=UserResponse)
async def read_me(user: CurrentUser):
    return user


@router.patch("/users/me", response_model=UserResponse)
async def update_me(data: UserUpdate, user: CurrentUser, users: UserServiceDep):
    """Change your settings. Only the provided fields change."""
    try:
        return await users.update(user, data)
    except AccountNotFoundError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Account not found") from None
    except TransactionRuleError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from None
