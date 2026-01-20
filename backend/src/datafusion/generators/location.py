"""Location tracking data generator for NPCs."""

import random
from datetime import time
from uuid import UUID

from faker import Faker

from datafusion.models.location import LocationType

# Location names by type
WORKPLACES = [
    "TechCorp Solutions",
    "Riverside Medical Center",
    "DataFlow Analytics",
    "Green Valley School",
    "Metro Transit Authority",
    "Summit Financial Services",
    "Horizon Manufacturing",
    "CityView Retail",
    "Valley Hospital",
    "University of Riverside",
]

GYMS = [
    "24/7 Fitness Center",
    "Valley Yoga Studio",
    "PowerHouse Gym",
    "CrossFit Riverside",
]

PLACES_OF_WORSHIP = [
    "St. Mary's Church",
    "Riverside Community Church",
    "Beth Synagogue",
    "Islamic Center of Metro City",
]

ENTERTAINMENT = [
    "Riverside Cinema",
    "Downtown Sports Bar",
    "The Jazz Club",
    "Valley Bowling Alley",
    "Metro Theater",
]

MEDICAL_FACILITIES = [
    "Riverside Medical Center",
    "Summit Health Clinic",
    "Valley Psychiatry Associates",
    "Metro Physical Therapy",
]


def generate_location_record(npc_id: UUID, seed: int | None = None) -> dict:
    """Generate a location tracking record with inferred locations."""
    fake = Faker()
    if seed is not None:
        Faker.seed(seed)
        random.seed(seed)

    # 10% of people disable location tracking
    tracking_enabled = random.random() > 0.10

    record = {
        "npc_id": npc_id,
        "tracking_enabled": tracking_enabled,
        "data_retention_days": random.choice([30, 60, 90, 180]),
        "inferred_locations": [],
    }

    if not tracking_enabled:
        # No location data for people who disabled it
        return record

    inferred_locations = []

    # Workplace (80% of people have identifiable workplace)
    if random.random() < 0.80:
        workplace_name = random.choice(WORKPLACES)
        inferred_locations.append(
            {
                "location_type": LocationType.WORKPLACE,
                "location_name": workplace_name,
                "street_address": fake.street_address(),
                "city": fake.city(),
                "state": fake.state_abbr(),
                "zip_code": fake.zipcode(),
                "typical_days": "Weekdays",
                "typical_arrival_time": time(
                    hour=random.randint(7, 9), minute=random.choice([0, 15, 30, 45])
                ),
                "typical_departure_time": time(
                    hour=random.randint(16, 18), minute=random.choice([0, 15, 30, 45])
                ),
                "visit_frequency": "Daily",
                "inferred_relationship": "Primary workplace - consistently present during business hours",
                "privacy_implications": "Employer can be identified, work schedule exposed, physical location during work hours known",
                "is_sensitive": False,
                "confidence_score": random.randint(90, 98),
            }
        )

    # Home confirmation (always present, confirms tracking accuracy)
    inferred_locations.append(
        {
            "location_type": LocationType.HOME,
            "location_name": "Primary Residence",
            "street_address": fake.street_address(),
            "city": fake.city(),
            "state": fake.state_abbr(),
            "zip_code": fake.zipcode(),
            "typical_days": "Daily",
            "typical_arrival_time": None,  # Variable
            "typical_departure_time": None,  # Variable
            "visit_frequency": "Daily (overnight stays)",
            "inferred_relationship": "Primary residence confirmed by overnight location data",
            "privacy_implications": "Home address confirmed, sleep schedule patterns exposed, when home is empty can be determined",
            "is_sensitive": True,
            "confidence_score": 99,
        }
    )

    # Romantic interest location (30% of people)
    if random.random() < 0.30:
        partner_name = fake.first_name()
        inferred_locations.append(
            {
                "location_type": LocationType.ROMANTIC_INTEREST,
                "location_name": f"{partner_name}'s Apartment",
                "street_address": fake.street_address(),
                "city": fake.city(),
                "state": fake.state_abbr(),
                "zip_code": fake.zipcode(),
                "typical_days": random.choice(
                    ["Friday, Saturday", "Weekends", "Thursday, Friday, Saturday"]
                ),
                "typical_arrival_time": time(
                    hour=random.randint(18, 21), minute=random.choice([0, 30])
                ),
                "typical_departure_time": time(
                    hour=random.randint(7, 10), minute=random.choice([0, 30])
                ),
                "visit_frequency": random.choice(
                    ["2-3 times per week", "Weekly", "Multiple times per week"]
                ),
                "inferred_relationship": "Likely romantic partner - regular overnight stays, consistent pattern on weekends",
                "privacy_implications": "Romantic relationships can be exposed, partner's location revealed, intimate schedule patterns known, potential for stalking or harassment of partner",
                "is_sensitive": True,
                "confidence_score": random.randint(75, 90),
            }
        )

    # Family location (50% of people visit family regularly)
    if random.random() < 0.50:
        relationship = random.choice(["Elderly parent", "Parents", "Sibling", "Adult child"])
        inferred_locations.append(
            {
                "location_type": LocationType.FAMILY,
                "location_name": f"{relationship}'s Home",
                "street_address": fake.street_address(),
                "city": fake.city(),
                "state": fake.state_abbr(),
                "zip_code": fake.zipcode(),
                "typical_days": random.choice(["Sunday", "Weekends", "Saturday"]),
                "typical_arrival_time": time(
                    hour=random.randint(11, 14), minute=random.choice([0, 30])
                ),
                "typical_departure_time": time(
                    hour=random.randint(16, 19), minute=random.choice([0, 30])
                ),
                "visit_frequency": random.choice(["Weekly", "Bi-weekly", "Monthly"]),
                "inferred_relationship": f"{relationship} - regular visits suggest close family relationship",
                "privacy_implications": "Family members can be identified and located, caregiving responsibilities exposed, potential targets for manipulation or coercion",
                "is_sensitive": True,
                "confidence_score": random.randint(70, 85),
            }
        )

    # Frequent visits (gym, store, etc.) - 60% of people
    if random.random() < 0.60:
        location_type = random.choice([LocationType.FREQUENT_VISIT, LocationType.PLACE_OF_WORSHIP])

        if location_type == LocationType.FREQUENT_VISIT:
            location_name = random.choice(GYMS + ENTERTAINMENT)
            days = random.choice(["Monday, Wednesday, Friday", "Weekdays", "Tuesday, Thursday"])
            frequency = random.choice(["3-4 times per week", "Weekly", "Bi-weekly"])
            relationship = "Regular recreation/fitness location"
            implications = "Daily routine patterns exposed, habits and interests revealed"
        else:  # PLACE_OF_WORSHIP
            location_name = random.choice(PLACES_OF_WORSHIP)
            days = random.choice(["Sunday", "Friday", "Saturday"])
            frequency = "Weekly"
            relationship = "Regular attendance suggests religious affiliation"
            implications = "Religious beliefs exposed, could lead to discrimination or targeting, worship schedule known"

        inferred_locations.append(
            {
                "location_type": location_type,
                "location_name": location_name,
                "street_address": fake.street_address(),
                "city": fake.city(),
                "state": fake.state_abbr(),
                "zip_code": fake.zipcode(),
                "typical_days": days,
                "typical_arrival_time": time(
                    hour=random.randint(8, 18), minute=random.choice([0, 30])
                ),
                "typical_departure_time": time(
                    hour=random.randint(9, 20), minute=random.choice([0, 30])
                ),
                "visit_frequency": frequency,
                "inferred_relationship": relationship,
                "privacy_implications": implications,
                "is_sensitive": location_type == LocationType.PLACE_OF_WORSHIP,
                "confidence_score": random.randint(65, 80),
            }
        )

    # Medical facility (20% of people with regular appointments)
    if random.random() < 0.20:
        facility = random.choice(MEDICAL_FACILITIES)
        inferred_locations.append(
            {
                "location_type": LocationType.MEDICAL_FACILITY,
                "location_name": facility,
                "street_address": fake.street_address(),
                "city": fake.city(),
                "state": fake.state_abbr(),
                "zip_code": fake.zipcode(),
                "typical_days": random.choice(["Tuesday", "Thursday", "Varies", "Monthly"]),
                "typical_arrival_time": time(
                    hour=random.randint(9, 15), minute=random.choice([0, 30])
                ),
                "typical_departure_time": None,  # Varies
                "visit_frequency": random.choice(
                    ["Weekly", "Bi-weekly", "Monthly", "Multiple times per month"]
                ),
                "inferred_relationship": "Regular medical appointments suggest ongoing treatment or chronic condition management",
                "privacy_implications": "Health conditions can be inferred, medical appointments exposed, vulnerable moments identified, treatment schedule known to potential stalkers",
                "is_sensitive": True,
                "confidence_score": random.randint(75, 88),
            }
        )

    record["inferred_locations"] = inferred_locations
    return record
