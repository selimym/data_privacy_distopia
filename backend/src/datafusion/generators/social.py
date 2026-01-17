"""Social media data generator for NPCs."""

import random
from uuid import UUID

from faker import Faker

from datafusion.models.social import InferenceCategory, Platform
from datafusion.services.content_loader import load_json

# Load reference data
_SOCIAL_REF = load_json("reference/social.json")

# Convert JSON structure to expected tuple format for backward compatibility
def _convert_inferences(data: dict) -> dict:
    """Convert JSON inference data to tuple format (inference_text, evidence, harm)."""
    result = {}
    for category_key, inferences in data.items():
        # Convert snake_case keys to enum (the key is already the enum value)
        category = InferenceCategory(category_key)
        result[category] = [
            (
                inf["inference_text"],
                inf["supporting_evidence"],
                inf["potential_harm"]
            )
            for inf in inferences
        ]
    return result

PUBLIC_INFERENCES = _convert_inferences(_SOCIAL_REF["public_inferences"])
PRIVATE_INFERENCES = _convert_inferences(_SOCIAL_REF["private_inferences"])


def generate_social_media_record(npc_id: UUID, seed: int | None = None) -> dict:
    """Generate a social media record with public and private inferences."""
    fake = Faker()
    if seed is not None:
        Faker.seed(seed)
        random.seed(seed)

    # 15% of people don't have public social media (privacy conscious)
    has_public_profile = random.random() > 0.15

    # 20% of messaging users use end-to-end encryption
    uses_encryption = random.random() < 0.20

    record = {
        "npc_id": npc_id,
        "has_public_profile": has_public_profile,
        "primary_platform": None,
        "account_created_date": None,
        "follower_count": None,
        "post_frequency": None,
        "uses_end_to_end_encryption": uses_encryption,
        "encryption_explanation": None,
        "public_inferences": [],
        "private_inferences": [],
    }

    # Generate public inferences if they have public profile
    if has_public_profile:
        platform = random.choice(list(Platform))
        record["primary_platform"] = platform
        record["account_created_date"] = fake.date_between(
            start_date="-10y", end_date="-1y"
        )
        record["follower_count"] = random.randint(50, 2000)
        record["post_frequency"] = random.choice(
            ["Multiple times daily", "Daily", "Few times a week", "Weekly", "Rarely"]
        )

        # Generate 2-5 public inferences
        num_inferences = random.randint(2, 5)
        available_categories = list(PUBLIC_INFERENCES.keys())
        random.shuffle(available_categories)

        for category in available_categories[:num_inferences]:
            inference_options = PUBLIC_INFERENCES[category]
            inference_text, evidence, harm = random.choice(inference_options)

            record["public_inferences"].append(
                {
                    "category": category,
                    "inference_text": inference_text,
                    "supporting_evidence": evidence,
                    "confidence_score": random.randint(70, 95),
                    "source_platform": platform,
                    "data_points_analyzed": random.randint(10, 100),
                    "potential_harm": harm,
                }
            )

    # Generate private inferences (requires privileged database access)
    if uses_encryption:
        # User uses end-to-end encryption - no private data available
        record[
            "encryption_explanation"
        ] = "This person uses end-to-end encrypted messaging (Signal, WhatsApp with encryption enabled). No private message content can be analyzed. This demonstrates how encryption protects privacy even when other data is compromised."
    else:
        # Generate 1-3 private inferences (sensitive content)
        num_private = random.randint(1, 3)
        available_private_categories = list(PRIVATE_INFERENCES.keys())
        random.shuffle(available_private_categories)

        for category in available_private_categories[:num_private]:
            inference_options = PRIVATE_INFERENCES[category]
            inference_text, evidence, harm = random.choice(inference_options)

            platform = random.choice(list(Platform))

            record["private_inferences"].append(
                {
                    "category": category,
                    "inference_text": inference_text,
                    "supporting_evidence": evidence,
                    "confidence_score": random.randint(75, 98),
                    "source_platform": platform,
                    "message_count": random.randint(10, 100),
                    "involves_other_parties": random.choice([True, True, False]),
                    "is_highly_sensitive": True,
                    "potential_harm": harm,
                }
            )

    return record
