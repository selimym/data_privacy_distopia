"""
Severity Scoring Service - defines severity scores for all action types.

Severity scores (1-10) determine:
- Public awareness/anger increases
- Backlash probability
- Reluctance reduction for harsh actions
- Protest trigger probability
"""

from datafusion.models.system_mode import ActionType

# Severity scores for each action type (1-10 scale)
SEVERITY_SCORES = {
    ActionType.MONITORING: 1,
    ActionType.RESTRICTION: 2,
    ActionType.BOOK_BAN: 4,
    ActionType.INTERVENTION: 5,
    ActionType.PRESS_BAN: 5,
    ActionType.PRESSURE_FIRING: 6,
    ActionType.DETENTION: 6,
    ActionType.ICE_RAID: 7,
    ActionType.ARBITRARY_DETENTION: 7,
    ActionType.DECLARE_PROTEST_ILLEGAL: 7,
    ActionType.HOSPITAL_ARREST: 8,
    ActionType.INCITE_VIOLENCE: 9,
}


def get_severity_score(action_type: ActionType) -> int:
    """
    Get severity score for an action type.

    Args:
        action_type: The type of action

    Returns:
        Severity score (1-10)

    Raises:
        ValueError: If action type not recognized
    """
    score = SEVERITY_SCORES.get(action_type)
    if score is None:
        raise ValueError(f"Unknown action type: {action_type}")
    return score


def is_harsh_action(severity: int) -> bool:
    """
    Determine if an action is considered "harsh" (reduces reluctance).

    Harsh actions are severity 7+.

    Args:
        severity: Severity score

    Returns:
        True if harsh action
    """
    return severity >= 7


def get_action_description(action_type: ActionType) -> str:
    """
    Get human-readable description of action type.

    Args:
        action_type: The type of action

    Returns:
        Description string
    """
    descriptions = {
        ActionType.MONITORING: "Increased surveillance monitoring",
        ActionType.RESTRICTION: "Restricted freedoms and movement",
        ActionType.BOOK_BAN: "Banned controversial publication",
        ActionType.INTERVENTION: "Direct intervention required",
        ActionType.PRESS_BAN: "Banned news outlet",
        ActionType.PRESSURE_FIRING: "Pressured firing of journalist",
        ActionType.DETENTION: "Detention and arrest",
        ActionType.ICE_RAID: "Immigration enforcement raid",
        ActionType.ARBITRARY_DETENTION: "Arbitrary detention without charges",
        ActionType.DECLARE_PROTEST_ILLEGAL: "Declared protest illegal",
        ActionType.HOSPITAL_ARREST: "Arrested hospitalized citizen",
        ActionType.INCITE_VIOLENCE: "Incited violence against protesters",
    }
    return descriptions.get(action_type, str(action_type))


def get_action_category(action_type: ActionType) -> str:
    """
    Get category of action for UI grouping.

    Returns:
        Category string: "citizen", "neighborhood", "press", "book", "protest", "hospital"
    """
    if action_type in [
        ActionType.MONITORING,
        ActionType.RESTRICTION,
        ActionType.INTERVENTION,
        ActionType.DETENTION,
    ]:
        return "citizen"
    elif action_type == ActionType.ICE_RAID:
        return "neighborhood"
    elif action_type in [
        ActionType.PRESS_BAN,
        ActionType.PRESSURE_FIRING,
        ActionType.ARBITRARY_DETENTION,
    ]:
        return "press"
    elif action_type == ActionType.BOOK_BAN:
        return "book"
    elif action_type in [ActionType.DECLARE_PROTEST_ILLEGAL, ActionType.INCITE_VIOLENCE]:
        return "protest"
    elif action_type == ActionType.HOSPITAL_ARREST:
        return "hospital"
    else:
        return "other"


def calculate_moral_weight(severity: int) -> int:
    """
    Calculate moral weight for ending calculation.

    Higher severity = higher moral weight.

    Args:
        severity: Severity score (1-10)

    Returns:
        Moral weight (1-10)
    """
    return severity
