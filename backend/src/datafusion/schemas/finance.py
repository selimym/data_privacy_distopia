"""Pydantic schemas for finance record API endpoints."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from datafusion.models.finance import (
    AccountType,
    DebtType,
    EmploymentStatus,
    TransactionCategory,
)


class BankAccountRead(BaseModel):
    """Schema for bank account responses."""

    id: UUID
    finance_record_id: UUID
    account_type: AccountType
    bank_name: str
    account_number_last4: str
    balance: Decimal
    opened_date: date
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DebtRead(BaseModel):
    """Schema for debt responses."""

    id: UUID
    finance_record_id: UUID
    debt_type: DebtType
    creditor_name: str
    original_amount: Decimal
    current_balance: Decimal
    monthly_payment: Decimal
    interest_rate: Decimal
    opened_date: date
    is_delinquent: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransactionRead(BaseModel):
    """Schema for transaction responses."""

    id: UUID
    finance_record_id: UUID
    transaction_date: date
    merchant_name: str
    amount: Decimal
    category: TransactionCategory
    description: str | None
    is_sensitive: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FinanceRecordRead(BaseModel):
    """Schema for complete finance record with nested data."""

    id: UUID
    npc_id: UUID
    employment_status: EmploymentStatus
    employer_name: str | None
    annual_income: Decimal
    credit_score: int
    bank_accounts: list[BankAccountRead]
    debts: list[DebtRead]
    transactions: list[TransactionRead]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FinanceRecordFiltered(BaseModel):
    """Schema for finance record with content filtering applied."""

    id: UUID
    npc_id: UUID
    employment_status: EmploymentStatus
    employer_name: str | None
    annual_income: Decimal
    credit_score: int
    bank_accounts: list[BankAccountRead]
    debts: list[DebtRead]
    transactions: list[TransactionRead]

    model_config = ConfigDict(from_attributes=True)
