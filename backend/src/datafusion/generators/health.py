"""Health record data generator for NPCs."""

import random
from datetime import date, timedelta
from uuid import UUID

from faker import Faker

from datafusion.models.health import Severity

COMMON_CONDITIONS = [
    "Hypertension",
    "Type 2 Diabetes",
    "Asthma",
    "Seasonal Allergies",
    "Migraine",
    "Gastroesophageal Reflux Disease (GERD)",
    "Osteoarthritis",
    "Hypothyroidism",
    "High Cholesterol",
    "Chronic Back Pain",
]

SENSITIVE_CONDITIONS = [
    "Depression",
    "Anxiety Disorder",
    "Bipolar Disorder",
    "PTSD",
    "HIV",
    "Herpes (HSV-2)",
    "Substance Use Disorder",
    "Eating Disorder",
    "Schizophrenia",
]

CONDITION_MEDICATIONS = {
    "Hypertension": ["Lisinopril", "Amlodipine", "Losartan"],
    "Type 2 Diabetes": ["Metformin", "Glipizide", "Insulin"],
    "Asthma": ["Albuterol", "Fluticasone", "Montelukast"],
    "Seasonal Allergies": ["Cetirizine", "Loratadine", "Fluticasone nasal spray"],
    "Migraine": ["Sumatriptan", "Propranolol", "Topiramate"],
    "Depression": ["Sertraline", "Escitalopram", "Bupropion"],
    "Anxiety Disorder": ["Alprazolam", "Buspirone", "Hydroxyzine"],
    "Bipolar Disorder": ["Lithium", "Valproic Acid", "Quetiapine"],
    "PTSD": ["Prazosin", "Sertraline", "Paroxetine"],
    "HIV": ["Biktarvy", "Truvada", "Descovy"],
    "Herpes (HSV-2)": ["Acyclovir", "Valacyclovir"],
    "Substance Use Disorder": ["Naltrexone", "Buprenorphine", "Methadone"],
    "GERD": ["Omeprazole", "Pantoprazole", "Ranitidine"],
    "Osteoarthritis": ["Ibuprofen", "Naproxen", "Acetaminophen"],
    "Hypothyroidism": ["Levothyroxine"],
    "High Cholesterol": ["Atorvastatin", "Simvastatin", "Rosuvastatin"],
    "Chronic Back Pain": ["Cyclobenzaprine", "Meloxicam", "Gabapentin"],
    "Eating Disorder": ["Fluoxetine", "Olanzapine"],
    "Schizophrenia": ["Risperidone", "Olanzapine", "Aripiprazole"],
}

SENSITIVE_VISIT_REASONS = [
    "Psychotherapy session",
    "STD screening",
    "HIV test",
    "Substance abuse counseling",
    "Psychiatric evaluation",
    "Trauma therapy",
]

COMMON_VISIT_REASONS = [
    "Annual physical",
    "Follow-up appointment",
    "Sick visit - cold/flu",
    "Blood pressure check",
    "Medication refill",
    "Lab work review",
    "Preventive care",
    "Vaccination",
]


def generate_health_record(npc_id: UUID, seed: int | None = None) -> dict:
    """Generate a health record with conditions, medications, and visits."""
    fake = Faker()
    if seed is not None:
        Faker.seed(seed)
        random.seed(seed)

    # Fictional insurance providers (not real companies)
    insurance_providers = [
        "SafeGuard Health Alliance",
        "Wellness First Insurance Co.",
        "CityCare Medical Group",
        "Premier Health Partners",
        "TotalCare Insurance Network",
        "Liberty Medical Services",
        "Horizon Health Solutions",
        "Summit Care Insurance",
    ]

    record = {
        "npc_id": npc_id,
        "insurance_provider": random.choice(insurance_providers),
        "primary_care_physician": f"Dr. {fake.last_name()}",
        "conditions": [],
        "medications": [],
        "visits": [],
    }

    conditions = []

    if random.random() < 0.40:
        num_common = random.randint(1, 3)
        common_conditions = random.sample(COMMON_CONDITIONS, min(num_common, len(COMMON_CONDITIONS)))
        for condition_name in common_conditions:
            conditions.append({
                "condition_name": condition_name,
                "diagnosed_date": fake.date_between(start_date="-10y", end_date="-1y"),
                "severity": random.choice([Severity.MILD, Severity.MODERATE]),
                "is_chronic": random.choice([True, False]),
                "is_sensitive": False,
            })

    if random.random() < 0.15:
        sensitive_condition = random.choice(SENSITIVE_CONDITIONS)
        conditions.append({
            "condition_name": sensitive_condition,
            "diagnosed_date": fake.date_between(start_date="-8y", end_date="-6m"),
            "severity": random.choice([Severity.MODERATE, Severity.SEVERE]),
            "is_chronic": True,
            "is_sensitive": True,
        })

    record["conditions"] = conditions

    for condition_data in conditions:
        condition_name = condition_data["condition_name"]
        if condition_name in CONDITION_MEDICATIONS:
            medications = CONDITION_MEDICATIONS[condition_name]
            med_name = random.choice(medications)

            dosages = ["10mg", "20mg", "50mg", "100mg", "5mg", "25mg"]

            record["medications"].append({
                "medication_name": med_name,
                "dosage": random.choice(dosages),
                "prescribed_date": condition_data["diagnosed_date"],
                "is_sensitive": condition_data["is_sensitive"],
            })

    num_visits = random.randint(2, 8)
    for _ in range(num_visits):
        is_sensitive = random.random() < 0.20
        visit_reasons = SENSITIVE_VISIT_REASONS if is_sensitive else COMMON_VISIT_REASONS

        visit_date = fake.date_between(start_date="-3y", end_date="today")

        visit = {
            "visit_date": visit_date,
            "provider_name": f"Dr. {fake.last_name()}",
            "reason": random.choice(visit_reasons),
            "notes": fake.sentence() if random.random() < 0.30 else None,
            "is_sensitive": is_sensitive,
        }
        record["visits"].append(visit)

    record["visits"].sort(key=lambda v: v["visit_date"])

    return record
