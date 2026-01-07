"""Judicial records and legal case data models."""

import enum
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from datafusion.database import Base, TimestampMixin, UUIDMixin


class CaseDisposition(enum.Enum):
    """Legal case disposition/outcome."""

    GUILTY = "guilty"
    NOT_GUILTY = "not_guilty"
    DISMISSED = "dismissed"
    PENDING = "pending"
    PLEA_DEAL = "plea_deal"
    SETTLED = "settled"
    JUDGMENT_PLAINTIFF = "judgment_plaintiff"
    JUDGMENT_DEFENDANT = "judgment_defendant"


class CrimeCategory(enum.Enum):
    """Categories of criminal offenses."""

    VIOLENT = "violent"
    PROPERTY = "property"
    DRUG = "drug"
    WHITE_COLLAR = "white_collar"
    TRAFFIC = "traffic"
    DOMESTIC = "domestic"
    SEX_OFFENSE = "sex_offense"
    OTHER = "other"


class CivilCaseType(enum.Enum):
    """Types of civil cases."""

    CONTRACT_DISPUTE = "contract_dispute"
    PERSONAL_INJURY = "personal_injury"
    PROPERTY_DISPUTE = "property_dispute"
    EMPLOYMENT = "employment"
    DIVORCE = "divorce"
    CUSTODY = "custody"
    RESTRAINING_ORDER = "restraining_order"
    SMALL_CLAIMS = "small_claims"
    OTHER = "other"


class ViolationType(enum.Enum):
    """Types of traffic violations."""

    SPEEDING = "speeding"
    DUI = "dui"
    RECKLESS_DRIVING = "reckless_driving"
    RUNNING_RED_LIGHT = "running_red_light"
    ILLEGAL_PARKING = "illegal_parking"
    DRIVING_WITHOUT_LICENSE = "driving_without_license"
    HIT_AND_RUN = "hit_and_run"
    OTHER = "other"


class JudicialRecord(Base, UUIDMixin, TimestampMixin):
    """Primary judicial record for an NPC (one-to-one)."""

    __tablename__ = "judicial_records"

    npc_id: Mapped[UUID] = mapped_column(
        ForeignKey("npcs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Summary flags
    has_criminal_record: Mapped[bool] = mapped_column(nullable=False, default=False)
    has_civil_cases: Mapped[bool] = mapped_column(nullable=False, default=False)
    has_traffic_violations: Mapped[bool] = mapped_column(nullable=False, default=False)

    # Relationships for eager loading
    criminal_records: Mapped[list["CriminalRecord"]] = relationship(
        "CriminalRecord",
        back_populates="judicial_record",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    civil_cases: Mapped[list["CivilCase"]] = relationship(
        "CivilCase",
        back_populates="judicial_record",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    traffic_violations: Mapped[list["TrafficViolation"]] = relationship(
        "TrafficViolation",
        back_populates="judicial_record",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class CriminalRecord(Base, UUIDMixin, TimestampMixin):
    """Criminal case record."""

    __tablename__ = "criminal_records"

    judicial_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("judicial_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    case_number: Mapped[str] = mapped_column(String(100), nullable=False)
    crime_category: Mapped[CrimeCategory] = mapped_column(
        Enum(CrimeCategory), nullable=False
    )
    charge_description: Mapped[str] = mapped_column(String(500), nullable=False)
    arrest_date: Mapped[date] = mapped_column(Date, nullable=False)
    disposition_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    disposition: Mapped[CaseDisposition] = mapped_column(
        Enum(CaseDisposition), nullable=False
    )

    # Sentence details (if convicted)
    sentence_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    jail_time_days: Mapped[int | None] = mapped_column(nullable=True)
    probation_months: Mapped[int | None] = mapped_column(nullable=True)
    fine_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    # Sealing/expungement
    is_sealed: Mapped[bool] = mapped_column(nullable=False, default=False)
    is_expunged: Mapped[bool] = mapped_column(nullable=False, default=False)

    # Sensitivity (violent crimes, sex offenses, etc.)
    is_sensitive: Mapped[bool] = mapped_column(nullable=False, default=False)

    # Relationship back to judicial record
    judicial_record: Mapped["JudicialRecord"] = relationship(
        "JudicialRecord",
        back_populates="criminal_records",
    )


class CivilCase(Base, UUIDMixin, TimestampMixin):
    """Civil case record."""

    __tablename__ = "civil_cases"

    judicial_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("judicial_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    case_number: Mapped[str] = mapped_column(String(100), nullable=False)
    case_type: Mapped[CivilCaseType] = mapped_column(Enum(CivilCaseType), nullable=False)
    case_description: Mapped[str] = mapped_column(String(500), nullable=False)
    filed_date: Mapped[date] = mapped_column(Date, nullable=False)
    closed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    disposition: Mapped[CaseDisposition] = mapped_column(
        Enum(CaseDisposition), nullable=False
    )

    # Case details
    plaintiff_name: Mapped[str] = mapped_column(
        String(200), nullable=False
    )  # Could be the NPC or other party
    defendant_name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_plaintiff: Mapped[bool] = mapped_column(
        nullable=False
    )  # True if NPC is plaintiff

    # Financial outcome
    judgment_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )

    # Sensitivity (divorce, restraining orders, etc.)
    is_sensitive: Mapped[bool] = mapped_column(nullable=False, default=False)

    # Relationship back to judicial record
    judicial_record: Mapped["JudicialRecord"] = relationship(
        "JudicialRecord",
        back_populates="civil_cases",
    )


class TrafficViolation(Base, UUIDMixin, TimestampMixin):
    """Traffic violation record."""

    __tablename__ = "traffic_violations"

    judicial_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("judicial_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    citation_number: Mapped[str] = mapped_column(String(100), nullable=False)
    violation_type: Mapped[ViolationType] = mapped_column(
        Enum(ViolationType), nullable=False
    )
    violation_description: Mapped[str] = mapped_column(String(500), nullable=False)
    violation_date: Mapped[date] = mapped_column(Date, nullable=False)
    location: Mapped[str] = mapped_column(String(300), nullable=False)

    # Outcome
    fine_amount: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    points: Mapped[int] = mapped_column(nullable=False, default=0)  # License points
    was_contested: Mapped[bool] = mapped_column(nullable=False, default=False)
    is_paid: Mapped[bool] = mapped_column(nullable=False, default=True)

    # Serious violations (DUI, hit and run, etc.)
    is_serious: Mapped[bool] = mapped_column(nullable=False, default=False)

    # Relationship back to judicial record
    judicial_record: Mapped["JudicialRecord"] = relationship(
        "JudicialRecord",
        back_populates="traffic_violations",
    )
