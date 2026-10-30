from pydantic import BaseModel, Field


class BackupRestored(BaseModel):
    restored: dict[str, int] = Field(description="How many rows went into each table")
