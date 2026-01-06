"""Identity data generator for NPCs."""

import random
from datetime import date

from faker import Faker

from datafusion.models.npc import Role

SPRITE_KEYS = [
    "citizen_m1",
    "citizen_m2",
    "citizen_m3",
    "citizen_f1",
    "citizen_f2",
    "citizen_f3",
    "employee_1",
    "employee_2",
    "official_1",
    "official_2",
    "analyst_1",
    "hacker_1",
]

ROLE_DISTRIBUTION = {
    Role.CITIZEN: 0.90,
    Role.ROGUE_EMPLOYEE: 0.05,
    Role.GOVERNMENT_OFFICIAL: 0.03,
    Role.DATA_ANALYST: 0.02,
}

MAP_WIDTH = 50
MAP_HEIGHT = 50


def generate_identity(seed: int | None = None) -> dict:
    """Generate a single NPC identity with realistic fake data."""
    fake = Faker()
    if seed is not None:
        Faker.seed(seed)
        random.seed(seed)

    role = random.choices(
        list(ROLE_DISTRIBUTION.keys()),
        weights=list(ROLE_DISTRIBUTION.values()),
        k=1,
    )[0]

    birth_year = random.randint(1940, 2005)
    birth_month = random.randint(1, 12)
    birth_day = random.randint(1, 28)

    return {
        "first_name": fake.first_name(),
        "last_name": fake.last_name(),
        "date_of_birth": date(birth_year, birth_month, birth_day),
        "ssn": fake.ssn(),
        "street_address": fake.street_address(),
        "city": fake.city(),
        "state": fake.state_abbr(),
        "zip_code": fake.zipcode(),
        "role": role,
        "sprite_key": random.choice(SPRITE_KEYS),
        "map_x": random.randint(0, MAP_WIDTH - 1),
        "map_y": random.randint(0, MAP_HEIGHT - 1),
        "is_scenario_npc": False,
        "scenario_key": None,
    }


def generate_population(count: int, seed: int | None = None) -> list[dict]:
    """Generate multiple NPC identities with deterministic output when seeded."""
    if seed is not None:
        Faker.seed(seed)
        random.seed(seed)

    return [generate_identity(seed=seed + i if seed else None) for i in range(count)]
