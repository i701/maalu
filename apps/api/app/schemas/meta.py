from typing import Literal

from pydantic import BaseModel, Field


class ServerInfo(BaseModel):
    app: Literal["maalu"] = Field(
        description="Always `maalu`, so a client can tell this is a Maalu server."
    )
    version: str = Field(description="The API's version.")
    registration_open: bool = Field(description="Whether a new account can be created right now.")
