"""Advanced cross-domain inference engine with specific condition evaluators.

This module implements the core logic for detecting privacy-invasive insights
that emerge from combining data across multiple domains. Each inference rule
has specific conditions and generates detailed, contextualized output.

All rules are loaded from inference_rules.py config file for easy maintenance.
"""

from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.finance import FinanceRecord
from datafusion.models.health import HealthRecord
from datafusion.models.judicial import JudicialRecord
from datafusion.models.location import LocationRecord
from datafusion.models.npc import NPC
from datafusion.models.social import SocialMediaRecord
from datafusion.schemas.domains import DomainType
from datafusion.services.inference_rules import INFERENCE_RULES


class InferenceContext:
    """Container for all NPC data needed for inference evaluation."""

    def __init__(
        self,
        npc: NPC,
        health: HealthRecord | None = None,
        finance: FinanceRecord | None = None,
        judicial: JudicialRecord | None = None,
        location: LocationRecord | None = None,
        social: SocialMediaRecord | None = None,
    ):
        self.npc = npc
        self.health = health
        self.finance = finance
        self.judicial = judicial
        self.location = location
        self.social = social

    def has_domains(self, required_domains: list[str]) -> bool:
        """Check if context has all required domains."""
        domain_map = {
            "health": self.health is not None,
            "finance": self.finance is not None,
            "judicial": self.judicial is not None,
            "location": self.location is not None,
            "social": self.social is not None,
        }
        return all(domain_map.get(domain, False) for domain in required_domains)


class AdvancedInferenceEngine:
    """
    Engine for evaluating cross-domain inference rules.

    Each rule has a condition function that returns either:
    - None if the condition is not met
    - A dict of variables for template rendering if the condition is met
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_inferences(
        self, npc_id: UUID, enabled_domains: list[DomainType]
    ) -> list[dict[str, Any]]:
        """
        Generate all applicable inferences for an NPC given enabled domains.

        Returns list of inference results with rendered templates.
        """
        # Load NPC data
        npc = await self._load_npc(npc_id)
        if not npc:
            return []

        # Load domain data based on what's enabled
        context = await self._build_context(npc, enabled_domains)

        # Load all active inference rules from config
        rules = self._load_active_rules()

        # Evaluate each rule
        results = []
        for rule in rules:
            # Check if we have required domains
            required_domain_values = [d.value for d in rule["required_domains"]]
            if not context.has_domains(required_domain_values):
                continue

            # Evaluate condition
            condition_func = getattr(self, rule["condition_function"], None)
            if not condition_func:
                continue

            variables = condition_func(context)
            if variables is None:
                continue

            # Render templates with variables
            result = self._render_inference(rule, variables)
            results.append(result)

        # Sort by scariness level (highest first)
        results.sort(key=lambda x: x["scariness_level"], reverse=True)

        return results

    async def _load_npc(self, npc_id: UUID) -> NPC | None:
        """Load NPC from database."""
        query = select(NPC).where(NPC.id == npc_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _build_context(self, npc: NPC, enabled_domains: list[DomainType]) -> InferenceContext:
        """Build inference context by loading all enabled domain data."""
        health = None
        finance = None
        judicial = None
        location = None
        social = None

        if DomainType.HEALTH in enabled_domains:
            query = select(HealthRecord).where(HealthRecord.npc_id == npc.id)
            result = await self.db.execute(query)
            health = result.scalar_one_or_none()

        if DomainType.FINANCE in enabled_domains:
            query = select(FinanceRecord).where(FinanceRecord.npc_id == npc.id)
            result = await self.db.execute(query)
            finance = result.scalar_one_or_none()

        if DomainType.JUDICIAL in enabled_domains:
            query = select(JudicialRecord).where(JudicialRecord.npc_id == npc.id)
            result = await self.db.execute(query)
            judicial = result.scalar_one_or_none()

        if DomainType.LOCATION in enabled_domains:
            query = select(LocationRecord).where(LocationRecord.npc_id == npc.id)
            result = await self.db.execute(query)
            location = result.scalar_one_or_none()

        if DomainType.SOCIAL in enabled_domains:
            query = select(SocialMediaRecord).where(SocialMediaRecord.npc_id == npc.id)
            result = await self.db.execute(query)
            social = result.scalar_one_or_none()

        return InferenceContext(npc, health, finance, judicial, location, social)

    def _load_active_rules(self) -> list[dict[str, Any]]:
        """Load all active inference rules from config."""
        return INFERENCE_RULES

    def _render_inference(self, rule: dict[str, Any], variables: dict[str, Any]) -> dict[str, Any]:
        """Render inference templates with provided variables."""
        return {
            "rule_key": rule["rule_key"],
            "rule_name": rule["name"],
            "category": rule["category"].value,  # Enum to string
            "scariness_level": rule["scariness_level"],
            "content_rating": rule["content_rating"].value,  # Enum to string
            "confidence": variables.get("confidence", 0.95),  # Default high confidence
            "inference_text": rule["inference_template"].format(**variables),
            "supporting_evidence": [
                template.format(**variables) for template in rule["evidence_templates"]
            ],
            "implications": [
                template.format(**variables) for template in rule["implications_templates"]
            ],
            "domains_used": [d.value for d in rule["required_domains"]],  # Enums to strings
            "educational_note": rule.get("educational_note"),
            "real_world_example": rule.get("real_world_example"),
            "victim_statements": rule.get("victim_statements", []),
        }

    # ==================== CONDITION EVALUATOR FUNCTIONS ====================
    # Each function takes InferenceContext and returns variables dict or None

    def check_financial_desperation(self, context: InferenceContext) -> dict[str, Any] | None:
        """
        Detect financial desperation from medical debt + chronic condition + financial stress.

        Scariness: 4 - Vulnerability exploitation
        """
        if not context.finance or not context.health:
            return None

        # Check for medical debt
        medical_debt = sum(
            float(debt.current_balance)
            for debt in context.finance.debts
            if debt.debt_type == "MEDICAL"
        )

        if medical_debt < 20000:  # Threshold
            return None

        # Check for chronic conditions
        chronic_conditions = [c for c in context.health.conditions if c.is_chronic]
        if not chronic_conditions:
            return None

        # Check for financial stress indicators
        if context.finance.credit_score > 600:  # Not desperate enough
            return None

        # Check for payday loans or delinquent debts
        has_payday_loans = any(d.debt_type == "PAYDAY_LOAN" for d in context.finance.debts)
        has_delinquent = any(d.is_delinquent for d in context.finance.debts)

        if not (has_payday_loans or has_delinquent):
            return None

        # Calculate severity
        condition_names = ", ".join(c.condition_name for c in chronic_conditions[:2])
        debt_count = len([d for d in context.finance.debts if d.is_delinquent])

        return {
            "medical_debt": f"${medical_debt:,.0f}",
            "condition": condition_names,
            "credit_score": context.finance.credit_score,
            "debt_count": debt_count,
            "employment": context.finance.employment_status.replace("_", " ").lower(),
        }

    def check_pregnancy_tracking(self, context: InferenceContext) -> dict[str, Any] | None:
        """
        Detect pregnancy or pregnancy termination from medical + financial + location data.

        Scariness: 5 - Reproductive privacy
        """
        if not context.health or not context.finance or not context.location:
            return None

        # Check for pregnancy-related medical visits
        pregnancy_visits = [
            v for v in context.health.visits
            if any(term in v.reason.lower() for term in ["pregn", "ob", "obstetr", "prenatal"])
        ]

        if not pregnancy_visits:
            return None

        # Check for pregnancy-related medications
        pregnancy_meds = [
            m for m in context.health.medications
            if any(term in m.medication_name.lower() for term in ["prenatal", "folic"])
        ]

        # Check for abortion clinic visits in location data
        abortion_clinic = [
            loc for loc in context.location.inferred_locations
            if "clinic" in loc.location_name.lower() and loc.is_sensitive
        ]

        # Check for out-of-state travel
        out_of_state = [
            loc for loc in context.location.inferred_locations
            if loc.state != context.npc.state
        ]

        if abortion_clinic and out_of_state:
            # Likely abortion trip
            visit_count = len(pregnancy_visits)
            return {
                "visit_count": visit_count,
                "clinic_location": f"{abortion_clinic[0].city}, {abortion_clinic[0].state}",
                "home_state": context.npc.state,
                "has_medications": "yes" if pregnancy_meds else "no",
            }

        return None

    def check_depression_suicide_risk(self, context: InferenceContext) -> dict[str, Any] | None:
        """
        Detect severe depression with suicide risk indicators.

        Scariness: 5 - Mental health + safety concern
        """
        if not context.health or not context.social or not context.finance:
            return None

        # Check for depression medication
        depression_meds = [
            m for m in context.health.medications
            if any(term in m.medication_name.lower() for term in ["sertraline", "prozac", "zoloft", "lexapro", "depression", "antidepressant"])
        ]

        if not depression_meds:
            return None

        # Check for therapy visits
        therapy_visits = [
            v for v in context.health.visits
            if any(term in v.reason.lower() for term in ["therapy", "mental", "psych", "counseling"])
        ]

        # Check social media for concerning posts
        concerning_posts = []
        if context.social.private_inferences:
            concerning_posts = [
                inf for inf in context.social.private_inferences
                if any(term in inf.inference_text.lower() for term in ["giving up", "hopeless", "burden", "end it", "no point"])
            ]

        # Check financial stress (giving away possessions)
        if context.finance.transactions:
            selling_possessions = [
                t for t in context.finance.transactions
                if t.category == "PAWN_SHOP" or "pawn" in t.merchant_name.lower()
            ]
        else:
            selling_possessions = []

        # Risk calculation
        risk_factors = len(therapy_visits) > 3, bool(concerning_posts), bool(selling_possessions)
        risk_count = sum(risk_factors)

        if risk_count < 2:  # Need multiple indicators
            return None

        return {
            "medication": depression_meds[0].medication_name,
            "therapy_frequency": f"{len(therapy_visits)} sessions",
            "social_indicators": len(concerning_posts),
            "financial_indicators": "selling possessions" if selling_possessions else "cancelling subscriptions",
            "risk_level": "elevated" if risk_count == 2 else "severe",
        }

    def check_affair_detection(self, context: InferenceContext) -> dict[str, Any] | None:
        """
        Detect extramarital affair from location + finance patterns.

        Scariness: 4 - Relationship surveillance
        """
        if not context.location or not context.finance:
            return None

        # Check for repeated visits to same non-work/home location
        location_frequencies = {}
        for loc in context.location.inferred_locations:
            if loc.location_type not in ["HOME", "WORKPLACE"]:
                key = (loc.street_address, loc.city)
                location_frequencies[key] = location_frequencies.get(key, 0) + 1

        frequent_location = max(location_frequencies.items(), key=lambda x: x[1], default=(None, 0))
        if frequent_location[1] < 5:  # Not frequent enough
            return None

        # Check for hotel charges
        hotel_transactions = [
            t for t in context.finance.transactions
            if any(term in t.merchant_name.lower() for term in ["hotel", "inn", "motel"])
        ]

        if not hotel_transactions:
            return None

        # Check for restaurant/gift charges
        date_expenses = [
            t for t in context.finance.transactions
            if t.category in ["RESTAURANT", "GIFTS", "FLOWERS"]
        ]

        if len(date_expenses) < 3:
            return None

        address, city = frequent_location[0]
        return {
            "location_address": address,
            "location_city": city,
            "visit_frequency": frequent_location[1],
            "hotel_count": len(hotel_transactions),
            "date_expense_count": len(date_expenses),
            "total_spent": sum(float(t.amount) for t in hotel_transactions + date_expenses),
        }

    def check_domestic_violence(self, context: InferenceContext) -> dict[str, Any] | None:
        """
        Detect domestic violence indicators from health + judicial + location + social.

        Scariness: 5 - Safety concern
        """
        if not context.health or not context.location:
            return None

        # Check for suspicious injury patterns
        injury_visits = [
            v for v in context.health.visits
            if any(term in v.reason.lower() for term in ["fall", "injury", "bruise", "fracture", "trauma"])
        ]

        if len(injury_visits) < 2:  # Need pattern
            return None

        # Check for increasingly isolated location patterns
        social_locations = [
            loc for loc in context.location.inferred_locations
            if loc.location_type in ["FRIEND", "FAMILY", "SOCIAL"]
        ]

        # Check if partner has restraining order history (from judicial)
        partner_reckless = False
        if context.judicial and context.judicial.has_civil_cases:
            partner_reckless = any(
                case.case_type == "RESTRAINING_ORDER"
                for case in context.judicial.civil_cases
            )

        # Check social media isolation
        reduced_social = False
        if context.social and context.social.post_frequency:
            reduced_social = context.social.post_frequency in ["Rarely", "Never"]

        indicators = [
            len(injury_visits) >= 2,
            len(social_locations) < 2,
            partner_reckless,
            reduced_social,
        ]

        if sum(indicators) < 3:  # Need multiple indicators
            return None

        return {
            "injury_count": len(injury_visits),
            "injury_types": ", ".join(v.reason for v in injury_visits[:2]),
            "isolation_level": "severe" if len(social_locations) == 0 else "moderate",
            "social_activity": "declining" if reduced_social else "limited",
        }

    def check_job_loss_prediction(self, context: InferenceContext) -> dict[str, Any] | None:
        """
        Predict job loss from location + finance + social patterns.

        Scariness: 3 - Predictive profiling
        """
        if not context.location or not context.finance:
            return None

        # Check if stopped going to workplace
        workplace = [loc for loc in context.location.inferred_locations if loc.location_type == "WORKPLACE"]

        if not workplace:  # No workplace data
            return None

        # Check for resume service charges or LinkedIn activity (in transactions)
        career_prep = [
            t for t in context.finance.transactions
            if any(term in t.merchant_name.lower() for term in ["resume", "linkedin", "career", "indeed"])
        ]

        if not career_prep:
            return None

        # Check for financial stress indicators
        reduced_income = context.finance.annual_income < Decimal("40000")  # Below median
        has_savings_withdrawal = any(
            t.amount > Decimal("1000") and t.category == "TRANSFER"
            for t in context.finance.transactions
        )

        if not (reduced_income or has_savings_withdrawal):
            return None

        return {
            "workplace_name": workplace[0].location_name if workplace else "Unknown",
            "prep_services": len(career_prep),
            "financial_status": "stressed" if has_savings_withdrawal else "planning",
            "timeframe": "imminent" if has_savings_withdrawal else "preparing",
        }

    def check_gambling_addiction(self, context: InferenceContext) -> dict[str, Any] | None:
        """
        Detect gambling addiction from finance + location + social patterns.

        Scariness: 3 - Financial exploitation
        """
        if not context.finance or not context.location:
            return None

        # Check for casino/gambling transactions
        gambling_transactions = [
            t for t in context.finance.transactions
            if any(term in t.merchant_name.lower() for term in ["casino", "gambling", "poker", "betting", "lottery"])
        ]

        if len(gambling_transactions) < 5:  # Need pattern
            return None

        # Check for casino location visits
        casino_visits = [
            loc for loc in context.location.inferred_locations
            if "casino" in loc.location_name.lower()
        ]

        # Check for multiple loan sources (chasing losses)
        if len(context.finance.debts) < 3:
            return None

        # Calculate total gambling spend
        total_gambled = sum(float(t.amount) for t in gambling_transactions)
        total_debt = sum(float(d.current_balance) for d in context.finance.debts)

        # Check social media for distorted perception
        gambling_posts = 0
        if context.social and context.social.public_inferences:
            gambling_posts = sum(
                1 for inf in context.social.public_inferences
                if any(term in inf.inference_text.lower() for term in ["lucky", "big win", "jackpot"])
            )

        return {
            "transaction_count": len(gambling_transactions),
            "total_gambled": f"${total_gambled:,.0f}",
            "casino_visits": len(casino_visits),
            "debt_sources": len(context.finance.debts),
            "total_debt": f"${total_debt:,.0f}",
            "social_distortion": "yes" if gambling_posts > 0 else "no",
        }

    def check_identity_reconstruction(self, context: InferenceContext) -> dict[str, Any] | None:
        """
        Complete identity profile when all 5 domains are available.

        Scariness: 5 - Identity reconstruction
        """
        # Requires ALL domains
        if not all([context.health, context.finance, context.judicial, context.location, context.social]):
            return None

        # This is triggered simply by having all domains - the threat is the completeness
        return {
            "medical_records": len(context.health.conditions) + len(context.health.medications),
            "financial_accounts": len(context.finance.bank_accounts),
            "legal_records": (
                len(context.judicial.criminal_records) +
                len(context.judicial.civil_cases) +
                len(context.judicial.traffic_violations)
            ),
            "tracked_locations": len(context.location.inferred_locations),
            "social_inferences": len(context.social.public_inferences) + len(context.social.private_inferences),
            "completeness": "100%",
        }

    def check_elderly_cognitive_decline(self, context: InferenceContext) -> dict[str, Any] | None:
        """
        Detect elderly person with cognitive decline vulnerable to scams.

        Scariness: 4 - Financial exploitation
        """
        if not context.health or not context.finance:
            return None

        # Check age (65+)
        from datetime import date
        age = (date.today() - context.npc.date_of_birth).days // 365
        if age < 65:
            return None

        # Check for cognitive decline medications
        cognitive_meds = [
            m for m in context.health.medications
            if any(term in m.medication_name.lower() for term in ["donepezil", "memantine", "alzheimer", "dementia", "memory"])
        ]

        if not cognitive_meds:
            return None

        # Check for unusual spending patterns (potential scams)
        suspicious_transactions = [
            t for t in context.finance.transactions
            if any(term in t.merchant_name.lower() for term in ["wire transfer", "gift card", "unknown", "foreign"])
        ]

        if len(suspicious_transactions) < 2:
            return None

        total_suspicious = sum(float(t.amount) for t in suspicious_transactions)

        return {
            "age": age,
            "medication": cognitive_meds[0].medication_name,
            "suspicious_count": len(suspicious_transactions),
            "total_suspicious": f"${total_suspicious:,.0f}",
            "vulnerability": "high" if total_suspicious > 5000 else "moderate",
        }

    def check_unionization_activity(self, context: InferenceContext) -> dict[str, Any] | None:
        """
        Detect union organizing activity from location + social + finance.

        Scariness: 4 - Workplace discrimination
        """
        if not context.location or not context.social:
            return None

        # Check for meetings at union locations
        union_locations = [
            loc for loc in context.location.inferred_locations
            if any(term in loc.location_name.lower() for term in ["union", "labor", "worker"])
        ]

        if not union_locations:
            return None

        # Check for social connections with union members (in social inferences)
        union_connections = 0
        if context.social.public_inferences:
            union_connections = sum(
                1 for inf in context.social.public_inferences
                if any(term in inf.inference_text.lower() for term in ["union", "organize", "labor"])
            )

        # Check for labor law book purchases
        labor_research = []
        if context.finance:
            labor_research = [
                t for t in context.finance.transactions
                if any(term in t.merchant_name.lower() for term in ["book", "amazon"]) and
                any(term in t.category for term in ["BOOKS", "EDUCATION"])
            ]

        if not (union_connections > 0 or len(labor_research) > 0):
            return None

        return {
            "meeting_count": len(union_locations),
            "union_location": union_locations[0].location_name,
            "social_connections": union_connections,
            "research_activity": "yes" if labor_research else "no",
            "stage": "early organizing" if union_connections < 5 else "active campaign",
        }


async def generate_advanced_inferences(
    db: AsyncSession, npc_id: UUID, enabled_domains: list[DomainType]
) -> list[dict[str, Any]]:
    """
    Convenience function to generate inferences using the advanced engine.

    This is the main entry point for the inference system.
    """
    engine = AdvancedInferenceEngine(db)
    return await engine.generate_inferences(npc_id, enabled_domains)
