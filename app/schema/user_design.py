from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, field_validator


class UserDesignRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    number: str
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def assume_utc(cls, value: datetime) -> datetime:
        # SQLite drops tzinfo on read; we always store UTC, so re-attach it.
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
