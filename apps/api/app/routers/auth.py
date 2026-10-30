from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from app import rate_limit, two_factor
from app.dependencies import CurrentUser, UserServiceDep
from app.schemas import (
    RecoveryCodes,
    RegistrationStatus,
    Token,
    TwoFactorChallenge,
    TwoFactorCode,
    TwoFactorConfirm,
    TwoFactorSetup,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.security import create_access_token, create_challenge_token, decode_challenge_token
from app.services import (
    AccountNotFoundError,
    EmailAlreadyRegisteredError,
    InvalidPasswordError,
    InvalidTwoFactorCodeError,
    RegistrationClosedError,
    TransactionRuleError,
    TwoFactorLockedError,
    TwoFactorStateError,
)

router = APIRouter(tags=["auth"])


def client_ip(request: Request) -> str:
    """The visitor's address. The web server passes it on in `X-Forwarded-For`, which uvicorn trusts
    only from `FORWARDED_ALLOW_IPS`, so `request.client` is already the real address."""
    return request.client.host if request.client else "unknown"


WRONG_CODE = "That code is not right"
LOCKED = "Too many wrong codes. Wait a few minutes and try again"


def _confirm_error(exc: Exception) -> Exception:
    """The answer to a failed password-and-code check. Never a 401: the web app takes that to mean
    the session ended."""
    match exc:
        case InvalidPasswordError():
            return HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT, "That password is not right"
            )
        case InvalidTwoFactorCodeError():
            return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, WRONG_CODE)
        case TwoFactorLockedError():
            return HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, LOCKED)
        case TwoFactorStateError():
            return HTTPException(status.HTTP_409_CONFLICT, str(exc))
        case _:
            raise exc


@router.get("/auth/registration", response_model=RegistrationStatus)
async def registration_status(users: UserServiceDep):
    """Whether sign-up is open, so the sign-in and register pages can say so. No login needed."""
    return RegistrationStatus(open=await users.registration_open())


@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, users: UserServiceDep, request: Request):
    rate_limit.check_register(client_ip(request))
    try:
        return await users.register(data)
    except RegistrationClosedError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Registration is closed") from None
    except EmailAlreadyRegisteredError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered") from None


@router.post("/auth/login", response_model=Token)
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()], users: UserServiceDep, request: Request
):
    """OAuth2 password flow: send `username` (the email) and `password` as form fields. Ten wrong
    passwords for one email, or thirty from one address, in fifteen minutes answer 429."""
    ip = client_ip(request)
    rate_limit.check_login(form.username, ip)
    user = await users.authenticate(form.username, form.password)
    if user is None:
        rate_limit.login_failed(form.username, ip)
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    rate_limit.login_succeeded(form.username)
    if user.two_factor_enabled:
        # The password was right: no token yet, only proof of that, to send with a code.
        return Token(two_factor_required=True, challenge_token=create_challenge_token(user.id))
    return Token(access_token=create_access_token(user.id))


@router.post("/auth/login/2fa", response_model=Token)
async def login_two_factor(data: TwoFactorChallenge, users: UserServiceDep, request: Request):
    """The second step of signing in: the challenge from `/auth/login` and a code from the
    authenticator app (or an unused recovery code)."""
    ip = client_ip(request)
    rate_limit.check_two_factor(ip)
    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in again")
    user_id = decode_challenge_token(data.challenge_token)
    user = await users.get(user_id) if user_id else None
    if user is None or not user.is_active or not user.two_factor_enabled:
        raise invalid
    try:
        await users.check_second_factor(user, data.code)
    except TwoFactorLockedError:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, LOCKED) from None
    except InvalidTwoFactorCodeError:
        rate_limit.two_factor_failed(ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, WRONG_CODE) from None
    return Token(access_token=create_access_token(user.id))


@router.post("/auth/2fa/setup", response_model=TwoFactorSetup)
async def two_factor_setup(user: CurrentUser, users: UserServiceDep):
    """Start setting up an authenticator app: a secret and its QR code (the same ones if setup was
    already started and not finished). Nothing changes for sign-in until `/auth/2fa/enable` has seen
    a right code."""
    try:
        secret, uri = await users.two_factor_setup(user)
    except TwoFactorStateError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from None
    return TwoFactorSetup(secret=secret, otpauth_uri=uri, qr_data_uri=two_factor.qr_data_uri(uri))


@router.post("/auth/2fa/enable", response_model=RecoveryCodes)
async def two_factor_enable(data: TwoFactorCode, user: CurrentUser, users: UserServiceDep):
    """Turn two-factor on with a code from the app. The recovery codes in the answer are shown
    once."""
    try:
        return RecoveryCodes(recovery_codes=await users.two_factor_enable(user, data.code))
    except TwoFactorStateError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from None
    except InvalidTwoFactorCodeError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, WRONG_CODE) from None


@router.post("/auth/2fa/disable", status_code=status.HTTP_204_NO_CONTENT)
async def two_factor_disable(data: TwoFactorConfirm, user: CurrentUser, users: UserServiceDep):
    """Turn two-factor off. Needs your password and a code (or a recovery code)."""
    try:
        await users.two_factor_disable(user, data.password, data.code)
    except Exception as exc:
        raise _confirm_error(exc) from None


@router.post("/auth/2fa/recovery-codes", response_model=RecoveryCodes)
async def new_recovery_codes(data: TwoFactorConfirm, user: CurrentUser, users: UserServiceDep):
    """Make a new set of recovery codes (the old ones stop working), shown once. Needs your
    password and a code."""
    try:
        return RecoveryCodes(
            recovery_codes=await users.new_recovery_codes(user, data.password, data.code)
        )
    except Exception as exc:
        raise _confirm_error(exc) from None


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
