"""Financial record data generator for NPCs."""

import random
from decimal import Decimal
from uuid import UUID

from faker import Faker

from datafusion.models.finance import (
    AccountType,
    DebtType,
    EmploymentStatus,
    TransactionCategory,
)
from datafusion.services.content_loader import load_json

# Load reference data
_FINANCE_REF = load_json("reference/finance.json")
EMPLOYERS = _FINANCE_REF["employers"]
BANKS = _FINANCE_REF["banks"]
CREDITORS = _FINANCE_REF["creditors"]

# Transaction merchants by category - convert lowercase keys to enum keys
_merchants_data = _FINANCE_REF["merchants"]
MERCHANTS = {
    TransactionCategory.GROCERIES: _merchants_data["groceries"],
    TransactionCategory.DINING: _merchants_data["dining"],
    TransactionCategory.HEALTHCARE: _merchants_data["healthcare"],
    TransactionCategory.PHARMACY: _merchants_data["pharmacy"],
    TransactionCategory.ENTERTAINMENT: _merchants_data["entertainment"],
    TransactionCategory.TRAVEL: _merchants_data["travel"],
    TransactionCategory.UTILITIES: _merchants_data["utilities"],
    TransactionCategory.RENT: _merchants_data["rent"],
    TransactionCategory.INSURANCE: _merchants_data["insurance"],
    TransactionCategory.GAMBLING: _merchants_data["gambling"],
    TransactionCategory.ALCOHOL: _merchants_data["alcohol"],
    TransactionCategory.OTHER: _merchants_data["other"],
}


def generate_finance_record(npc_id: UUID, seed: int | None = None) -> dict:
    """Generate a financial record with accounts, debts, and transactions."""
    fake = Faker()
    if seed is not None:
        Faker.seed(seed)
        random.seed(seed)

    # Determine employment status
    employment_status = random.choices(
        [
            EmploymentStatus.EMPLOYED_FULL_TIME,
            EmploymentStatus.EMPLOYED_PART_TIME,
            EmploymentStatus.SELF_EMPLOYED,
            EmploymentStatus.UNEMPLOYED,
            EmploymentStatus.RETIRED,
            EmploymentStatus.STUDENT,
        ],
        weights=[60, 10, 10, 5, 10, 5],
    )[0]

    # Generate income based on employment status
    if employment_status == EmploymentStatus.EMPLOYED_FULL_TIME:
        annual_income = Decimal(random.randint(35000, 150000))
        employer_name = random.choice(EMPLOYERS)
    elif employment_status == EmploymentStatus.EMPLOYED_PART_TIME:
        annual_income = Decimal(random.randint(12000, 35000))
        employer_name = random.choice(EMPLOYERS)
    elif employment_status == EmploymentStatus.SELF_EMPLOYED:
        annual_income = Decimal(random.randint(25000, 200000))
        employer_name = "Self-Employed"
    elif employment_status == EmploymentStatus.RETIRED:
        annual_income = Decimal(random.randint(20000, 80000))
        employer_name = None
    elif employment_status == EmploymentStatus.STUDENT:
        annual_income = Decimal(random.randint(5000, 25000))
        employer_name = None
    else:  # UNEMPLOYED
        annual_income = Decimal(random.randint(0, 15000))
        employer_name = None

    # Generate credit score (300-850)
    # Higher income generally correlates with better credit
    if annual_income > 100000:
        credit_score = random.randint(700, 850)
    elif annual_income > 50000:
        credit_score = random.randint(650, 780)
    elif annual_income > 25000:
        credit_score = random.randint(580, 720)
    else:
        credit_score = random.randint(500, 680)

    record = {
        "npc_id": npc_id,
        "employment_status": employment_status,
        "employer_name": employer_name,
        "annual_income": annual_income,
        "credit_score": credit_score,
        "bank_accounts": [],
        "debts": [],
        "transactions": [],
    }

    # Generate bank accounts (most people have 1-3)
    num_accounts = random.randint(1, 3)
    for _ in range(num_accounts):
        account_type = random.choice(
            [
                AccountType.CHECKING,
                AccountType.SAVINGS,
                AccountType.CREDIT_CARD,
                AccountType.INVESTMENT,
            ]
        )

        # Balance varies by account type
        if account_type == AccountType.CHECKING:
            balance = Decimal(random.uniform(100, 5000))
        elif account_type == AccountType.SAVINGS:
            balance = Decimal(random.uniform(500, 50000))
        elif account_type == AccountType.CREDIT_CARD:
            balance = Decimal(-random.uniform(0, 5000))  # Negative means owed balance
        else:  # INVESTMENT
            balance = Decimal(random.uniform(5000, 200000))

        record["bank_accounts"].append(
            {
                "account_type": account_type,
                "bank_name": random.choice(BANKS),
                "account_number_last4": f"{random.randint(1000, 9999)}",
                "balance": balance,
                "opened_date": fake.date_between(start_date="-15y", end_date="-1m"),
            }
        )

    # Generate debts (50% chance of having debt)
    if random.random() < 0.50:
        num_debts = random.randint(1, 3)
        for _ in range(num_debts):
            debt_type = random.choice(list(DebtType))

            # Debt amounts vary by type
            if debt_type == DebtType.MORTGAGE:
                original_amount = Decimal(random.randint(150000, 500000))
                current_balance = original_amount * Decimal(random.uniform(0.5, 0.95))
                monthly_payment = Decimal(random.randint(1000, 3500))
                interest_rate = Decimal(random.uniform(3.0, 6.5))
            elif debt_type == DebtType.AUTO_LOAN:
                original_amount = Decimal(random.randint(15000, 50000))
                current_balance = original_amount * Decimal(random.uniform(0.3, 0.85))
                monthly_payment = Decimal(random.randint(250, 700))
                interest_rate = Decimal(random.uniform(4.0, 9.0))
            elif debt_type == DebtType.STUDENT_LOAN:
                original_amount = Decimal(random.randint(20000, 120000))
                current_balance = original_amount * Decimal(random.uniform(0.4, 0.90))
                monthly_payment = Decimal(random.randint(200, 1000))
                interest_rate = Decimal(random.uniform(3.5, 7.5))
            elif debt_type == DebtType.CREDIT_CARD:
                original_amount = Decimal(random.randint(2000, 15000))
                current_balance = original_amount * Decimal(random.uniform(0.1, 1.0))
                monthly_payment = Decimal(random.randint(50, 300))
                interest_rate = Decimal(random.uniform(15.0, 25.0))
            elif debt_type == DebtType.MEDICAL_DEBT:
                original_amount = Decimal(random.randint(5000, 50000))
                current_balance = original_amount * Decimal(random.uniform(0.2, 0.95))
                monthly_payment = Decimal(random.randint(100, 500))
                interest_rate = Decimal(random.uniform(0.0, 8.0))
            else:  # PERSONAL_LOAN
                original_amount = Decimal(random.randint(5000, 30000))
                current_balance = original_amount * Decimal(random.uniform(0.3, 0.85))
                monthly_payment = Decimal(random.randint(150, 500))
                interest_rate = Decimal(random.uniform(6.0, 15.0))

            # 10% chance of delinquency
            is_delinquent = random.random() < 0.10

            record["debts"].append(
                {
                    "debt_type": debt_type,
                    "creditor_name": random.choice(CREDITORS),
                    "original_amount": original_amount,
                    "current_balance": current_balance,
                    "monthly_payment": monthly_payment,
                    "interest_rate": interest_rate,
                    "opened_date": fake.date_between(start_date="-10y", end_date="-6m"),
                    "is_delinquent": is_delinquent,
                }
            )

    # Generate transactions (last 90 days)
    num_transactions = random.randint(20, 80)
    for _ in range(num_transactions):
        # Weight towards more common categories
        category = random.choices(
            list(TransactionCategory),
            weights=[20, 15, 3, 5, 8, 3, 10, 12, 5, 2, 3, 10],
        )[0]

        merchant_name = random.choice(MERCHANTS[category])

        # Amount varies by category
        if category in [TransactionCategory.GROCERIES, TransactionCategory.DINING]:
            amount = Decimal(random.uniform(10, 150))
        elif category in [
            TransactionCategory.HEALTHCARE,
            TransactionCategory.PHARMACY,
        ]:
            amount = Decimal(random.uniform(20, 500))
        elif category == TransactionCategory.ENTERTAINMENT:
            amount = Decimal(random.uniform(15, 200))
        elif category == TransactionCategory.TRAVEL:
            amount = Decimal(random.uniform(50, 1500))
        elif category in [TransactionCategory.UTILITIES, TransactionCategory.INSURANCE]:
            amount = Decimal(random.uniform(50, 300))
        elif category == TransactionCategory.RENT:
            amount = Decimal(random.uniform(800, 3000))
        elif category == TransactionCategory.GAMBLING:
            amount = Decimal(random.uniform(20, 500))
        elif category == TransactionCategory.ALCOHOL:
            amount = Decimal(random.uniform(15, 100))
        else:
            amount = Decimal(random.uniform(10, 200))

        # Sensitive categories
        is_sensitive = category in [
            TransactionCategory.HEALTHCARE,
            TransactionCategory.PHARMACY,
            TransactionCategory.GAMBLING,
        ]

        transaction_date = fake.date_between(start_date="-90d", end_date="today")

        record["transactions"].append(
            {
                "transaction_date": transaction_date,
                "merchant_name": merchant_name,
                "amount": amount,
                "category": category,
                "description": None,
                "is_sensitive": is_sensitive,
            }
        )

    # Sort transactions by date
    record["transactions"].sort(key=lambda t: t["transaction_date"])

    return record
