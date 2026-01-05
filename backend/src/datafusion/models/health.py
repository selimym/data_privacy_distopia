"""Health records and medical data models."""

import enum
from datetime import date
from uuid import UUID

from sqlalchemy import Boolean, Date, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from datafusion.database import Base, TimestampMixin, UUIDMixin


class Severity(enum.Enum):
    """Medical condition severity level."""

    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"


class HealthRecord(Base, UUIDMixin, TimestampMixin):
    """Primary health record for an NPC (one-to-one)."""

    __tablename__ = "health_records"

    npc_id: Mapped[UUID] = mapped_column(
        ForeignKey("npcs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    insurance_provider: Mapped[str] = mapped_column(String(200), nullable=False)
    primary_care_physician: Mapped[str] = mapped_column(String(200), nullable=False)


class HealthCondition(Base, UUIDMixin, TimestampMixin):
    """Medical condition associated with a health record."""

    __tablename__ = "health_conditions"

    health_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("health_records.id", ondelete="CASCADE"),
        nullable=False,
    )

    condition_name: Mapped[str] = mapped_column(String(200), nullable=False)
    diagnosed_date: Mapped[date] = mapped_column(Date, nullable=False)
    severity: Mapped[Severity] = mapped_column(Enum(Severity), nullable=False)
    is_chronic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_sensitive: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class HealthMedication(Base, UUIDMixin, TimestampMixin):
    """Medication prescribed to a patient."""

    __tablename__ = "health_medications"

    health_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("health_records.id", ondelete="CASCADE"),
        nullable=False,
    )

    medication_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)
    prescribed_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_sensitive: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class HealthVisit(Base, UUIDMixin, TimestampMixin):
    """Medical visit record."""

    __tablename__ = "health_visits"

    health_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("health_records.id", ondelete="CASCADE"),
        nullable=False,
    )

    visit_date: Mapped[date] = mapped_column(Date, nullable=False)
    provider_name: Mapped[str] = mapped_column(String(200), nullable=False)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_sensitive: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
