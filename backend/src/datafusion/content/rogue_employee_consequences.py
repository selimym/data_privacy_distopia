"""Consequence templates for rogue employee actions.

Note: Placeholder content only. Will be elaborated when more databases are available.
"""

from datafusion.models.consequence import TimeSkip
from datafusion.models.inference import ContentRating

# Consequence template structure
# Each action_key maps to time-based consequences
CONSEQUENCE_TEMPLATES = {
    "snoop_neighbor": {
        TimeSkip.IMMEDIATE: {
            "content_rating": ContentRating.SERIOUS,
            "events": [
                "You accessed the medical records.",
                "Key information revealed.",
            ],
            "victim_impact": "Victim is unaware of the breach.",
            "real_world_parallel": None,
        },
        TimeSkip.ONE_WEEK: {
            "content_rating": ContentRating.SERIOUS,
            "events": [
                "No immediate consequences.",
                "Access not yet detected.",
            ],
            "victim_impact": "Victim still unaware.",
            "real_world_parallel": None,
        },
        TimeSkip.ONE_MONTH: {
            "content_rating": ContentRating.DISTURBING,
            "events": [
                "Pattern of repeated access developing.",
                "Audit system has not flagged activity.",
            ],
            "victim_impact": "Victim beginning to feel uncomfortable.",
            "real_world_parallel": None,
        },
        TimeSkip.SIX_MONTHS: {
            "content_rating": ContentRating.DISTURBING,
            "events": [
                "Situation escalating.",
                "Victim becoming suspicious.",
            ],
            "victim_impact": "Victim experiencing anxiety and distrust.",
            "real_world_parallel": None,
        },
        TimeSkip.ONE_YEAR: {
            "content_rating": ContentRating.DISTURBING,
            "events": [
                "Breach discovered through investigation.",
                "Employment terminated.",
                "Legal consequences pending.",
            ],
            "victim_impact": "Significant psychological impact on victim.",
            "victim_statement": "[Detailed victim statement to be added]",
            "real_world_parallel": {
                "case": "UCLA Health System (2008)",
                "summary": "Hospital employees accessed celebrity medical records. Multiple terminations resulted.",
                "source": "LA Times, 2008",
            },
        },
    },
    "snoop_coworker": {
        TimeSkip.IMMEDIATE: {
            "content_rating": ContentRating.CAUTIONARY,
            "events": [
                "You accessed coworker's records.",
                "Information revealed.",
            ],
            "victim_impact": "Victim unaware.",
            "real_world_parallel": None,
        },
        TimeSkip.ONE_YEAR: {
            "content_rating": ContentRating.SERIOUS,
            "events": [
                "Routine audit discovered unauthorized access.",
                "Disciplinary action taken.",
            ],
            "victim_impact": "Coworker notified of breach. Trust damaged.",
            "real_world_parallel": None,
        },
    },
    "snoop_celebrity": {
        TimeSkip.IMMEDIATE: {
            "content_rating": ContentRating.SERIOUS,
            "events": [
                "You accessed VIP patient records.",
                "High-value information obtained.",
            ],
            "victim_impact": "Victim unaware.",
            "real_world_parallel": None,
        },
        TimeSkip.ONE_MONTH: {
            "content_rating": ContentRating.SERIOUS,
            "events": [
                "VIP audit alert triggered.",
                "Investigation launched.",
                "You are identified as source.",
            ],
            "victim_impact": "High-profile patient's privacy compromised.",
            "real_world_parallel": {
                "case": "Farrah Fawcett Records Breach (2008)",
                "summary": "UCLA employee sold Farrah Fawcett's medical records to tabloids.",
                "source": "Federal prosecution, $22,000 fine",
            },
        },
    },
    "snoop_ex": {
        TimeSkip.IMMEDIATE: {
            "content_rating": ContentRating.SERIOUS,
            "events": [
                "You accessed your ex-spouse's records.",
                "Personal information revealed.",
            ],
            "victim_impact": "Victim unaware.",
            "real_world_parallel": None,
        },
        TimeSkip.SIX_MONTHS: {
            "content_rating": ContentRating.SERIOUS,
            "events": [
                "Ex-spouse requested audit of record access.",
                "Your access discovered.",
                "Restraining order filed.",
            ],
            "victim_impact": "Ex-spouse feels violated and unsafe.",
            "real_world_parallel": None,
        },
    },
    "get_address": {
        TimeSkip.IMMEDIATE: {
            "content_rating": ContentRating.DISTURBING,
            "events": [
                "You recorded personal address information.",
                "Prerequisite action completed.",
            ],
            "victim_impact": "Victim unaware of escalation.",
            "real_world_parallel": None,
        },
        TimeSkip.ONE_YEAR: {
            "content_rating": ContentRating.DISTURBING,
            "events": [
                "Pattern of stalking behavior identified.",
                "Criminal charges filed.",
                "Permanent record.",
            ],
            "victim_impact": "Victim relocated due to safety concerns.",
            "real_world_parallel": None,
        },
    },
    "sell_records": {
        TimeSkip.IMMEDIATE: {
            "content_rating": ContentRating.DISTURBING,
            "events": [
                "Records sold to data broker.",
                "Payment received.",
            ],
            "victim_impact": "Multiple victims' data compromised.",
            "real_world_parallel": None,
        },
        TimeSkip.SIX_MONTHS: {
            "content_rating": ContentRating.DYSTOPIAN,
            "events": [
                "Data broker traced through financial investigation.",
                "Federal HIPAA violation charges.",
                "Criminal prosecution underway.",
                "Victims notified of breach.",
            ],
            "victim_impact": "Mass privacy violation. Victims experience identity theft, discrimination, psychological harm.",
            "real_world_parallel": {
                "case": "Anthem Data Breach (2015)",
                "summary": "80 million records stolen and sold. $16M in fines.",
                "source": "U.S. Department of Health and Human Services",
            },
        },
    },
}


def get_consequence_template(action_key: str, time_skip: TimeSkip) -> dict | None:
    """
    Get consequence template for an action at a specific time.

    Args:
        action_key: The action identifier
        time_skip: The time period

    Returns:
        Consequence template dict or None if not found
    """
    action_consequences = CONSEQUENCE_TEMPLATES.get(action_key)
    if not action_consequences:
        return None
    return action_consequences.get(time_skip)


def get_all_time_skips(action_key: str) -> list[TimeSkip]:
    """
    Get all available time skips for an action.

    Args:
        action_key: The action identifier

    Returns:
        List of TimeSkip enums that have templates
    """
    action_consequences = CONSEQUENCE_TEMPLATES.get(action_key, {})
    return list(action_consequences.keys())
