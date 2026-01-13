"""Judicial record data generator for NPCs."""

import random
from decimal import Decimal
from uuid import UUID

from faker import Faker

from datafusion.models.judicial import (
    CaseDisposition,
    CivilCaseType,
    CrimeCategory,
    ViolationType,
)
from datafusion.services.content_loader import load_json

# Load reference data
_JUDICIAL_REF = load_json("reference/judicial.json")

# Convert string keys to enum keys for criminal charges
CRIMINAL_CHARGES = {
    CrimeCategory.VIOLENT: _JUDICIAL_REF["criminal_charges"]["VIOLENT"],
    CrimeCategory.PROPERTY: _JUDICIAL_REF["criminal_charges"]["PROPERTY"],
    CrimeCategory.DRUG: _JUDICIAL_REF["criminal_charges"]["DRUG"],
    CrimeCategory.WHITE_COLLAR: _JUDICIAL_REF["criminal_charges"]["WHITE_COLLAR"],
    CrimeCategory.TRAFFIC: _JUDICIAL_REF["criminal_charges"]["TRAFFIC"],
    CrimeCategory.DOMESTIC: _JUDICIAL_REF["criminal_charges"]["DOMESTIC"],
    CrimeCategory.SEX_OFFENSE: _JUDICIAL_REF["criminal_charges"]["SEX_OFFENSE"],
    CrimeCategory.OTHER: _JUDICIAL_REF["criminal_charges"]["OTHER"],
}

# Convert string keys to enum keys for civil case descriptions
CIVIL_CASE_DESCRIPTIONS = {
    CivilCaseType.CONTRACT_DISPUTE: _JUDICIAL_REF["civil_case_descriptions"]["CONTRACT_DISPUTE"],
    CivilCaseType.PERSONAL_INJURY: _JUDICIAL_REF["civil_case_descriptions"]["PERSONAL_INJURY"],
    CivilCaseType.PROPERTY_DISPUTE: _JUDICIAL_REF["civil_case_descriptions"]["PROPERTY_DISPUTE"],
    CivilCaseType.EMPLOYMENT: _JUDICIAL_REF["civil_case_descriptions"]["EMPLOYMENT"],
    CivilCaseType.DIVORCE: _JUDICIAL_REF["civil_case_descriptions"]["DIVORCE"],
    CivilCaseType.CUSTODY: _JUDICIAL_REF["civil_case_descriptions"]["CUSTODY"],
    CivilCaseType.RESTRAINING_ORDER: _JUDICIAL_REF["civil_case_descriptions"]["RESTRAINING_ORDER"],
    CivilCaseType.SMALL_CLAIMS: _JUDICIAL_REF["civil_case_descriptions"]["SMALL_CLAIMS"],
    CivilCaseType.OTHER: _JUDICIAL_REF["civil_case_descriptions"]["OTHER"],
}

# Convert string keys to enum keys for traffic violation descriptions
TRAFFIC_VIOLATION_DESCRIPTIONS = {
    ViolationType.SPEEDING: _JUDICIAL_REF["traffic_violation_descriptions"]["SPEEDING"],
    ViolationType.DUI: _JUDICIAL_REF["traffic_violation_descriptions"]["DUI"],
    ViolationType.RECKLESS_DRIVING: _JUDICIAL_REF["traffic_violation_descriptions"]["RECKLESS_DRIVING"],
    ViolationType.RUNNING_RED_LIGHT: _JUDICIAL_REF["traffic_violation_descriptions"]["RUNNING_RED_LIGHT"],
    ViolationType.ILLEGAL_PARKING: _JUDICIAL_REF["traffic_violation_descriptions"]["ILLEGAL_PARKING"],
    ViolationType.DRIVING_WITHOUT_LICENSE: _JUDICIAL_REF["traffic_violation_descriptions"]["DRIVING_WITHOUT_LICENSE"],
    ViolationType.HIT_AND_RUN: _JUDICIAL_REF["traffic_violation_descriptions"]["HIT_AND_RUN"],
    ViolationType.OTHER: _JUDICIAL_REF["traffic_violation_descriptions"]["OTHER"],
}


def generate_judicial_record(npc_id: UUID, seed: int | None = None) -> dict:
    """Generate a judicial record with criminal records, civil cases, and traffic violations."""
    fake = Faker()
    if seed is not None:
        Faker.seed(seed)
        random.seed(seed)

    record = {
        "npc_id": npc_id,
        "has_criminal_record": False,
        "has_civil_cases": False,
        "has_traffic_violations": False,
        "criminal_records": [],
        "civil_cases": [],
        "traffic_violations": [],
    }

    # Criminal records (10% chance)
    if random.random() < 0.10:
        record["has_criminal_record"] = True
        num_records = random.randint(1, 2)

        for _ in range(num_records):
            crime_category = random.choice(list(CrimeCategory))
            charge_description = random.choice(CRIMINAL_CHARGES[crime_category])

            # Sensitive categories
            is_sensitive = crime_category in [
                CrimeCategory.VIOLENT,
                CrimeCategory.DOMESTIC,
                CrimeCategory.SEX_OFFENSE,
            ]

            arrest_date = fake.date_between(start_date="-15y", end_date="-1y")
            disposition_date = fake.date_between(
                start_date=arrest_date, end_date="today"
            )

            # Most common dispositions
            disposition = random.choices(
                [
                    CaseDisposition.GUILTY,
                    CaseDisposition.PLEA_DEAL,
                    CaseDisposition.DISMISSED,
                    CaseDisposition.NOT_GUILTY,
                ],
                weights=[40, 30, 20, 10],
            )[0]

            # Sentence details (if convicted)
            sentence_description = None
            jail_time_days = None
            probation_months = None
            fine_amount = None

            if disposition in [CaseDisposition.GUILTY, CaseDisposition.PLEA_DEAL]:
                if crime_category in [
                    CrimeCategory.VIOLENT,
                    CrimeCategory.DRUG,
                    CrimeCategory.SEX_OFFENSE,
                ]:
                    jail_time_days = random.randint(30, 730)
                    probation_months = random.randint(12, 60)
                    fine_amount = Decimal(random.randint(500, 5000))
                    sentence_description = (
                        f"{jail_time_days} days jail, {probation_months} months probation"
                    )
                else:
                    probation_months = random.randint(6, 36)
                    fine_amount = Decimal(random.randint(100, 2000))
                    sentence_description = (
                        f"Probation {probation_months} months, fine ${fine_amount}"
                    )

            # Sealing/expungement (20% chance for old, non-serious offenses)
            is_sealed = False
            is_expunged = False
            if disposition == CaseDisposition.DISMISSED or (
                not is_sensitive and random.random() < 0.20
            ):
                is_sealed = random.choice([True, False])
                if is_sealed:
                    is_expunged = random.choice([True, False])

            record["criminal_records"].append(
                {
                    "case_number": f"CR-{fake.random_number(digits=8, fix_len=True)}",
                    "crime_category": crime_category,
                    "charge_description": charge_description,
                    "arrest_date": arrest_date,
                    "disposition_date": disposition_date,
                    "disposition": disposition,
                    "sentence_description": sentence_description,
                    "jail_time_days": jail_time_days,
                    "probation_months": probation_months,
                    "fine_amount": fine_amount,
                    "is_sealed": is_sealed,
                    "is_expunged": is_expunged,
                    "is_sensitive": is_sensitive,
                }
            )

    # Civil cases (25% chance)
    if random.random() < 0.25:
        record["has_civil_cases"] = True
        num_cases = random.randint(1, 3)

        for _ in range(num_cases):
            case_type = random.choice(list(CivilCaseType))
            case_description = random.choice(CIVIL_CASE_DESCRIPTIONS[case_type])

            filed_date = fake.date_between(start_date="-10y", end_date="-1m")

            # 70% of cases are closed
            if random.random() < 0.70:
                closed_date = fake.date_between(start_date=filed_date, end_date="today")
                disposition = random.choice(
                    [
                        CaseDisposition.SETTLED,
                        CaseDisposition.JUDGMENT_PLAINTIFF,
                        CaseDisposition.JUDGMENT_DEFENDANT,
                        CaseDisposition.DISMISSED,
                    ]
                )
            else:
                closed_date = None
                disposition = CaseDisposition.PENDING

            # Randomly determine if NPC is plaintiff or defendant
            is_plaintiff = random.choice([True, False])
            if is_plaintiff:
                plaintiff_name = "Self"
                defendant_name = fake.name()
            else:
                plaintiff_name = fake.name()
                defendant_name = "Self"

            # Judgment amount (if applicable)
            judgment_amount = None
            if disposition in [
                CaseDisposition.JUDGMENT_PLAINTIFF,
                CaseDisposition.JUDGMENT_DEFENDANT,
                CaseDisposition.SETTLED,
            ]:
                judgment_amount = Decimal(random.randint(1000, 50000))

            # Sensitive case types
            is_sensitive = case_type in [
                CivilCaseType.DIVORCE,
                CivilCaseType.CUSTODY,
                CivilCaseType.RESTRAINING_ORDER,
            ]

            record["civil_cases"].append(
                {
                    "case_number": f"CV-{fake.random_number(digits=8, fix_len=True)}",
                    "case_type": case_type,
                    "case_description": case_description,
                    "filed_date": filed_date,
                    "closed_date": closed_date,
                    "disposition": disposition,
                    "plaintiff_name": plaintiff_name,
                    "defendant_name": defendant_name,
                    "is_plaintiff": is_plaintiff,
                    "judgment_amount": judgment_amount,
                    "is_sensitive": is_sensitive,
                }
            )

    # Traffic violations (40% chance)
    if random.random() < 0.40:
        record["has_traffic_violations"] = True
        num_violations = random.randint(1, 4)

        for _ in range(num_violations):
            violation_type = random.choice(list(ViolationType))
            violation_description = random.choice(
                TRAFFIC_VIOLATION_DESCRIPTIONS[violation_type]
            )

            violation_date = fake.date_between(start_date="-5y", end_date="-1m")
            location = f"{fake.street_address()}, {fake.city()}"

            # Fine amounts vary by violation type
            if violation_type == ViolationType.DUI:
                fine_amount = Decimal(random.randint(1000, 5000))
                points = random.randint(6, 12)
                is_serious = True
            elif violation_type in [
                ViolationType.RECKLESS_DRIVING,
                ViolationType.HIT_AND_RUN,
            ]:
                fine_amount = Decimal(random.randint(500, 2000))
                points = random.randint(4, 8)
                is_serious = True
            elif violation_type == ViolationType.SPEEDING:
                fine_amount = Decimal(random.randint(100, 500))
                points = random.randint(2, 4)
                is_serious = False
            else:
                fine_amount = Decimal(random.randint(50, 300))
                points = random.randint(0, 2)
                is_serious = False

            was_contested = random.random() < 0.15
            is_paid = random.random() < 0.90

            record["traffic_violations"].append(
                {
                    "citation_number": f"TC-{fake.random_number(digits=10, fix_len=True)}",
                    "violation_type": violation_type,
                    "violation_description": violation_description,
                    "violation_date": violation_date,
                    "location": location,
                    "fine_amount": fine_amount,
                    "points": points,
                    "was_contested": was_contested,
                    "is_paid": is_paid,
                    "is_serious": is_serious,
                }
            )

    return record
