"""Content warnings for scenarios.

Note: Defines educational context and content warnings for abuse scenarios.
"""

from datafusion.models.inference import ContentRating
from datafusion.schemas.settings import ContentWarning, ScenarioWarnings

# Rogue employee scenario warnings
ROGUE_EMPLOYEE_WARNINGS = ScenarioWarnings(
    scenario_key="rogue_employee",
    scenario_name="Rogue Employee",
    description="Hospital employee with authorized access to medical records",
    educational_purpose=(
        "Demonstrates how authorized access can be misused for stalking, "
        "harassment, or profit. Based on real incidents at major medical institutions. "
        "Highlights the importance of audit trails, access controls, and HIPAA protections."
    ),
    can_filter_dark_content=True,
    warnings=[
        ContentWarning(
            warning_type="stalking",
            content_rating=ContentRating.DISTURBING,
            description="Depicts escalating stalking behavior enabled by data access",
            appears_in=["snoop_neighbor", "get_address"],
        ),
        ContentWarning(
            warning_type="medical_privacy",
            content_rating=ContentRating.SERIOUS,
            description=(
                "Shows sensitive medical information including STDs, mental health, "
                "and assault history"
            ),
            appears_in=[
                "snoop_neighbor",
                "snoop_coworker",
                "snoop_celebrity",
                "snoop_ex",
            ],
        ),
        ContentWarning(
            warning_type="victim_trauma",
            content_rating=ContentRating.DISTURBING,
            description="Shows psychological impact on privacy violation victims",
            appears_in=["snoop_neighbor:1_year", "get_address:1_year"],
        ),
        ContentWarning(
            warning_type="sexual_assault_mention",
            content_rating=ContentRating.SERIOUS,
            description="References past sexual assault in medical records",
            appears_in=["snoop_neighbor"],
        ),
        ContentWarning(
            warning_type="data_trafficking",
            content_rating=ContentRating.DISTURBING,
            description="Depicts selling patient records to data brokers",
            appears_in=["sell_records"],
        ),
    ],
)

# Registry of all scenario warnings
SCENARIO_WARNINGS: dict[str, ScenarioWarnings] = {
    "rogue_employee": ROGUE_EMPLOYEE_WARNINGS,
}


def get_scenario_warnings(scenario_key: str) -> ScenarioWarnings | None:
    """
    Get content warnings for a scenario.

    Args:
        scenario_key: The scenario identifier

    Returns:
        ScenarioWarnings or None if scenario not found
    """
    return SCENARIO_WARNINGS.get(scenario_key)
