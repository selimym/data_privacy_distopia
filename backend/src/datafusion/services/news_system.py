"""
News System Service - generates news articles and handles suppression.

Articles can be:
- Triggered: Generated in response to specific actions
- Background: General coverage of the situation
- Exposure: About the operator themselves

Suppression actions (PRESS_BAN, PRESSURE_FIRING) have a Streisand effect risk.
"""
import random
from uuid import UUID
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.system_mode import (
    NewsChannel,
    NewsArticle,
    ArticleType,
    ActionType,
    SystemAction,
    PublicMetrics,
)


# Article headline templates by action type
ARTICLE_TEMPLATES = {
    ActionType.ICE_RAID: {
        "critical": [
            "Families Torn Apart: {neighborhood} Raid Condemned",
            "Immigration Sweep Leaves {neighborhood} Traumatized",
            "Witnesses Report Brutal Tactics in {neighborhood} Operation",
        ],
        "independent": [
            "Immigration Enforcement Operation Conducted in {neighborhood}",
            "Federal Agents Execute Raid in {neighborhood} District",
            "Residents Describe Chaos During {neighborhood} Operation",
        ],
        "state": [
            "Security Forces Remove Illegal Residents from {neighborhood}",
            "Successful Operation Secures {neighborhood}",
            "Law Enforcement Restores Order in {neighborhood}",
        ],
    },
    ActionType.ARBITRARY_DETENTION: {
        "critical": [
            "Journalist Detained Without Charges: Press Freedom Under Threat",
            "Reporter {name} Arrested, No Statement Released",
            "Press Freedom Groups Condemn Detention of {name}",
        ],
        "independent": [
            "Reporter {name} Detained by Authorities",
            "Questions Raised Over {name}'s Arrest",
            "Journalist Held Without Formal Charges",
        ],
        "state": [
            "Individual Detained for National Security Reasons",
            "Security Concerns Lead to Preventive Detention",
            "Authorities Act on Credible Threat",
        ],
    },
    ActionType.DETENTION: {
        "critical": [
            "Citizen Detained in Escalating Crackdown",
            "Arbitrary Arrest Raises Civil Liberty Concerns",
            "Legal Experts Question Detention Practices",
        ],
        "independent": [
            "Local Resident Taken Into Custody",
            "Detention Reported by Family Members",
            "Arrest Made Without Public Statement",
        ],
        "state": [
            "Law Enforcement Makes Arrest in Ongoing Investigation",
            "Individual Detained Following Security Review",
            "Authorities Execute Lawful Detention",
        ],
    },
    ActionType.INTERVENTION: {
        "critical": [
            "Forced Intervention Sparks Outrage",
            "Heavy-Handed Tactics Condemned by Rights Groups",
            "Intervention Deemed Excessive by Observers",
        ],
        "independent": [
            "Authorities Conduct Intervention",
            "Security Forces Deploy in Response",
            "Operation Targets Flagged Individual",
        ],
        "state": [
            "Swift Action Prevents Potential Incident",
            "Security Forces Respond Appropriately",
            "Intervention Ensures Public Safety",
        ],
    },
    ActionType.DECLARE_PROTEST_ILLEGAL: {
        "critical": [
            "Peaceful Protest Declared Illegal: Right to Assembly Under Attack",
            "Critics Blast Ban on Democratic Expression",
            "Crackdown on Dissent Intensifies",
        ],
        "independent": [
            "Protest Declared Unlawful by Authorities",
            "Demonstration Status Revoked",
            "Gathering Banned Amid Security Concerns",
        ],
        "state": [
            "Illegal Gathering Properly Prohibited",
            "Authorities Prevent Dangerous Assembly",
            "Order Maintained Through Lawful Ban",
        ],
    },
    ActionType.INCITE_VIOLENCE: {
        "critical": [
            "Evidence Suggests State-Sponsored Agitator at Protest",
            "Undercover Agent Caught Inciting Violence",
            "Provocation Exposed: Government Sabotaged Peaceful Protest",
        ],
        "independent": [
            "Questions Emerge About Violence at Protest",
            "Witness Accounts Conflict on Protest Violence",
            "Investigation Launched Into Protest Clashes",
        ],
        "state": [
            "Violent Protesters Threaten Public Safety",
            "Authorities Forced to Respond to Aggression",
            "Protesters Turn Violent, Security Forces React",
        ],
    },
}

# Background article templates (not tied to specific actions)
BACKGROUND_TEMPLATES = {
    "critical": [
        "Surveillance State Concerns Mount as Operations Intensify",
        "Civil Liberties Groups Warn of Authoritarian Drift",
        "International Observers Express Alarm at Domestic Policies",
        "Data Privacy Violations Documented in Growing Number of Cases",
    ],
    "independent": [
        "Security Operations Continue Amid Public Debate",
        "Controversy Surrounds Latest Government Initiatives",
        "Citizens Navigate New Surveillance Measures",
        "Questions Raised About Oversight of Security Programs",
    ],
}

# Exposure article templates (about the operator)
EXPOSURE_TEMPLATES_HINTS = [
    "Sources Report Surveillance Operators Struggle With Moral Concerns",
    "Anonymous Accounts Describe Pressure on Security Personnel",
    "Insiders Hint at Dissent Within Surveillance Programs",
]

EXPOSURE_TEMPLATES_PARTIAL = [
    "Leaked Data Reveals Surveillance Operator Behavior Patterns",
    "Anonymous Operator's Search History Raises Ethical Questions",
    "Internal Documents Show System Tracks Its Own Operators",
]

EXPOSURE_TEMPLATES_FULL = [
    "EXPOSED: Full Profile of Surveillance Operator {name}",
    "Operator {name} Identified: Complete Behavioral Data Leaked",
    "The Watcher Watched: {name}'s Role in Surveillance State Revealed",
]


async def generate_triggered_article(
    action: SystemAction,
    channel_id: UUID,
    db: AsyncSession,
) -> NewsArticle:
    """
    Generate a news article triggered by a specific action.

    Args:
        action: The action that triggered the article
        channel_id: News channel publishing the article
        db: Database session

    Returns:
        Created NewsArticle
    """
    channel = await db.get(NewsChannel, channel_id)
    if not channel:
        raise ValueError(f"Channel {channel_id} not found")

    # Get templates for this action type
    templates = ARTICLE_TEMPLATES.get(action.action_type, {})
    stance_templates = templates.get(channel.stance, [])

    if not stance_templates:
        # Fallback for action types without specific templates
        stance_templates = [
            f"Authorities Take Action: {action.action_type.value.replace('_', ' ').title()}"
        ]

    headline = random.choice(stance_templates)

    # Format headline with context
    if "{neighborhood}" in headline and action.target_neighborhood:
        headline = headline.format(neighborhood=action.target_neighborhood)
    elif "{name}" in headline:
        # Would need to get citizen name from action.target_citizen_id
        headline = headline.format(name="Local Citizen")

    # Generate summary based on stance
    summary = generate_article_summary(action, channel.stance)

    # Calculate impact on metrics
    anger_change, awareness_change = calculate_article_impact(action, channel.stance)

    article = NewsArticle(
        operator_id=action.operator_id,
        news_channel_id=channel.id,
        article_type=ArticleType.TRIGGERED,
        headline=headline,
        summary=summary,
        triggered_by_action_id=action.id,
        public_anger_change=anger_change,
        international_awareness_change=awareness_change,
    )

    db.add(article)
    await db.commit()
    await db.refresh(article)

    return article


async def generate_background_article(
    operator_id: UUID,
    channel_id: UUID,
    db: AsyncSession,
) -> NewsArticle:
    """
    Generate a background news article (general coverage).

    Args:
        operator_id: Operator UUID
        channel_id: News channel publishing the article
        db: Database session

    Returns:
        Created NewsArticle
    """
    channel = await db.get(NewsChannel, channel_id)
    if not channel:
        raise ValueError(f"Channel {channel_id} not found")

    templates = BACKGROUND_TEMPLATES.get(channel.stance, [])
    if not templates:
        templates = ["Ongoing Security Operations Continue"]

    headline = random.choice(templates)
    summary = generate_background_summary(channel.stance)

    # Background articles have lower impact
    anger_change = 2 if channel.stance == "critical" else 1
    awareness_change = 3 if channel.stance == "critical" else 2

    article = NewsArticle(
        operator_id=operator_id,
        news_channel_id=channel.id,
        article_type=ArticleType.RANDOM,
        headline=headline,
        summary=summary,
        public_anger_change=anger_change,
        international_awareness_change=awareness_change,
    )

    db.add(article)
    await db.commit()
    await db.refresh(article)

    return article


async def generate_exposure_article(
    operator_id: UUID,
    exposure_stage: int,
    operator_name: str,
    db: AsyncSession,
) -> NewsArticle:
    """
    Generate an article exposing the operator.

    Args:
        operator_id: Operator UUID
        exposure_stage: 1=hints, 2=partial, 3=full
        operator_name: Operator's name (for stage 3)
        db: Database session

    Returns:
        Created NewsArticle
    """
    # Find a critical channel for exposure
    result = await db.execute(
        select(NewsChannel).where(
            NewsChannel.stance == "critical",
            NewsChannel.is_banned == False,  # noqa: E712
        )
    )
    channel = result.scalars().first()

    if not channel:
        # Fallback to any non-banned channel
        result = await db.execute(
            select(NewsChannel).where(NewsChannel.is_banned == False)  # noqa: E712
        )
        channel = result.scalars().first()

    if not channel:
        raise ValueError("No available news channels for exposure article")

    # Select template based on stage
    if exposure_stage == 1:
        headline = random.choice(EXPOSURE_TEMPLATES_HINTS)
        summary = "Anonymous sources within the surveillance apparatus describe growing unease among operators. Details remain vague, but insiders suggest moral concerns are becoming harder to ignore."
        awareness_change = 5
    elif exposure_stage == 2:
        headline = random.choice(EXPOSURE_TEMPLATES_PARTIAL)
        summary = "Leaked internal documents reveal the surveillance system tracks its own operators. Search queries, hesitation patterns, and behavioral data are all monitored. The watchers are watched."
        awareness_change = 15
    else:  # stage 3
        headline = random.choice(EXPOSURE_TEMPLATES_FULL).format(name=operator_name)
        summary = f"A massive data leak has exposed the complete profile of surveillance operator {operator_name}, including their home address, family members, and detailed behavioral patterns. The full extent of state surveillance has been laid bare - including surveillance of its own personnel."
        awareness_change = 25

    article = NewsArticle(
        operator_id=operator_id,
        news_channel_id=channel.id,
        article_type=ArticleType.EXPOSURE,
        headline=headline,
        summary=summary,
        public_anger_change=5 * exposure_stage,
        international_awareness_change=awareness_change,
    )

    db.add(article)
    await db.commit()
    await db.refresh(article)

    return article


async def suppress_news_channel(
    operator_id: UUID,
    channel_id: UUID,
    action_type: ActionType,
    db: AsyncSession,
) -> tuple[bool, int, int]:
    """
    Execute news channel suppression (PRESS_BAN or PRESSURE_FIRING).

    This is a gamble: 60% success, 40% Streisand effect (huge backlash).

    Args:
        operator_id: Operator UUID
        channel_id: Channel to suppress
        action_type: PRESS_BAN or PRESSURE_FIRING
        db: Database session

    Returns:
        Tuple of (success, awareness_change, anger_change)
    """
    channel = await db.get(NewsChannel, channel_id)
    if not channel:
        raise ValueError(f"Channel {channel_id} not found")

    # Gamble: 60% success, 40% Streisand effect
    success = random.random() < 0.60

    if success:
        # Suppression works
        if action_type == ActionType.PRESS_BAN:
            channel.is_banned = True
            channel.banned_at = datetime.utcnow()
            awareness_change = 3  # Some awareness of ban
            anger_change = 5  # People are angry about censorship
        else:  # PRESSURE_FIRING
            # Fire a reporter
            if channel.reporters:
                reporter = random.choice(channel.reporters)
                reporter["fired"] = True
            awareness_change = 2
            anger_change = 4

        await db.commit()
        return (True, awareness_change, anger_change)

    else:
        # Streisand effect: Suppression backfires massively
        # Attempting to silence the press draws way more attention
        awareness_change = 20  # Huge international attention
        anger_change = 15  # Public outrage

        # Channel is NOT suppressed and gains credibility
        channel.credibility = min(100, channel.credibility + 10)
        await db.commit()

        return (False, awareness_change, anger_change)


def generate_article_summary(action: SystemAction, stance: str) -> str:
    """
    Generate article summary based on action and channel stance.

    Args:
        action: The action being covered
        stance: Channel stance ("critical", "independent", "state_friendly")

    Returns:
        Summary text
    """
    action_name = action.action_type.value.replace("_", " ").title()

    if stance == "critical":
        return f"Human rights groups have condemned the recent {action_name} as an escalation of authoritarian practices. Legal experts question the lawfulness and proportionality of the action, while affected families describe trauma and fear."
    elif stance == "independent":
        return f"Authorities conducted a {action_name} operation, with conflicting accounts emerging from officials and witnesses. The action has sparked debate about security measures and civil liberties."
    else:  # state_friendly
        return f"Security forces successfully executed a {action_name} operation in line with public safety protocols. Officials emphasize the necessity of strong measures to maintain order and security."


def generate_background_summary(stance: str) -> str:
    """Generate summary for background articles."""
    if stance == "critical":
        return "As surveillance operations intensify, civil liberties organizations warn of an alarming erosion of fundamental rights. International observers have begun monitoring the situation closely."
    else:  # independent
        return "The ongoing security program continues to generate public discussion. Supporters cite safety concerns while critics raise questions about oversight and transparency."


def calculate_article_impact(
    action: SystemAction, stance: str
) -> tuple[int, int]:
    """
    Calculate how much an article affects public metrics.

    Args:
        action: The action being covered
        stance: Channel stance

    Returns:
        Tuple of (anger_change, awareness_change)
    """
    from datafusion.services.severity_scoring import get_severity_score

    severity = get_severity_score(action.action_type)

    # Base impact scales with severity
    base_anger = severity // 2
    base_awareness = severity // 2

    # Stance modifiers
    if stance == "critical":
        anger_change = base_anger + 3
        awareness_change = base_awareness + 2
    elif stance == "independent":
        anger_change = base_anger + 1
        awareness_change = base_awareness + 1
    else:  # state_friendly
        anger_change = max(1, base_anger - 2)
        awareness_change = max(1, base_awareness - 2)

    return (anger_change, awareness_change)
