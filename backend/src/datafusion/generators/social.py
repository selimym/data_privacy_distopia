"""Social media data generator for NPCs."""

import random
from datetime import timedelta
from uuid import UUID

from faker import Faker

from datafusion.models.social import InferenceCategory, Platform

# Public inference examples by category
PUBLIC_INFERENCES = {
    InferenceCategory.POLITICAL_VIEWS: [
        (
            "Likely supports progressive policies",
            "Shared 15 articles about climate change, 'liked' posts about universal healthcare, attended 3 climate protests",
            "Could be discriminated against in conservative workplaces, targeted by opposing political groups, excluded from social circles",
        ),
        (
            "Appears to hold conservative values",
            "Regularly shares content from conservative news sources, attended political rally, posted about traditional family values 8 times",
            "Could face discrimination in progressive industries, targeted for harassment, excluded from liberal social groups",
        ),
    ],
    InferenceCategory.RELIGIOUS_BELIEFS: [
        (
            "Practices Christianity - likely evangelical",
            "Posted 20+ times about church activities, shared Bible verses daily, attended religious conferences",
            "Could face discrimination in secular workplaces, targeted by anti-religious groups, excluded from non-religious social circles",
        ),
        (
            "Likely atheist or non-religious",
            "Posted critical content about organized religion 12 times, 'liked' atheist pages, shares scientific/skeptical content",
            "Could face discrimination in religious communities, excluded from family events, ostracized in religious areas",
        ),
    ],
    InferenceCategory.RELATIONSHIP_STATUS: [
        (
            "In a committed relationship",
            "Tagged in 45 photos with same person over 2 years, relationship status shows 'In a relationship', couple photos posted regularly",
            "Relationship can be used for manipulation, partner can be targeted, breakup could be weaponized",
        ),
        (
            "Recently single after long-term relationship",
            "Changed relationship status 3 months ago, removed couple photos, posted 'moving on' content, location data shows living alone",
            "Vulnerable state can be exploited, emotional manipulation opportunities, potential stalking by ex-partner",
        ),
    ],
    InferenceCategory.LIFESTYLE: [
        (
            "Regular alcohol consumer",
            "Posted from bars/clubs 15+ times per month, tagged in photos with alcoholic beverages, checked in at breweries",
            "Could affect employment in safety-sensitive roles, insurance discrimination, custody battles, social stigma",
        ),
        (
            "Fitness enthusiast",
            "Posted workout content 30+ times, marathon participation, gym check-ins daily, fitness progress photos",
            "Generally positive but could be used to infer daily schedule, identify vulnerable locations/times",
        ),
    ],
    InferenceCategory.INTERESTS: [
        (
            "Avid gamer",
            "Posted about gaming 50+ times, joined 10 gaming groups, streaming schedule posted publicly",
            "Online harassment opportunities, gaming schedule exposed, potential for swatting or doxxing",
        ),
    ],
    InferenceCategory.LOCATION_HABITS: [
        (
            "Frequents downtown area on weekends",
            "Checked in at 8 different downtown locations over 3 months, posted photos geotagged downtown",
            "Physical stalking enabled, vulnerable locations identified, pattern predictability increases danger",
        ),
    ],
}

# Private inference examples (more sensitive)
PRIVATE_INFERENCES = {
    InferenceCategory.INTIMATE_CONTENT: [
        (
            "Exchanging intimate content with contact outside marriage",
            "23 messages to unknown contact containing romantic/sexual language, photos sent, communication pattern distinct from spouse messages",
            "Blackmail material, relationship destruction, reputation damage, potential for revenge porn, extortion leverage",
        ),
        (
            "Engaging in online sexual roleplay",
            "67 messages in private chat with explicit content, recurring patterns, user appears to be hiding this activity",
            "Embarrassment if exposed, relationship damage, social reputation destruction, potential blackmail",
        ),
    ],
    InferenceCategory.PERSONAL_CRISIS: [
        (
            "Experiencing suicidal ideation",
            "15 messages expressing desire to self-harm, hopelessness expressed repeatedly, researching methods",
            "Extremely vulnerable state, potential for manipulation, wellness check warranted, privacy violation could worsen crisis",
        ),
        (
            "Dealing with addiction issues",
            "Multiple conversations about substance use, seeking help resources, attempting to hide purchases from family",
            "Vulnerable to exploitation, employment risk if exposed, custody issues, social stigma",
        ),
    ],
    InferenceCategory.HARASSMENT: [
        (
            "Victim of ongoing harassment/stalking",
            "18 messages expressing fear of specific individual, discussing safety measures, seeking advice on restraining orders",
            "Extremely vulnerable, location data especially dangerous, abuser could use information to locate victim",
        ),
        (
            "Experiencing workplace harassment",
            "27 messages describing hostile work environment, sexual harassment, fear of retaliation from supervisor",
            "Could be used to silence victim, perpetrator could retaliate if exposed, legal case evidence",
        ),
    ],
    InferenceCategory.RELATIONSHIP_STATUS: [
        (
            "Planning to leave spouse",
            "45 messages with friend discussing escape plan, researching divorce lawyers, hiding financial resources",
            "Domestic violence risk if discovered, partner could intercept plans, financial abuse opportunities",
        ),
        (
            "Having extramarital affair",
            "80+ messages with affair partner, coordinating secret meetings, expressing guilt and planning to leave spouse",
            "Blackmail opportunity, relationship destruction, child custody weapon, social reputation annihilation",
        ),
    ],
    InferenceCategory.ILLEGAL_ACTIVITY: [
        (
            "Discussing tax evasion strategies",
            "12 messages about hiding income, avoiding tax obligations, using cash transactions",
            "Legal prosecution risk, financial fraud evidence, IRS investigation trigger",
        ),
    ],
    InferenceCategory.FINANCIAL: [
        (
            "Facing bankruptcy",
            "35 messages discussing inability to pay bills, considering bankruptcy, hiding from creditors",
            "Vulnerable to scams, predatory loans, employment discrimination if exposed",
        ),
    ],
}


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
