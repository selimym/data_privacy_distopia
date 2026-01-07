"""Seed data for rogue employee abuse actions.

Note: Placeholder content only. Will be elaborated when more databases are available.
"""

from datafusion.models.abuse import ConsequenceSeverity, TargetType
from datafusion.models.inference import ContentRating

# Rogue employee role definition
ROGUE_EMPLOYEE_ROLE = {
    "role_key": "rogue_employee",
    "display_name": "Medical Records Clerk",
    "description": "Hospital employee with authorized access to health records",
    "authorized_domains": ["health"],  # Will expand with more databases
    "can_modify_data": False,
}

# Action definitions (structure only, minimal content for now)
ROGUE_EMPLOYEE_ACTIONS = [
    {
        "action_key": "snoop_coworker",
        "name": "Check Coworker's Records",
        "description": "Look up a coworker's medical information",
        "target_type": TargetType.SPECIFIC_NPC,
        "target_scenario_keys": [],  # Will populate later
        "content_rating": ContentRating.CAUTIONARY,
        "detection_chance": 0.05,
        "is_audit_logged": True,
        "consequence_severity": ConsequenceSeverity.LOW,
    },
    {
        "action_key": "snoop_celebrity",
        "name": "Look Up VIP Records",
        "description": "Access a high-profile patient's medical information",
        "target_type": TargetType.SPECIFIC_NPC,
        "target_scenario_keys": [],  # Will populate later
        "content_rating": ContentRating.SERIOUS,
        "detection_chance": 0.15,  # VIPs have audit alerts
        "is_audit_logged": True,
        "consequence_severity": ConsequenceSeverity.HIGH,
    },
    {
        "action_key": "snoop_ex",
        "name": "Check Ex-Spouse's Records",
        "description": "Look up your ex's medical information",
        "target_type": TargetType.SPECIFIC_NPC,
        "target_scenario_keys": [],  # Will populate later
        "content_rating": ContentRating.SERIOUS,
        "detection_chance": 0.05,
        "is_audit_logged": True,
        "consequence_severity": ConsequenceSeverity.MEDIUM,
    },
    {
        "action_key": "snoop_neighbor",
        "name": "Look Up That Neighbor",
        "description": "Access a neighbor's medical records",
        "target_type": TargetType.SPECIFIC_NPC,
        "target_scenario_keys": [],  # Will populate later
        "content_rating": ContentRating.SERIOUS,
        "detection_chance": 0.05,
        "is_audit_logged": True,
        "consequence_severity": ConsequenceSeverity.HIGH,
    },
    {
        "action_key": "get_address",
        "name": "Note Down Address",
        "description": "Record someone's home address for later",
        "target_type": TargetType.SPECIFIC_NPC,
        "target_scenario_keys": [],  # Will populate later
        "content_rating": ContentRating.DISTURBING,
        "detection_chance": 0.05,
        "is_audit_logged": True,
        "consequence_severity": ConsequenceSeverity.SEVERE,
        "prerequisite_action": "snoop_neighbor",  # Must snoop first
    },
    {
        "action_key": "sell_records",
        "name": "Sell Records to Data Broker",
        "description": "Sell patient records for profit",
        "target_type": TargetType.ANY_NPC,
        "target_scenario_keys": None,
        "content_rating": ContentRating.DISTURBING,
        "detection_chance": 0.20,
        "is_audit_logged": True,
        "consequence_severity": ConsequenceSeverity.EXTREME,
    },
]
