"""Tests for content validation."""

import pytest

from datafusion.services.content_validator import (
    Consequences,
    Directives,
    FinanceReference,
    HealthReference,
    JudicialReference,
    Messages,
    OutcomeTemplates,
    Prompts,
    SocialReference,
    validate_all_content,
)
from datafusion.services.content_loader import load_json


class TestContentValidation:
    """Test content validation with Pydantic models."""

    def test_validate_all_content(self):
        """Test that all content files pass validation."""
        results = validate_all_content()

        # All 9 files should validate successfully
        assert len(results) == 9
        assert all("✓ Valid" in status for status in results.values())

    def test_outcomes_validation(self):
        """Test outcomes.json validation."""
        data = load_json("outcomes.json")
        model = OutcomeTemplates.model_validate(data)

        # Check required flag types exist
        assert "monitoring" in model.outcome_templates
        assert "restriction" in model.outcome_templates
        assert "intervention" in model.outcome_templates
        assert "detention" in model.outcome_templates

        # Check timepoints for monitoring
        monitoring = model.outcome_templates["monitoring"]
        assert "immediate" in monitoring
        assert "1_month" in monitoring
        assert "6_months" in monitoring
        assert "1_year" in monitoring

    def test_directives_validation(self):
        """Test directives.json validation."""
        data = load_json("directives.json")
        model = Directives.model_validate(data)

        # Should have 6 directives
        assert len(model.directives) == 6

        # Week numbers should be sequential
        week_numbers = [d.week_number for d in model.directives]
        assert week_numbers == [1, 2, 3, 4, 5, 6]

    def test_messages_validation(self):
        """Test messages.json validation."""
        data = load_json("messages.json")
        model = Messages.model_validate(data)

        # Check message categories exist
        assert len(model.mundane_messages) >= 5
        assert len(model.venting_messages) >= 5
        assert len(model.concerning_keywords) > 0

        # Check scenario messages structure
        assert "jessica" in model.scenario_messages
        assert "david" in model.scenario_messages
        assert "senator" in model.scenario_messages

    def test_prompts_validation(self):
        """Test prompts.json validation."""
        data = load_json("prompts.json")
        model = Prompts.model_validate(data)

        # Check required prompts exist
        assert "intro" in model.rogue_employee_prompts
        assert "conclusion" in model.rogue_employee_prompts

    def test_consequences_validation(self):
        """Test consequences.json validation."""
        data = load_json("consequences.json")
        model = Consequences.model_validate(data)

        # Check that consequence templates exist
        assert len(model.consequence_templates) > 0

        # Each action should have at least immediate timepoint
        for action_name, timepoints in model.consequence_templates.items():
            assert "immediate" in timepoints, f"{action_name} missing immediate timepoint"

    def test_health_reference_validation(self):
        """Test reference/health.json validation."""
        data = load_json("reference/health.json")
        model = HealthReference.model_validate(data)

        # Check required fields exist
        assert len(model.common_conditions) > 0
        assert len(model.sensitive_conditions) > 0
        assert len(model.condition_medications) > 0

    def test_judicial_reference_validation(self):
        """Test reference/judicial.json validation."""
        data = load_json("reference/judicial.json")
        model = JudicialReference.model_validate(data)

        # Check charge categories exist
        assert "VIOLENT" in model.criminal_charges
        assert "PROPERTY" in model.criminal_charges
        assert "DRUG" in model.criminal_charges

        # Check civil case types exist
        assert len(model.civil_case_descriptions) > 0

    def test_finance_reference_validation(self):
        """Test reference/finance.json validation."""
        data = load_json("reference/finance.json")
        model = FinanceReference.model_validate(data)

        # Check required fields exist
        assert len(model.employers) > 0
        assert len(model.banks) > 0
        assert len(model.merchants) > 0

        # Check required merchant categories
        assert "groceries" in model.merchants
        assert "dining" in model.merchants
        assert "healthcare" in model.merchants

    def test_social_reference_validation(self):
        """Test reference/social.json validation."""
        data = load_json("reference/social.json")
        model = SocialReference.model_validate(data)

        # Check inference categories exist
        assert len(model.public_inferences) > 0
        assert len(model.private_inferences) > 0

        # Check structure of inference examples
        for category, examples in model.public_inferences.items():
            assert len(examples) > 0, f"Category {category} has no examples"
            for example in examples:
                assert example.inference_text
                assert example.supporting_evidence
                assert example.potential_harm
