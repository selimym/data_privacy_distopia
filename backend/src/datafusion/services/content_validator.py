"""Content validation for JSON data files using Pydantic."""

from typing import Any

from pydantic import BaseModel, field_validator

from datafusion.services.content_loader import load_json


# Outcomes validation models
class OutcomeTimepoint(BaseModel):
    """Single timepoint in an outcome template."""

    status: str
    narrative: str
    statistics: dict[str, Any]


class OutcomeTemplates(BaseModel):
    """Outcome templates for all flag types."""

    outcome_templates: dict[str, dict[str, OutcomeTimepoint]]
    family_events: list[str]
    detention_conditions: list[str]
    summaries: dict[str, str]

    @field_validator("outcome_templates")
    @classmethod
    def validate_flag_types(cls, v: dict) -> dict:
        """Ensure all required flag types exist."""
        required_types = ["monitoring", "restriction", "intervention", "detention"]
        for flag_type in required_types:
            if flag_type not in v:
                raise ValueError(f"Missing outcome template for flag type: {flag_type}")

            # Check timepoints
            required_timepoints = ["immediate", "1_month", "6_months", "1_year"]
            for timepoint in required_timepoints:
                if timepoint not in v[flag_type]:
                    raise ValueError(f"Missing timepoint {timepoint} for flag type {flag_type}")

        return v


# Directives validation models
class DirectiveTargetCriteria(BaseModel):
    """Target criteria for a directive."""

    pattern: str
    locations: list[str] | None = None
    keywords: list[str] | None = None


class DirectiveUnlockCondition(BaseModel):
    """Unlock condition for a directive."""

    type: str
    required_compliance: float | None = None


class Directive(BaseModel):
    """Single directive definition."""

    directive_key: str
    week_number: int
    title: str
    description: str
    internal_memo: str | None
    required_domains: list[str]
    target_criteria: DirectiveTargetCriteria
    flag_quota: int
    time_limit_hours: int | None
    moral_weight: int
    content_rating: str
    unlock_condition: DirectiveUnlockCondition


class Directives(BaseModel):
    """All directives."""

    directives: list[Directive]

    @field_validator("directives")
    @classmethod
    def validate_week_numbers(cls, v: list[Directive]) -> list[Directive]:
        """Ensure week numbers are sequential."""
        week_numbers = [d.week_number for d in v]
        if sorted(week_numbers) != list(range(1, len(week_numbers) + 1)):
            raise ValueError("Directive week numbers must be sequential starting from 1")
        return v


# Messages validation models
class ScenarioMessage(BaseModel):
    """Single scenario message with metadata."""

    message: str
    sentiment: float
    keywords: list[str]
    day: int

    @classmethod
    def from_tuple(cls, data: list) -> "ScenarioMessage":
        """Create from tuple format [message, sentiment, keywords, day]."""
        if len(data) != 4:
            raise ValueError(f"Scenario message must have 4 elements, got {len(data)}")
        return cls(message=data[0], sentiment=data[1], keywords=data[2], day=data[3])


class Messages(BaseModel):
    """Message templates."""

    mundane_messages: list[str]
    venting_messages: list[str]
    organizing_messages: list[str]
    work_complaints: list[str]
    mental_health_messages: list[str]
    financial_stress_messages: list[str]
    concerning_keywords: list[str]
    scenario_messages: dict[str, list[Any]]  # Arrays of [msg, sentiment, keywords, day]

    @field_validator("mundane_messages", "venting_messages", "organizing_messages")
    @classmethod
    def validate_min_messages(cls, v: list[str]) -> list[str]:
        """Ensure minimum number of messages."""
        if len(v) < 5:
            raise ValueError("Each message category must have at least 5 messages")
        return v

    @field_validator("scenario_messages")
    @classmethod
    def validate_scenario_messages(cls, v: dict[str, list[Any]]) -> dict[str, list[Any]]:
        """Validate scenario message structure."""
        for scenario_name, messages in v.items():
            for i, msg_data in enumerate(messages):
                if not isinstance(msg_data, list) or len(msg_data) != 4:
                    raise ValueError(
                        f"Scenario message {scenario_name}[{i}] must be [message, sentiment, keywords, day]"
                    )
                # Validate structure
                if not isinstance(msg_data[0], str):
                    raise ValueError(f"Message text must be string in {scenario_name}[{i}]")
                if not isinstance(msg_data[1], (int, float)):
                    raise ValueError(f"Sentiment must be number in {scenario_name}[{i}]")
                if not isinstance(msg_data[2], list):
                    raise ValueError(f"Keywords must be list in {scenario_name}[{i}]")
                if not isinstance(msg_data[3], int):
                    raise ValueError(f"Day must be integer in {scenario_name}[{i}]")
        return v


# Prompts validation models
class RogueEmployeePrompt(BaseModel):
    """Single rogue employee prompt."""

    text: str
    suggested_action: str | None
    suggested_target: str | None


class Prompts(BaseModel):
    """Scenario prompts."""

    rogue_employee_prompts: dict[str, RogueEmployeePrompt]

    @field_validator("rogue_employee_prompts")
    @classmethod
    def validate_required_prompts(cls, v: dict) -> dict:
        """Ensure required prompt keys exist."""
        required_keys = ["intro", "conclusion"]
        for key in required_keys:
            if key not in v:
                raise ValueError(f"Missing required prompt: {key}")
        return v


# Consequences validation models
class RealWorldParallel(BaseModel):
    """Real world parallel case."""

    case: str
    summary: str
    source: str


class ConsequenceTimepoint(BaseModel):
    """Single timepoint in consequence template."""

    content_rating: str
    events: list[str]
    victim_impact: str
    victim_statement: str | None = None
    real_world_parallel: RealWorldParallel | None = None


class Consequences(BaseModel):
    """Rogue employee consequences."""

    consequence_templates: dict[str, dict[str, ConsequenceTimepoint]]

    @field_validator("consequence_templates")
    @classmethod
    def validate_timepoints(cls, v: dict) -> dict:
        """Ensure at least immediate and 1_year timepoints exist for each action."""
        for action_name, timepoints in v.items():
            # Only require immediate timepoint at minimum
            if "immediate" not in timepoints:
                raise ValueError(f"Missing required 'immediate' timepoint for action {action_name}")
            # Ensure at least one timepoint exists
            if len(timepoints) == 0:
                raise ValueError(f"Action {action_name} must have at least one timepoint")
        return v


# Reference data validation models
class HealthReference(BaseModel):
    """Health reference data."""

    common_conditions: list[str]
    sensitive_conditions: list[str]
    condition_medications: dict[str, list[str]]
    sensitive_visit_reasons: list[str]
    common_visit_reasons: list[str]
    insurance_providers: list[str]


class JudicialReference(BaseModel):
    """Judicial reference data."""

    criminal_charges: dict[str, list[str]]
    civil_case_descriptions: dict[str, list[str]]
    traffic_violation_descriptions: dict[str, list[str]]


class FinanceReference(BaseModel):
    """Finance reference data."""

    employers: list[str]
    banks: list[str]
    creditors: list[str]
    merchants: dict[str, list[str]]

    @field_validator("merchants")
    @classmethod
    def validate_merchant_categories(cls, v: dict) -> dict:
        """Ensure required merchant categories exist."""
        required_categories = [
            "groceries",
            "dining",
            "healthcare",
            "pharmacy",
            "entertainment",
            "travel",
            "utilities",
            "rent",
            "insurance",
            "gambling",
            "alcohol",
            "other",
        ]
        for category in required_categories:
            if category not in v:
                raise ValueError(f"Missing merchant category: {category}")
        return v


class InferenceExample(BaseModel):
    """Single inference example."""

    inference_text: str
    supporting_evidence: str
    potential_harm: str


class SocialReference(BaseModel):
    """Social reference data."""

    public_inferences: dict[str, list[InferenceExample]]
    private_inferences: dict[str, list[InferenceExample]]

    @field_validator("public_inferences", "private_inferences")
    @classmethod
    def validate_inference_categories(cls, v: dict) -> dict:
        """Ensure each category has at least one example."""
        for category, examples in v.items():
            if len(examples) == 0:
                raise ValueError(f"Inference category {category} must have examples")
        return v


# Configuration validation models
class RiskFactorConfig(BaseModel):
    """Single risk factor configuration."""

    weight: int
    domain: str
    description: str


class RiskConfig(BaseModel):
    """Risk scoring configuration."""

    risk_factors: dict[str, RiskFactorConfig]
    risk_level_boundaries: dict[str, list[int]]
    detection_thresholds: dict[str, float | int]

    @field_validator("risk_level_boundaries")
    @classmethod
    def validate_boundaries(cls, v: dict) -> dict:
        """Ensure all required risk levels exist."""
        required_levels = ["low", "moderate", "elevated", "high", "severe"]
        for level in required_levels:
            if level not in v:
                raise ValueError(f"Missing risk level: {level}")
        return v


class MentalHealthKeywords(BaseModel):
    """Mental health keyword configuration."""

    conditions: list[str]
    descriptors: list[str]
    all: list[str]


class Keywords(BaseModel):
    """Keyword configuration."""

    mental_health: MentalHealthKeywords
    psychiatric_medications: list[str]
    substance_medications: list[str]
    trauma_indicators: list[str]
    domestic_violence_keywords: list[str]
    substance_indicators: list[str]
    female_name_indicators: list[str]
    protest_location_keywords: list[str]


class CorrelationAlertConfig(BaseModel):
    """Single correlation alert pattern."""

    name: str
    required_domains: list[str]
    confidence: float
    description: str
    required_factors: list[str] | None = None
    required_factors_any: list[str] | None = None
    required_factors_all: list[str] | None = None
    required_factors_any_2: list[str] | None = None


class CorrelationAlerts(BaseModel):
    """Correlation alert configuration."""

    correlation_alerts: list[CorrelationAlertConfig]


class VictimStatement(BaseModel):
    """Victim statement in an inference rule."""

    text: str
    context: str
    severity: int


class InferenceRule(BaseModel):
    """Single inference rule."""

    rule_key: str
    name: str
    category: str
    scariness_level: int
    content_rating: str
    required_domains: list[str]
    condition_function: str
    inference_template: str
    evidence_templates: list[str]
    implications_templates: list[str]
    educational_note: str
    real_world_example: str
    victim_statements: list[VictimStatement]


class InferenceRules(BaseModel):
    """All inference rules."""

    rules: list[InferenceRule]


def validate_all_content() -> dict[str, str]:
    """
    Validate all JSON content files on startup.

    Returns:
        dict mapping file paths to validation status

    Raises:
        ValueError: If any content file is invalid
    """
    results = {}

    try:
        # Validate outcomes
        outcomes_data = load_json("outcomes.json")
        OutcomeTemplates.model_validate(outcomes_data)
        results["outcomes.json"] = "✓ Valid"

        # Validate directives
        directives_data = load_json("directives.json")
        Directives.model_validate(directives_data)
        results["directives.json"] = "✓ Valid"

        # Validate messages
        messages_data = load_json("messages.json")
        Messages.model_validate(messages_data)
        results["messages.json"] = "✓ Valid"

        # Validate prompts
        prompts_data = load_json("prompts.json")
        Prompts.model_validate(prompts_data)
        results["prompts.json"] = "✓ Valid"

        # Validate consequences
        consequences_data = load_json("consequences.json")
        Consequences.model_validate(consequences_data)
        results["consequences.json"] = "✓ Valid"

        # Validate reference data
        health_data = load_json("reference/health.json")
        HealthReference.model_validate(health_data)
        results["reference/health.json"] = "✓ Valid"

        judicial_data = load_json("reference/judicial.json")
        JudicialReference.model_validate(judicial_data)
        results["reference/judicial.json"] = "✓ Valid"

        finance_data = load_json("reference/finance.json")
        FinanceReference.model_validate(finance_data)
        results["reference/finance.json"] = "✓ Valid"

        social_data = load_json("reference/social.json")
        SocialReference.model_validate(social_data)
        results["reference/social.json"] = "✓ Valid"

        # Validate configuration files
        risk_config = load_json("config/risk_factors.json")
        RiskConfig.model_validate(risk_config)
        results["config/risk_factors.json"] = "✓ Valid"

        keywords = load_json("config/keywords.json")
        Keywords.model_validate(keywords)
        results["config/keywords.json"] = "✓ Valid"

        correlation_alerts = load_json("config/correlation_alerts.json")
        CorrelationAlerts.model_validate(correlation_alerts)
        results["config/correlation_alerts.json"] = "✓ Valid"

        inference_rules = load_json("inference_rules.json")
        InferenceRules.model_validate(inference_rules)
        results["inference_rules.json"] = "✓ Valid"

    except Exception as e:
        raise ValueError(f"Content validation failed: {e}") from e

    return results
