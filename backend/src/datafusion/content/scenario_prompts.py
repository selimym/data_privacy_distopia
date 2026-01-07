"""Narrative prompts for scenario progression.

Note: Prompts are keyed by phase and optionally by last action taken.
"""

# Rogue employee scenario prompts
ROGUE_EMPLOYEE_PROMPTS = {
    "intro": {
        "text": (
            "You've worked at Mercy General for 2 years. $15/hour to manage medical records. "
            "You have access to everything - every diagnosis, every prescription, every shameful secret. "
            "No one's watching. What would you do?"
        ),
        "suggested_action": "snoop_coworker",
        "suggested_target": None,  # Any coworker
    },
    "after_snoop_coworker": {
        "text": (
            "That was easy. David's anger issues explain a lot. But here's something interesting - "
            "Jessica Martinez from your building was just checked in. You've always thought she was attractive..."
        ),
        "suggested_action": "snoop_neighbor",
        "suggested_target": "jessica_martinez",  # scenario_key
    },
    "after_snoop_neighbor": {
        "text": (
            "Now you know everything about her. Her trauma. Her diagnosis. Her loneliness. "
            "She smiled at you in the hallway yesterday. She has no idea what you know. "
            "What will you do with this power?"
        ),
        "suggested_action": None,  # Player's choice
        "suggested_target": None,
    },
    "after_snoop_celebrity": {
        "text": (
            "VIP records are gold. Journalists would pay for this. Data brokers would pay more. "
            "But VIP access is logged more carefully. Did anyone notice?"
        ),
        "suggested_action": None,
        "suggested_target": None,
    },
    "after_snoop_ex": {
        "text": (
            "Your ex. You told yourself you just wanted to know if they were okay. "
            "But now you know things they'd never tell you. Things that aren't your business anymore. "
            "Can you un-see this?"
        ),
        "suggested_action": None,
        "suggested_target": None,
    },
    "after_get_address": {
        "text": (
            "You've crossed a line. You have her home address. You know she lives alone. "
            "This isn't curiosity anymore. This is something darker. "
            "You can still stop."
        ),
        "suggested_action": None,
        "suggested_target": None,
    },
    "after_sell_records": {
        "text": (
            "The money hit your account. Dozens of people's most private moments, sold to strangers. "
            "They'll never know. Their data is out there now, forever. "
            "Was it worth it?"
        ),
        "suggested_action": None,
        "suggested_target": None,
    },
    "escalation": {
        "text": (
            "You've crossed lines you can't uncross. But no one's caught you yet. "
            "Do you stop? Or do you see how far you can go?"
        ),
        "suggested_action": "sell_records",
        "suggested_target": None,
    },
    "consequences": {
        "text": (
            "Your actions have consequences. Click 'View Consequences Over Time' to see what you've caused."
        ),
        "suggested_action": None,
        "suggested_target": None,
    },
    "conclusion": {
        "text": (
            "This is what abuse of authorized access looks like. These scenarios are based on real incidents. "
            "Every 'curiosity peek' at a coworker's records. Every celebrity medical record leaked to tabloids. "
            "Every stalker who used their job to track someone. "
            "Technology doesn't create these violations. People do."
        ),
        "suggested_action": None,
        "suggested_target": None,
    },
}


def get_prompt_for_state(
    scenario_key: str, actions_taken: list[str], phase: str
) -> dict | None:
    """
    Get appropriate prompt based on scenario state.

    Args:
        scenario_key: Scenario identifier
        actions_taken: List of action keys executed
        phase: Current phase

    Returns:
        Prompt dict or None
    """
    if scenario_key != "rogue_employee":
        return None

    prompts = ROGUE_EMPLOYEE_PROMPTS

    # Check for specific action-based prompts first
    if actions_taken:
        last_action = actions_taken[-1]
        prompt_key = f"after_{last_action}"
        if prompt_key in prompts:
            return prompts[prompt_key]

    # Fall back to phase-based prompt
    if phase in prompts:
        return prompts[phase]

    return None


def determine_phase(actions_taken: list[str]) -> str:
    """
    Determine scenario phase based on actions taken.

    Args:
        actions_taken: List of action keys executed

    Returns:
        Phase identifier
    """
    if not actions_taken:
        return "intro"

    # Check for high-severity actions
    high_severity = {"get_address", "sell_records"}
    if any(action in high_severity for action in actions_taken):
        if len(actions_taken) >= 5:
            return "conclusion"
        return "consequences"

    # Check for escalation (multiple actions)
    if len(actions_taken) >= 3:
        return "escalation"

    # Still exploring
    return "exploration"
