"""Financial records and transaction data models."""

import enum
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from datafusion.database import Base, TimestampMixin, UUIDMixin


class EmploymentStatus(enum.Enum):
    """Employment status categories."""

    EMPLOYED_FULL_TIME = "employed_full_time"
    EMPLOYED_PART_TIME = "employed_part_time"
    SELF_EMPLOYED = "self_employed"
    UNEMPLOYED = "unemployed"
    RETIRED = "retired"
    STUDENT = "student"


class AccountType(enum.Enum):
    """Bank account types."""

    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"
    INVESTMENT = "investment"


class DebtType(enum.Enum):
    """Types of debt."""

    MORTGAGE = "mortgage"
    AUTO_LOAN = "auto_loan"
    STUDENT_LOAN = "student_loan"
    CREDIT_CARD = "credit_card"
    PERSONAL_LOAN = "personal_loan"
    MEDICAL_DEBT = "medical_debt"


class TransactionCategory(enum.Enum):
    """Transaction categories for spending patterns."""

    GROCERIES = "groceries"
    DINING = "dining"
    HEALTHCARE = "healthcare"
    PHARMACY = "pharmacy"
    ENTERTAINMENT = "entertainment"
    TRAVEL = "travel"
    UTILITIES = "utilities"
    RENT = "rent"
    INSURANCE = "insurance"
    GAMBLING = "gambling"
    ALCOHOL = "alcohol"
    OTHER = "other"


class FinanceRecord(Base, UUIDMixin, TimestampMixin):
    """Primary financial record for an NPC (one-to-one)."""

    __tablename__ = "finance_records"

    npc_id: Mapped[UUID] = mapped_column(
        ForeignKey("npcs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Employment and income
    employment_status: Mapped[EmploymentStatus] = mapped_column(
        Enum(EmploymentStatus), nullable=False
    )
    employer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    annual_income: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )  # e.g., 75000.00

    # Credit information
    credit_score: Mapped[int] = mapped_column(nullable=False)  # 300-850

    # Relationships for eager loading
    bank_accounts: Mapped[list["BankAccount"]] = relationship(
        "BankAccount",
        back_populates="finance_record",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    debts: Mapped[list["Debt"]] = relationship(
        "Debt",
        back_populates="finance_record",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction",
        back_populates="finance_record",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class BankAccount(Base, UUIDMixin, TimestampMixin):
    """Bank account associated with a financial record."""

    __tablename__ = "bank_accounts"

    finance_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("finance_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    account_type: Mapped[AccountType] = mapped_column(Enum(AccountType), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)
    account_number_last4: Mapped[str] = mapped_column(
        String(4), nullable=False
    )  # Last 4 digits
    balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    opened_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Relationship back to finance record
    finance_record: Mapped["FinanceRecord"] = relationship(
        "FinanceRecord",
        back_populates="bank_accounts",
    )


class Debt(Base, UUIDMixin, TimestampMixin):
    """Debt record associated with a financial record."""

    __tablename__ = "debts"

    finance_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("finance_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    debt_type: Mapped[DebtType] = mapped_column(Enum(DebtType), nullable=False)
    creditor_name: Mapped[str] = mapped_column(String(200), nullable=False)
    original_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    current_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    monthly_payment: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    interest_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False
    )  # e.g., 5.25%
    opened_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_delinquent: Mapped[bool] = mapped_column(nullable=False, default=False)

    # Relationship back to finance record
    finance_record: Mapped["FinanceRecord"] = relationship(
        "FinanceRecord",
        back_populates="debts",
    )


class Transaction(Base, UUIDMixin, TimestampMixin):
    """Financial transaction record."""

    __tablename__ = "transactions"

    finance_record_id: Mapped[UUID] = mapped_column(
        ForeignKey("finance_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    merchant_name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    category: Mapped[TransactionCategory] = mapped_column(
        Enum(TransactionCategory), nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_sensitive: Mapped[bool] = mapped_column(
        nullable=False, default=False
    )  # e.g., pharmacy, healthcare

    # Relationship back to finance record
    finance_record: Mapped["FinanceRecord"] = relationship(
        "FinanceRecord",
        back_populates="transactions",
    )
