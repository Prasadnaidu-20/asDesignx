from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserDesign(Base):
    """A design uploaded by a regular user, personalised with a name and number."""

    __tablename__ = "user_designs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(40))
    number: Mapped[str] = mapped_column(String(3))
    # Stored under settings.UPLOAD_DIR with a random name, never the client's filename.
    image_filename: Mapped[str] = mapped_column(String(64))
    content_type: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
