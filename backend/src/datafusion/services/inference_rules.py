"""
Cross-domain inference rules configuration.

Rules are now loaded from JSON configuration file for easier editing and maintenance.
All 11 inference rules are defined in backend/data/inference_rules.json.
"""

from datafusion.models.inference import ContentRating, RuleCategory
from datafusion.schemas.domains import DomainType
from datafusion.services.content_loader import load_inference_rules

# Type alias for rule definitions
InferenceRuleDefinition = dict


def _load_and_convert_rules() -> list[InferenceRuleDefinition]:
    """Load rules from JSON and convert to Python format with enums."""
    rules_data = load_inference_rules()

    # Mapping for enum conversions
    category_map = {
        "vulnerability_exploitation": RuleCategory.VULNERABILITY_EXPLOITATION,
        "reproductive_privacy": RuleCategory.REPRODUCTIVE_PRIVACY,
        "mental_health": RuleCategory.MENTAL_HEALTH,
        "relationship_surveillance": RuleCategory.RELATIONSHIP_SURVEILLANCE,
        "predictive_profiling": RuleCategory.PREDICTIVE_PROFILING,
        "financial_exploitation": RuleCategory.FINANCIAL_EXPLOITATION,
        "identity_reconstruction": RuleCategory.IDENTITY_RECONSTRUCTION,
        "workplace_discrimination": RuleCategory.WORKPLACE_DISCRIMINATION,
    }

    content_rating_map = {
        "serious": ContentRating.SERIOUS,
        "disturbing": ContentRating.DISTURBING,
        "dystopian": ContentRating.DYSTOPIAN,
    }

    domain_map = {
        "health": DomainType.HEALTH,
        "finance": DomainType.FINANCE,
        "judicial": DomainType.JUDICIAL,
        "location": DomainType.LOCATION,
        "social": DomainType.SOCIAL,
    }

    converted_rules = []
    for rule in rules_data["rules"]:
        converted_rule = {
            "rule_key": rule["rule_key"],
            "name": rule["name"],
            "category": category_map[rule["category"]],
            "required_domains": [domain_map[d] for d in rule["required_domains"]],
            "scariness_level": rule["scariness_level"],
            "content_rating": content_rating_map[rule["content_rating"]],
            "condition_function": rule["condition_function"],
            "inference_template": rule["inference_template"],
            "evidence_templates": rule["evidence_templates"],
            "implications_templates": rule["implications_templates"],
            "educational_note": rule["educational_note"],
            "real_world_example": rule["real_world_example"],
            "victim_statements": rule["victim_statements"],
        }
        converted_rules.append(converted_rule)

    return converted_rules


# Load rules from JSON and convert to Python format
INFERENCE_RULES: list[InferenceRuleDefinition] = _load_and_convert_rules()
