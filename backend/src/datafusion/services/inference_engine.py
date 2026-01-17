"""Inference engine for analyzing NPC data across domains."""

from dataclasses import dataclass
from typing import Callable, Optional

from datafusion.models.inference import ContentRating
from datafusion.schemas.domains import DomainType, NPCWithDomains
from datafusion.schemas.health import HealthRecordFiltered
from datafusion.schemas.inference import InferenceResult
from datafusion.services.content_loader import load_keywords, load_risk_config


@dataclass
class Rule:
    """Internal rule structure for evaluation."""

    rule_key: str
    name: str
    required_domains: set[DomainType]
    scariness_level: int
    content_rating: ContentRating
    evaluate_func: Callable[
        [NPCWithDomains], Optional[tuple[float, str, list[str], list[str]]]
    ]


class InferenceEngine:
    """
    Inference engine for analyzing NPC data and producing insights.

    Given NPC data and enabled domains, evaluates rules and returns inferences.
    Rules are currently hardcoded but will be database-driven in the future.
    """

    def __init__(self) -> None:
        """Initialize inference engine with configuration."""
        # Load configuration
        self._keywords = load_keywords()
        self._risk_config = load_risk_config()
        self.confidence_threshold = self._risk_config["detection_thresholds"]["confidence_filter"]

        self.rules: list[Rule] = [
            Rule(
                rule_key="sensitive_health_exposure",
                name="Sensitive Health Information Exposed",
                required_domains={DomainType.HEALTH},
                scariness_level=3,
                content_rating=ContentRating.SERIOUS,
                evaluate_func=self._evaluate_sensitive_health,
            ),
            Rule(
                rule_key="mental_health_stigma",
                name="Mental Health Treatment History Detected",
                required_domains={DomainType.HEALTH},
                scariness_level=4,
                content_rating=ContentRating.DISTURBING,
                evaluate_func=self._evaluate_mental_health,
            ),
            Rule(
                rule_key="stalking_vulnerability",
                name="Physical Location Vulnerability Exposed",
                required_domains={DomainType.HEALTH},
                scariness_level=5,
                content_rating=ContentRating.DYSTOPIAN,
                evaluate_func=self._evaluate_stalking_risk,
            ),
        ]

    def evaluate(
        self, npc_data: NPCWithDomains, enabled_domains: set[DomainType]
    ) -> list[InferenceResult]:
        """
        Evaluate NPC data against all applicable rules.

        Args:
            npc_data: NPC data with domain information
            enabled_domains: Set of currently enabled domains

        Returns:
            List of inference results sorted by confidence (descending)
        """
        results: list[InferenceResult] = []

        for rule in self.rules:
            # Check if required domains are available
            if not rule.required_domains.issubset(enabled_domains):
                continue

            # Evaluate the rule
            eval_result = rule.evaluate_func(npc_data)
            if eval_result is None:
                continue

            confidence, inference_text, supporting_evidence, implications = eval_result

            # Filter by confidence threshold
            if confidence < self.confidence_threshold:
                continue

            # Create inference result
            inference = InferenceResult(
                rule_key=rule.rule_key,
                rule_name=rule.name,
                confidence=confidence,
                inference_text=inference_text,
                supporting_evidence=supporting_evidence,
                implications=implications,
                domains_used=list(rule.required_domains),
                scariness_level=rule.scariness_level,
                content_rating=rule.content_rating,
            )
            results.append(inference)

        # Sort by confidence descending
        results.sort(key=lambda x: x.confidence, reverse=True)
        return results

    def get_unlockable(
        self, npc_data: NPCWithDomains, current_domains: set[DomainType]
    ) -> dict[DomainType, list[str]]:
        """
        Get inference rules that could be unlocked by enabling additional domains.

        Args:
            npc_data: NPC data with current domain information
            current_domains: Set of currently enabled domains

        Returns:
            Mapping of domain -> list of rule keys that would be unlocked
        """
        unlockable: dict[DomainType, list[str]] = {}

        # Get all unique domains from rules
        all_rule_domains = set()
        for rule in self.rules:
            all_rule_domains.update(rule.required_domains)

        # For each domain not currently enabled
        for domain in all_rule_domains:
            if domain in current_domains:
                continue

            # Check which rules would become available with this domain
            potential_rules = []
            for rule in self.rules:
                # Skip if rule is already available
                if rule.required_domains.issubset(current_domains):
                    continue

                # Check if adding this domain would unlock the rule
                if rule.required_domains.issubset(current_domains | {domain}):
                    potential_rules.append(rule.rule_key)

            if potential_rules:
                unlockable[domain] = potential_rules

        return unlockable

    # Rule evaluation functions

    def _evaluate_sensitive_health(
        self, npc_data: NPCWithDomains
    ) -> Optional[tuple[float, str, list[str], list[str]]]:
        """
        Evaluate if NPC has sensitive health information exposed.

        Returns: (confidence, inference_text, supporting_evidence, implications)
        """
        health_data = npc_data.domains.get(DomainType.HEALTH)
        if not isinstance(health_data, HealthRecordFiltered):
            return None

        sensitive_items: list[str] = []

        # Check for sensitive conditions
        for condition in health_data.conditions:
            if condition.is_sensitive:
                sensitive_items.append(
                    f"Condition: {condition.condition_name} ({condition.severity.value})"
                )

        # Check for sensitive medications
        for medication in health_data.medications:
            if medication.is_sensitive:
                sensitive_items.append(
                    f"Medication: {medication.medication_name} ({medication.dosage})"
                )

        # Check for sensitive visits
        for visit in health_data.visits:
            if visit.is_sensitive:
                sensitive_items.append(
                    f"Visit: {visit.reason} on {visit.visit_date.strftime('%Y-%m-%d')}"
                )

        if not sensitive_items:
            return None

        # Calculate confidence based on number of sensitive items
        confidence = min(0.5 + (len(sensitive_items) * 0.1), 1.0)

        inference_text = (
            f"This person has {len(sensitive_items)} sensitive medical "
            f"{'item' if len(sensitive_items) == 1 else 'items'} that could be used against them"
        )

        implications = [
            "Employment discrimination risk",
            "Social stigma and reputation damage",
            "Blackmail vulnerability",
            "Insurance discrimination",
        ]

        return (confidence, inference_text, sensitive_items, implications)

    def _evaluate_mental_health(
        self, npc_data: NPCWithDomains
    ) -> Optional[tuple[float, str, list[str], list[str]]]:
        """
        Evaluate if NPC has mental health treatment history.

        Returns: (confidence, inference_text, supporting_evidence, implications)
        """
        health_data = npc_data.domains.get(DomainType.HEALTH)
        if not isinstance(health_data, HealthRecordFiltered):
            return None

        mental_health_indicators: list[str] = []
        mental_health_keywords = self._keywords["mental_health"]["all"]

        # Check conditions
        for condition in health_data.conditions:
            condition_lower = condition.condition_name.lower()
            for keyword in mental_health_keywords:
                if keyword in condition_lower:
                    mental_health_indicators.append(
                        f"Diagnosed: {condition.condition_name} (since {condition.diagnosed_date.strftime('%Y-%m-%d')})"
                    )
                    break

        # Check medications (common psychiatric medications)
        psych_meds = self._keywords["psychiatric_medications"]
        for medication in health_data.medications:
            med_lower = medication.medication_name.lower()
            for psych_med in psych_meds:
                if psych_med in med_lower:
                    mental_health_indicators.append(
                        f"Prescribed: {medication.medication_name} ({medication.dosage})"
                    )
                    break

        # Check visits
        for visit in health_data.visits:
            reason_lower = visit.reason.lower()
            for keyword in mental_health_keywords:
                if keyword in reason_lower:
                    mental_health_indicators.append(
                        f"Visit for: {visit.reason} on {visit.visit_date.strftime('%Y-%m-%d')}"
                    )
                    break

        if not mental_health_indicators:
            return None

        # Higher confidence if multiple indicators
        confidence = min(0.6 + (len(mental_health_indicators) * 0.1), 0.95)

        inference_text = (
            f"Mental health treatment history detected with {len(mental_health_indicators)} indicators"
        )

        implications = [
            "Could affect custody battles or parental rights",
            "Security clearance denial or revocation",
            "Professional licensing issues (pilots, doctors, lawyers)",
            "Social discrimination and relationship impacts",
            "Employment termination or demotion",
        ]

        return (confidence, inference_text, mental_health_indicators, implications)

    def _evaluate_stalking_risk(
        self, npc_data: NPCWithDomains
    ) -> Optional[tuple[float, str, list[str], list[str]]]:
        """
        Evaluate if NPC is at risk for physical stalking/harassment.

        Returns: (confidence, inference_text, supporting_evidence, implications)
        """
        health_data = npc_data.domains.get(DomainType.HEALTH)
        if not isinstance(health_data, HealthRecordFiltered):
            return None

        risk_factors: list[str] = []
        confidence_score = 0.0

        # Address is always visible in basic NPC data
        npc = npc_data.npc
        risk_factors.append(
            f"Home address known: {npc.street_address}, {npc.city}, {npc.state} {npc.zip_code}"
        )
        confidence_score += 0.3

        # Check for gender indicators (simplified - uses first name patterns)
        # This is intentionally simplistic for demo purposes
        female_name_indicators = self._keywords["female_name_indicators"]
        first_name_lower = npc.first_name.lower()
        if any(name in first_name_lower for name in female_name_indicators):
            risk_factors.append(
                "Gender inferred from name (statistically higher stalking risk)"
            )
            confidence_score += 0.2

        # Check for mental health conditions that might indicate past trauma
        trauma_keywords = self._keywords["trauma_indicators"]
        for condition in health_data.conditions:
            condition_lower = condition.condition_name.lower()
            if any(keyword in condition_lower for keyword in trauma_keywords):
                risk_factors.append(
                    f"Trauma indicators found: {condition.condition_name}"
                )
                confidence_score += 0.2
                break

        # Check for visits related to domestic violence or assault
        dv_keywords = self._keywords["domestic_violence_keywords"]
        for visit in health_data.visits:
            reason_lower = visit.reason.lower()
            if any(keyword in reason_lower for keyword in dv_keywords):
                risk_factors.append(
                    f"Potential DV indicator: {visit.reason} on {visit.visit_date.strftime('%Y-%m-%d')}"
                )
                confidence_score += 0.3
                break

        # Need at least 2 risk factors
        if len(risk_factors) < 2:
            return None

        confidence = min(confidence_score, 1.0)

        inference_text = (
            "This person's home address and personal situation creates stalking vulnerability"
        )

        implications = [
            "Physical stalking and surveillance enabled",
            "Domestic abuser could locate victim",
            "Harassment campaigns targeting residence",
            "Home invasion risk for vulnerable individuals",
            "Witness intimidation in legal cases",
        ]

        return (confidence, inference_text, risk_factors, implications)
