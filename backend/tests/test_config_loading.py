"""Tests for configuration file loading and validation."""

from datafusion.services.content_loader import (
    load_correlation_alerts,
    load_inference_rules,
    load_keywords,
    load_risk_config,
)
from datafusion.services.content_validator import (
    CorrelationAlerts,
    InferenceRules,
    Keywords,
    RiskConfig,
)


def test_load_risk_config():
    """Test risk factor configuration loads and validates."""
    config = load_risk_config()

    # Check structure
    assert "risk_factors" in config
    assert "risk_level_boundaries" in config
    assert "detection_thresholds" in config

    # Validate with Pydantic
    RiskConfig.model_validate(config)

    # Check that we have all 15 risk factors
    assert len(config["risk_factors"]) == 14  # We have 14 risk factors

    # Check specific values
    assert config["risk_factors"]["mental_health_treatment"]["weight"] == 15
    assert config["risk_factors"]["mental_health_treatment"]["domain"] == "health"

    # Check risk level boundaries
    assert config["risk_level_boundaries"]["low"] == [0, 20]
    assert config["risk_level_boundaries"]["moderate"] == [21, 40]
    assert config["risk_level_boundaries"]["elevated"] == [41, 60]
    assert config["risk_level_boundaries"]["high"] == [61, 80]
    assert config["risk_level_boundaries"]["severe"] == [81, 100]

    # Check detection thresholds
    assert config["detection_thresholds"]["debt_to_income_ratio"] == 0.5
    assert config["detection_thresholds"]["transaction_multiplier"] == 5
    assert config["detection_thresholds"]["cash_ratio"] == 0.3


def test_load_keywords():
    """Test keyword configuration loads and validates."""
    keywords = load_keywords()

    # Validate with Pydantic
    Keywords.model_validate(keywords)

    # Check mental health keywords structure
    assert "mental_health" in keywords
    assert "conditions" in keywords["mental_health"]
    assert "descriptors" in keywords["mental_health"]
    assert "all" in keywords["mental_health"]

    # Verify no duplication - conditions + descriptors should equal all
    conditions = set(keywords["mental_health"]["conditions"])
    descriptors = set(keywords["mental_health"]["descriptors"])
    all_keywords = set(keywords["mental_health"]["all"])

    assert all_keywords == conditions.union(descriptors)

    # Check that key keywords are present
    assert "depression" in keywords["mental_health"]["all"]
    assert "anxiety" in keywords["mental_health"]["all"]
    assert "mental" in keywords["mental_health"]["all"]

    # Check other keyword categories
    assert "psychiatric_medications" in keywords
    assert len(keywords["psychiatric_medications"]) > 0
    assert "sertraline" in keywords["psychiatric_medications"]

    assert "trauma_indicators" in keywords
    assert "ptsd" in keywords["trauma_indicators"]

    assert "domestic_violence_keywords" in keywords
    assert "domestic" in keywords["domestic_violence_keywords"]


def test_load_correlation_alerts():
    """Test correlation alerts load and validate."""
    alerts = load_correlation_alerts()

    # Validate with Pydantic
    CorrelationAlerts.model_validate(alerts)

    # Check we have 4 correlation alerts
    assert len(alerts["correlation_alerts"]) == 4

    # Check specific alerts exist
    alert_names = [alert["name"] for alert in alerts["correlation_alerts"]]
    assert "recidivism_risk" in alert_names
    assert "desperation_indicator" in alert_names
    assert "organizing_activity" in alert_names
    assert "recruitment_vulnerability" in alert_names

    # Check structure of first alert
    first_alert = alerts["correlation_alerts"][0]
    assert "name" in first_alert
    assert "required_domains" in first_alert
    assert "confidence" in first_alert
    assert "description" in first_alert

    # Check confidence values are reasonable (between 0 and 1)
    for alert in alerts["correlation_alerts"]:
        assert 0 < alert["confidence"] <= 1


def test_load_inference_rules():
    """Test inference rules load and validate."""
    rules = load_inference_rules()

    # Validate with Pydantic
    InferenceRules.model_validate(rules)

    # Check we have 10 rules in the JSON
    assert len(rules["rules"]) == 10

    # Check that each rule has required fields
    required_fields = [
        "rule_key",
        "name",
        "category",
        "scariness_level",
        "content_rating",
        "required_domains",
        "condition_function",
        "inference_template",
        "evidence_templates",
        "implications_templates",
        "educational_note",
        "real_world_example",
        "victim_statements",
    ]

    for rule in rules["rules"]:
        for field in required_fields:
            assert field in rule, f"Rule {rule['rule_key']} missing field {field}"

    # Check specific rule exists
    rule_keys = [rule["rule_key"] for rule in rules["rules"]]
    assert "financial_desperation" in rule_keys
    assert "pregnancy_tracking" in rule_keys
    assert "depression_suicide_risk" in rule_keys

    # Check scariness levels are valid (1-5)
    for rule in rules["rules"]:
        assert 1 <= rule["scariness_level"] <= 5

    # Check content ratings are valid
    valid_ratings = ["serious", "disturbing", "dystopian"]
    for rule in rules["rules"]:
        assert rule["content_rating"] in valid_ratings


def test_risk_factors_have_valid_domains():
    """Test that all risk factors reference valid domains."""
    config = load_risk_config()
    valid_domains = ["health", "finance", "judicial", "location", "social"]

    for factor_key, factor_data in config["risk_factors"].items():
        assert factor_data["domain"] in valid_domains, f"Invalid domain for {factor_key}"


def test_correlation_alerts_reference_valid_factors():
    """Test that correlation alerts reference valid risk factors."""
    config = load_risk_config()
    alerts = load_correlation_alerts()

    valid_factor_keys = set(config["risk_factors"].keys())

    for alert in alerts["correlation_alerts"]:
        # Check required_factors if present
        if "required_factors" in alert and alert["required_factors"]:
            for factor in alert["required_factors"]:
                assert factor in valid_factor_keys, (
                    f"Alert {alert['name']} references invalid factor: {factor}"
                )

        # Check required_factors_any if present
        if "required_factors_any" in alert and alert["required_factors_any"]:
            for factor in alert["required_factors_any"]:
                assert factor in valid_factor_keys, (
                    f"Alert {alert['name']} references invalid factor: {factor}"
                )

        # Check required_factors_all if present
        if "required_factors_all" in alert and alert["required_factors_all"]:
            for factor in alert["required_factors_all"]:
                assert factor in valid_factor_keys, (
                    f"Alert {alert['name']} references invalid factor: {factor}"
                )


def test_risk_level_boundaries_are_sequential():
    """Test that risk level boundaries don't overlap and are sequential."""
    config = load_risk_config()
    boundaries = config["risk_level_boundaries"]

    # Check that each boundary's max is adjacent to the next boundary's min
    assert boundaries["low"][1] + 1 == boundaries["moderate"][0]
    assert boundaries["moderate"][1] + 1 == boundaries["elevated"][0]
    assert boundaries["elevated"][1] + 1 == boundaries["high"][0]
    assert boundaries["high"][1] + 1 == boundaries["severe"][0]


def test_all_configs_validated_on_startup():
    """Test that validate_all_content includes new config files."""
    from datafusion.services.content_validator import validate_all_content

    results = validate_all_content()

    # Check that our new config files are validated
    assert "config/risk_factors.json" in results
    assert "config/keywords.json" in results
    assert "config/correlation_alerts.json" in results
    assert "inference_rules.json" in results

    # Check they all passed validation
    assert results["config/risk_factors.json"] == "✓ Valid"
    assert results["config/keywords.json"] == "✓ Valid"
    assert results["config/correlation_alerts.json"] == "✓ Valid"
    assert results["inference_rules.json"] == "✓ Valid"
