"""NPC (Non-Player Character) model representing people in the game world."""

import enum
from datetime import date

from sqlalchemy import Boolean, Date, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from datafusion.database import Base, TimestampMixin, UUIDMixin


class Role(enum.Enum):
    """NPC role in the game world."""

    CITIZEN = "citizen"
    ROGUE_EMPLOYEE = "rogue_employee"
    HACKER = "hacker"
    GOVERNMENT_OFFICIAL = "government_official"
    DATA_ANALYST = "data_analyst"


class NPC(Base, UUIDMixin, TimestampMixin):
    """NPC with identity and demographic information."""

    __tablename__ = "npcs"

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    ssn: Mapped[str] = mapped_column(String(11), nullable=False, unique=True)

    street_address: Mapped[str] = mapped_column(String(200), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(2), nullable=False)
    zip_code: Mapped[str] = mapped_column(String(10), nullable=False)

    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False, default=Role.CITIZEN)
    sprite_key: Mapped[str] = mapped_column(String(50), nullable=False)

    map_x: Mapped[int] = mapped_column(Integer, nullable=False)
    map_y: Mapped[int] = mapped_column(Integer, nullable=False)

    is_scenario_npc: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    scenario_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
