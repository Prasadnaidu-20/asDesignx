from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Customization(Base):
    """A customer's shirt design for one product: mockups, print files and the editable JSON."""

    __tablename__ = "customizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    # {"front": {"mockup_url": ..., "print_url": ...}, "back": {...}} — only designed views.
    views: Mapped[dict] = mapped_column(JSON)
    design_url: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
