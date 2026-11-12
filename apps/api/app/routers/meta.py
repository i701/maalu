from importlib.metadata import PackageNotFoundError, version

from fastapi import APIRouter

from app.dependencies import UserServiceDep
from app.schemas.meta import ServerInfo

router = APIRouter(tags=["meta"])

try:
    API_VERSION = version("maalu-api")
except PackageNotFoundError:  # not installed as a package (some dev setups)
    API_VERSION = "0.0.0"


@router.get("/server", response_model=ServerInfo)
async def server_info(users: UserServiceDep):
    """That this is a Maalu server, its version and whether sign-up is open. No login needed."""
    open_now = await users.registration_open()
    return ServerInfo(app="maalu", version=API_VERSION, registration_open=open_now)
