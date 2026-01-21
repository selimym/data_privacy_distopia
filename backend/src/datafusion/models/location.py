"""Location tracking records and inferred location data models."""

import enum
from datetime import time
from uuid import UUID

from sqlalchemy import Enum, ForeignKey, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from datafusion.database import Base, TimestampMixin, UUIDMixin


class LocationType(enum.Enum):
    """Types of inferred locations."""

    WORKPLACE = "workplace"
    HOME = "home"  # Should match NPC address but shows tracking confirmation
    FREQUENT_VISIT = "frequent_visit"  # Gyms, stores, etc.
    ROMANTIC_INTEREST = "romantic_interest"  # Bf/gf location
    FAMILY = "family"  # Parents, siblings
    MEDICAL_FACILITY = "medical_facility"
    PLACE_OF_WORSHIP = "place_of_worship"
    ENTERTAINMENT = "entertainment"
    OTHER = "other"


class DayOfWeek(enum.Enum):
    """Days of the week for pattern analysis."""

    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"
    WEEKDAYS = "weekdays"
    WEEKENDS = "weekends"


class LocationRecord(Base, UUIDMixin, TimestampMixin):
    """Primary location tracking record for an NPC (one-to-one)."""

    __tablename__ = "location_records"

    npc_id: Mapped[UUID] = mapped_column(
        ForeignKey("npcs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Summary information
    tracking_enabled: Mapped[bool] = mapped_column(
        nullable=False, default=True
    )  # Some people may disable location
    data_retention_days: Mapped[int] = mapped_column(
        nullable=False, default=90
    )  # How far back data goes

    # Relationships for eager loading
    inferred_locations: Mapped[list["InferredLocation"]] = relationship(
        "InferredLocation",
        back_populates="location_record",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class InferredLocation(Base, UUIDMixin, TimestampMixin):
    """Location inferred from ISP/cell tower tracking data."""

    __tablename__ = "inferred_locations"

    location_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("location_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    location_type: Mapped[LocationType] = mapped_column(Enum(LocationType), nullable=False)
    location_name: Mapped[str] = mapped_column(
        String(200), nullable=False
    )  # e.g., "TechCorp Solutions", "Sarah's Apartment"
    street_address: Mapped[str] = mapped_column(String(200), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(2), nullable=False)
    zip_code: Mapped[str] = mapped_column(String(10), nullable=False)

    # Pattern information
    typical_days: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # e.g., "Weekdays", "Monday, Wednesday, Friday"
    typical_arrival_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    typical_departure_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    visit_frequency: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # e.g., "Daily", "3-4 times per week", "Weekly"

    # Sensitive details
    inferred_relationship: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # e.g., "Likely romantic partner based on overnight stays", "Elderly parent (age 70+)"
    privacy_implications: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # What could this be used for?

    is_sensitive: Mapped[bool] = mapped_column(
        nullable=False, default=False
    )  # Medical, romantic, etc.
    confidence_score: Mapped[int] = mapped_column(nullable=False, default=80)  # 0-100

    # Relationship back to location record
    location_record: Mapped["LocationRecord"] = relationship(
        "LocationRecord",
        back_populates="inferred_locations",
    )
