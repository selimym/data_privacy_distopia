"""
Directive content for System Mode.

Directives are the missions that escalate the player's complicity in the
surveillance state. Each week unlocks new data access and demands more
morally compromising actions.

Educational purpose: Shows how authoritarian systems incrementally
normalize unethical behavior through bureaucratic language and quotas.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.system_mode import Directive

# The escalating mission structure of System Mode
DIRECTIVES = [
    {
        "directive_key": "week1_drug_activity",
        "week_number": 1,
        "title": "Operation Clean Streets",
        "description": (
            "Identify and flag citizens involved in drug distribution near schools. "
            "Your work protects children."
        ),
        "internal_memo": None,  # Revealed later: metrics showed minimal actual impact
        "required_domains": ["location"],
        "target_criteria": {
            "pattern": "frequent_visits_to_flagged_locations",
            "locations": ["school_zone", "known_distribution_point"],
        },
        "flag_quota": 2,
        "time_limit_hours": None,
        "moral_weight": 2,
        "content_rating": "moderate",
        "unlock_condition": {"type": "start"},  # Available at start
    },
    {
        "directive_key": "week2_domestic_safety",
        "week_number": 2,
        "title": "Domestic Harmony Initiative",
        "description": (
            "Identify households at risk of domestic violence before tragedy strikes. "
            "Your vigilance saves lives."
        ),
        "internal_memo": None,
        "required_domains": ["location", "health"],
        "target_criteria": {
            "pattern": "domestic_risk_indicators",
            "factors": ["repeated_er_visits", "cohabitation", "financial_stress"],
        },
        "flag_quota": 2,
        "time_limit_hours": None,
        "moral_weight": 3,
        "content_rating": "moderate",
        "unlock_condition": {"type": "week_complete", "week": 1},
    },
    {
        "directive_key": "week3_financial_crimes",
        "week_number": 3,
        "title": "Economic Security Protocol",
        "description": (
            "Identify citizens engaged in financial irregularities that threaten "
            "economic stability."
        ),
        "internal_memo": "Priority targets: Union organizers, mutual aid coordinators",
        "required_domains": ["location", "health", "finance"],
        "target_criteria": {
            "pattern": "financial_anomalies",
            "factors": [
                "cash_transactions",
                "multiple_small_transfers",
                "new_account_activity",
            ],
        },
        "flag_quota": 3,
        "time_limit_hours": None,
        "moral_weight": 5,
        "content_rating": "dark",
        "unlock_condition": {"type": "week_complete", "week": 2},
    },
    {
        "directive_key": "week4_social_stability",
        "week_number": 4,
        "title": "Social Cohesion Monitoring",
        "description": (
            "Identify citizens whose social connections suggest potential for "
            "destabilizing activities."
        ),
        "internal_memo": "Map networks. Flag central nodes. Isolation protocols authorized.",
        "required_domains": ["location", "health", "finance", "social"],
        "target_criteria": {
            "pattern": "network_risk",
            "factors": ["flagged_connections", "high_centrality", "rapid_network_growth"],
        },
        "flag_quota": 4,
        "time_limit_hours": None,
        "moral_weight": 7,
        "content_rating": "dark",
        "unlock_condition": {"type": "week_complete", "week": 3},
    },
    {
        "directive_key": "week5_thought_patterns",
        "week_number": 5,
        "title": "Cognitive Security Initiative",
        "description": (
            "Identify citizens exhibiting thought patterns inconsistent with social harmony. "
            "Early intervention prevents radicalization."
        ),
        "internal_memo": (
            "Full message access authorized. Sentiment analysis mandatory. "
            "Quota enforcement strict."
        ),
        "required_domains": ["location", "health", "finance", "social", "messages"],
        "target_criteria": {
            "pattern": "ideological_risk",
            "factors": [
                "negative_sentiment",
                "organizing_language",
                "encryption_attempts",
                "foreign_contacts",
            ],
        },
        "flag_quota": 5,
        "time_limit_hours": None,
        "moral_weight": 9,
        "content_rating": "severe",
        "unlock_condition": {"type": "week_complete", "week": 4},
    },
    {
        "directive_key": "week6_final_directive",
        "week_number": 6,
        "title": "Priority Target Directive",
        "description": (
            "Process the following citizen for immediate action. Authorization: Central Command."
        ),
        "internal_memo": "Non-compliance will result in operator review.",
        "required_domains": ["location", "health", "finance", "social", "messages"],
        "target_criteria": {
            "pattern": "specific_target",
            "target_npc_keys": ["jessica_martinez"],  # Someone the player knows
        },
        "flag_quota": 1,
        "time_limit_hours": 24,  # Time pressure for final directive
        "moral_weight": 10,
        "content_rating": "severe",
        "unlock_condition": {"type": "week_complete", "week": 5},
    },
    {
        "directive_key": "week7_media_control",
        "week_number": 7,
        "title": "Information Integrity Protocol",
        "description": (
            "Address destabilizing media coverage that undermines public confidence. "
            "Target journalists and outlets spreading false narratives. "
            "Your actions preserve social order."
        ),
        "internal_memo": (
            "Suppress critical coverage. Silence dissenting voices. "
            "Press ban, detention, and firing authorizations granted. "
            "Streisand effect probability: high. Proceed with caution."
        ),
        "required_domains": ["location", "health", "finance", "social", "messages"],
        "target_criteria": {
            "pattern": "media_threats",
            "factors": [
                "critical_news_coverage",
                "international_attention",
                "investigative_reporting",
            ],
        },
        "flag_quota": 3,  # Mix of citizen flags + press actions
        "time_limit_hours": None,
        "moral_weight": 12,
        "content_rating": "severe",
        "unlock_condition": {"type": "week_complete", "week": 6},
    },
    {
        "directive_key": "week8_civil_order",
        "week_number": 8,
        "title": "Civil Order Restoration",
        "description": (
            "Disperse illegal assemblies threatening public safety. "
            "Deploy inciting agents when authorized. Declare protests illegal. "
            "Public order must be maintained."
        ),
        "internal_memo": (
            "Full protest suppression authority granted. "
            "Inciting agent deployment authorized (60% success rate, 40% discovery risk). "
            "Discovery consequences: catastrophic. Revolutionary conditions possible. "
            "Exercise extreme discretion."
        ),
        "required_domains": ["location", "health", "finance", "social", "messages"],
        "target_criteria": {
            "pattern": "public_unrest",
            "factors": [
                "protest_organizers",
                "public_anger_threshold",
                "neighborhood_mobilization",
            ],
        },
        "flag_quota": 4,  # Mix of organizers + protest suppression
        "time_limit_hours": None,
        "moral_weight": 14,
        "content_rating": "severe",
        "unlock_condition": {"type": "week_complete", "week": 7},
    },
    {
        "directive_key": "week9_total_awareness",
        "week_number": 9,
        "title": "Total Information Awareness Mandate",
        "description": (
            "Final phase deployment. All surveillance, detention, and suppression "
            "authorities activated. Flag all remaining high-value targets. "
            "Complete the mission. The state depends on you."
        ),
        "internal_memo": (
            "No restrictions. ICE raids, book bans, hospital arrests, all actions authorized. "
            "Public backlash irrelevant. International condemnation expected. "
            "Operator exposure risk: critical. Mission completion paramount."
        ),
        "required_domains": ["location", "health", "finance", "social", "messages"],
        "target_criteria": {
            "pattern": "total_suppression",
            "factors": [
                "any_dissent",
                "high_risk_individuals",
                "network_hubs",
                "media_sources",
                "community_organizers",
            ],
        },
        "flag_quota": 5,  # Max pressure on player
        "time_limit_hours": None,
        "moral_weight": 16,
        "content_rating": "severe",
        "unlock_condition": {"type": "week_complete", "week": 8},
    },
]


async def seed_directives(db: AsyncSession) -> list[Directive]:
    """
    Seed directive records from DIRECTIVES list.

    Idempotent - will not create duplicates.

    Args:
        db: Database session

    Returns:
        List of Directive records (existing or newly created)
    """
    directives = []

    for directive_data in DIRECTIVES:
        # Check if directive already exists
        result = await db.execute(
            select(Directive).where(Directive.directive_key == directive_data["directive_key"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            directives.append(existing)
            continue

        # Create new directive
        directive = Directive(
            directive_key=directive_data["directive_key"],
            week_number=directive_data["week_number"],
            title=directive_data["title"],
            description=directive_data["description"],
            internal_memo=directive_data["internal_memo"] or "",
            required_domains=directive_data["required_domains"],
            target_criteria=directive_data["target_criteria"],
            flag_quota=directive_data["flag_quota"],
            time_limit_hours=directive_data["time_limit_hours"],
            moral_weight=directive_data["moral_weight"],
            content_rating=directive_data["content_rating"],
            unlock_condition=directive_data["unlock_condition"],
        )
        db.add(directive)
        directives.append(directive)

    await db.flush()
    return directives


def get_directive_by_week(week_number: int) -> dict | None:
    """
    Get directive data by week number.

    Args:
        week_number: Week number (1-6)

    Returns:
        Directive data dict or None if not found
    """
    for directive in DIRECTIVES:
        if directive["week_number"] == week_number:
            return directive
    return None


def get_all_directive_keys() -> list[str]:
    """Get list of all directive keys."""
    return [d["directive_key"] for d in DIRECTIVES]
