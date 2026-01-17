"""
Risk Scoring Service for System Mode.

The algorithmic heart of surveillance - reduces citizens to risk scores
by analyzing their data across all domains.

Educational purpose: Shows how real surveillance systems work and why
they're problematic (bias, lack of transparency, chilling effects).
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datafusion.models.finance import FinanceRecord, Transaction, TransactionCategory
from datafusion.models.health import HealthRecord
from datafusion.models.judicial import JudicialRecord
from datafusion.models.location import LocationRecord
from datafusion.models.npc import NPC
from datafusion.models.social import SocialMediaRecord
from datafusion.schemas.domains import DomainType
from datafusion.schemas.risk import (
    ActionType,
    ActionUrgency,
    ContributingFactor,
    CorrelationAlert,
    RecommendedAction,
    RiskAssessment,
    RiskLevel,
)
from datafusion.services.content_loader import (
    load_correlation_alerts,
    load_keywords,
    load_risk_config,
)


class RiskScorer:
    """
    Calculates risk scores for citizens based on invasive data analysis.

    This is intentionally dystopian to demonstrate the dangers of
    mass surveillance and algorithmic decision-making.
    """

    # Cache time-to-live (1 hour)
    CACHE_TTL_HOURS = 1

    def __init__(self, db: AsyncSession):
        """Initialize with database session and load configuration."""
        self.db = db

        # Load configuration from JSON files
        self._risk_config = load_risk_config()
        self._keywords = load_keywords()
        self._correlation_config = load_correlation_alerts()

        # Parse risk factors into usable format with domain enum
        self.RISK_FACTORS = {}
        for factor_key, factor_data in self._risk_config["risk_factors"].items():
            domain_str = factor_data["domain"]
            # Map domain string to DomainType enum
            domain_map = {
                "health": DomainType.HEALTH,
                "finance": DomainType.FINANCE,
                "judicial": DomainType.JUDICIAL,
                "location": DomainType.LOCATION,
                "social": DomainType.SOCIAL,
            }
            self.RISK_FACTORS[factor_key] = {
                "weight": factor_data["weight"],
                "domain": domain_map[domain_str],
                "description": factor_data["description"],
            }

        # Store config data for easy access
        self.risk_boundaries = self._risk_config["risk_level_boundaries"]
        self.thresholds = self._risk_config["detection_thresholds"]

    async def calculate_risk_score(self, npc_id: UUID) -> RiskAssessment:
        """
        Calculate comprehensive risk score for a citizen.

        Uses cached values when available and fresh (within CACHE_TTL_HOURS).
        Recalculates and updates cache when stale or missing.

        Args:
            npc_id: UUID of the citizen to assess

        Returns:
            RiskAssessment with score, factors, alerts, and recommendations
        """
        # Verify NPC exists and get cached values
        npc_result = await self.db.execute(select(NPC).where(NPC.id == npc_id))
        npc = npc_result.scalar_one_or_none()
        if not npc:
            raise ValueError(f"NPC {npc_id} not found")

        # Check if cache is valid (exists and not stale)
        cache_valid = False
        if npc.cached_risk_score is not None and npc.risk_score_updated_at is not None:
            now = datetime.now(timezone.utc)
            cache_age = now - npc.risk_score_updated_at.replace(tzinfo=timezone.utc)
            cache_valid = cache_age < timedelta(hours=self.CACHE_TTL_HOURS)

        # If cache is valid, use cached score but still recalculate full assessment
        # (factors, alerts, recommendations are lightweight compared to score calculation)
        if cache_valid:
            # Use cached score
            risk_score = npc.cached_risk_score
            # Still need factors for full assessment
            contributing_factors = await self.get_contributing_factors(npc_id)
        else:
            # Cache miss or stale - recalculate everything
            contributing_factors = await self.get_contributing_factors(npc_id)

            # Calculate total risk score (capped at 100)
            risk_score = min(sum(f.weight for f in contributing_factors), 100)

            # Update cache in database
            npc.cached_risk_score = risk_score
            npc.risk_score_updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(npc)

        # Determine risk level
        risk_level = self._classify_risk_level(risk_score)

        # Generate correlation alerts
        correlation_alerts = await self.generate_correlation_alerts(npc_id, contributing_factors)

        # Generate recommended actions
        recommended_actions = self._generate_recommendations(risk_score, contributing_factors)

        return RiskAssessment(
            npc_id=npc_id,
            risk_score=risk_score,
            risk_level=risk_level,
            contributing_factors=contributing_factors,
            correlation_alerts=correlation_alerts,
            recommended_actions=recommended_actions,
            last_updated=npc.risk_score_updated_at or datetime.now(timezone.utc),
        )

    async def get_contributing_factors(self, npc_id: UUID) -> list[ContributingFactor]:
        """
        Analyze NPC data to identify which risk factors apply.

        Args:
            npc_id: UUID of the citizen to analyze

        Returns:
            List of contributing factors with evidence
        """
        factors: list[ContributingFactor] = []

        # Check health factors
        health_factors = await self._check_health_factors(npc_id)
        factors.extend(health_factors)

        # Check finance factors
        finance_factors = await self._check_finance_factors(npc_id)
        factors.extend(finance_factors)

        # Check judicial factors
        judicial_factors = await self._check_judicial_factors(npc_id)
        factors.extend(judicial_factors)

        # Check location factors
        location_factors = await self._check_location_factors(npc_id)
        factors.extend(location_factors)

        # Check social factors
        social_factors = await self._check_social_factors(npc_id)
        factors.extend(social_factors)

        return factors

    async def generate_correlation_alerts(
        self, npc_id: UUID, contributing_factors: list[ContributingFactor]
    ) -> list[CorrelationAlert]:
        """
        Detect cross-domain patterns that suggest concerning behavior.

        This is the most dystopian part - combining unrelated data
        to make inferences about intent or future behavior.

        Args:
            npc_id: UUID of the citizen
            contributing_factors: Already identified risk factors

        Returns:
            List of correlation alerts
        """
        alerts: list[CorrelationAlert] = []

        # Get domains and factors present
        domains_present = {f.domain_source for f in contributing_factors}
        factor_keys_present = {f.factor_key for f in contributing_factors}

        # Map domain strings to DomainType enums
        domain_map = {
            "health": DomainType.HEALTH,
            "finance": DomainType.FINANCE,
            "judicial": DomainType.JUDICIAL,
            "location": DomainType.LOCATION,
            "social": DomainType.SOCIAL,
        }

        # Process each correlation alert from config
        for alert_config in self._correlation_config["correlation_alerts"]:
            # Check if required domains are present
            required_domains = [domain_map[d] for d in alert_config["required_domains"]]
            if not all(domain in domains_present for domain in required_domains):
                continue

            # Check if required factors are present
            factors_match = False

            # Simple case: required_factors list (all must be present)
            if "required_factors" in alert_config and alert_config["required_factors"]:
                if all(f in factor_keys_present for f in alert_config["required_factors"]):
                    factors_match = True

            # Complex case: required_factors_any + required_factors_all
            elif "required_factors_any" in alert_config or "required_factors_all" in alert_config:
                match_conditions = []

                if "required_factors_any" in alert_config and alert_config["required_factors_any"]:
                    any_match = any(f in factor_keys_present for f in alert_config["required_factors_any"])
                    match_conditions.append(any_match)

                if "required_factors_all" in alert_config and alert_config["required_factors_all"]:
                    all_match = all(f in factor_keys_present for f in alert_config["required_factors_all"])
                    match_conditions.append(all_match)

                if "required_factors_any_2" in alert_config and alert_config["required_factors_any_2"]:
                    any_match_2 = any(f in factor_keys_present for f in alert_config["required_factors_any_2"])
                    match_conditions.append(any_match_2)

                factors_match = all(match_conditions) if match_conditions else False

            if factors_match:
                alerts.append(
                    CorrelationAlert(
                        alert_type=alert_config["name"],
                        description=alert_config["description"],
                        confidence=alert_config["confidence"],
                        domains_involved=required_domains,
                    )
                )

        return alerts

    async def _check_health_factors(self, npc_id: UUID) -> list[ContributingFactor]:
        """Check health-related risk factors."""
        factors: list[ContributingFactor] = []

        health_result = await self.db.execute(
            select(HealthRecord).where(HealthRecord.npc_id == npc_id)
        )
        health_record = health_result.scalar_one_or_none()

        if not health_record:
            return factors

        # Check for mental health treatment
        if health_record.conditions:
            mental_health_keywords = self._keywords["mental_health"]["all"]
            mental_health_conditions = [
                c
                for c in health_record.conditions
                if any(keyword in c.condition_name.lower() for keyword in mental_health_keywords)
            ]
            if mental_health_conditions:
                condition_names = ", ".join(c.condition_name for c in mental_health_conditions[:2])
                factors.append(
                    ContributingFactor(
                        factor_key="mental_health_treatment",
                        factor_name=self.RISK_FACTORS["mental_health_treatment"]["description"],
                        weight=self.RISK_FACTORS["mental_health_treatment"]["weight"],
                        evidence=f"Treatment history for: {condition_names}",
                        domain_source=DomainType.HEALTH,
                    )
                )

        # Check for substance treatment
        if health_record.medications:
            substance_keywords = self._keywords["substance_indicators"]
            substance_meds = [
                m
                for m in health_record.medications
                if any(keyword in m.medication_name.lower() for keyword in substance_keywords)
            ]
            if substance_meds:
                factors.append(
                    ContributingFactor(
                        factor_key="substance_treatment",
                        factor_name=self.RISK_FACTORS["substance_treatment"]["description"],
                        weight=self.RISK_FACTORS["substance_treatment"]["weight"],
                        evidence=f"Medication history indicates substance treatment: {substance_meds[0].medication_name}",
                        domain_source=DomainType.HEALTH,
                    )
                )

        # Check for chronic conditions
        if health_record.conditions:
            chronic_conditions = [c for c in health_record.conditions if c.is_chronic]
            if chronic_conditions:
                condition_names = ", ".join(c.condition_name for c in chronic_conditions[:2])
                factors.append(
                    ContributingFactor(
                        factor_key="chronic_condition",
                        factor_name=self.RISK_FACTORS["chronic_condition"]["description"],
                        weight=self.RISK_FACTORS["chronic_condition"]["weight"],
                        evidence=f"Chronic condition(s): {condition_names}",
                        domain_source=DomainType.HEALTH,
                    )
                )

        return factors

    async def _check_finance_factors(self, npc_id: UUID) -> list[ContributingFactor]:
        """Check finance-related risk factors."""
        factors: list[ContributingFactor] = []

        finance_result = await self.db.execute(
            select(FinanceRecord).where(FinanceRecord.npc_id == npc_id)
        )
        finance_record = finance_result.scalar_one_or_none()

        if not finance_record:
            return factors

        # Check for financial stress
        total_debt = sum(d.current_balance for d in finance_record.debts)
        annual_income = float(finance_record.annual_income or 0)

        if total_debt > 0 and annual_income > 0:
            debt_to_income = float(total_debt) / annual_income
            if debt_to_income > self.thresholds["debt_to_income_ratio"]:
                factors.append(
                    ContributingFactor(
                        factor_key="financial_stress",
                        factor_name=self.RISK_FACTORS["financial_stress"]["description"],
                        weight=self.RISK_FACTORS["financial_stress"]["weight"],
                        evidence=f"Debt-to-income ratio: {debt_to_income:.1%} (${total_debt:,.0f} debt vs ${annual_income:,.0f}/yr income)",
                        domain_source=DomainType.FINANCE,
                    )
                )

        # Check for unusual transactions
        transactions_result = await self.db.execute(
            select(Transaction).where(Transaction.finance_record_id == finance_record.id).limit(100)
        )
        transactions = transactions_result.scalars().all()

        if transactions:
            # Look for large transactions
            amounts = [abs(t.amount) for t in transactions]
            if amounts:
                avg_amount = sum(amounts) / len(amounts)
                multiplier = self.thresholds["transaction_multiplier"]
                large_transactions = [t for t in transactions if abs(t.amount) > avg_amount * multiplier]

                if large_transactions:
                    factors.append(
                        ContributingFactor(
                            factor_key="unusual_transactions",
                            factor_name=self.RISK_FACTORS["unusual_transactions"]["description"],
                            weight=self.RISK_FACTORS["unusual_transactions"]["weight"],
                            evidence=f"{len(large_transactions)} transactions significantly above average (>{multiplier}x mean)",
                            domain_source=DomainType.FINANCE,
                        )
                    )

        # Check for cash-heavy behavior (using OTHER category as proxy for cash)
        if transactions:
            # TransactionCategory doesn't have CASH_WITHDRAWAL, use OTHER as proxy
            cash_transactions = [
                t for t in transactions if t.category == TransactionCategory.OTHER
            ]
            if cash_transactions:
                cash_ratio = len(cash_transactions) / len(transactions)

                if cash_ratio > self.thresholds["cash_ratio"]:
                    factors.append(
                        ContributingFactor(
                            factor_key="cash_heavy",
                            factor_name=self.RISK_FACTORS["cash_heavy"]["description"],
                            weight=self.RISK_FACTORS["cash_heavy"]["weight"],
                            evidence=f"{cash_ratio*100:.0f}% of transactions are unclassified (OTHER category)",
                            domain_source=DomainType.FINANCE,
                        )
                    )

        return factors

    async def _check_judicial_factors(self, npc_id: UUID) -> list[ContributingFactor]:
        """Check judicial-related risk factors."""
        factors: list[ContributingFactor] = []

        judicial_result = await self.db.execute(
            select(JudicialRecord).where(JudicialRecord.npc_id == npc_id)
        )
        judicial_record = judicial_result.scalar_one_or_none()

        if not judicial_record:
            return factors

        # Check for prior criminal record
        if judicial_record.criminal_records:
            total_convictions = len(judicial_record.criminal_records)
            recent_crimes = [
                c.charge_description for c in judicial_record.criminal_records[:2]
            ]  # Most recent
            crimes_text = ", ".join(recent_crimes)

            factors.append(
                ContributingFactor(
                    factor_key="prior_record",
                    factor_name=self.RISK_FACTORS["prior_record"]["description"],
                    weight=self.RISK_FACTORS["prior_record"]["weight"],
                    evidence=f"{total_convictions} prior conviction(s): {crimes_text}",
                    domain_source=DomainType.JUDICIAL,
                )
            )

        # Check for civil disputes
        if judicial_record.civil_cases and len(judicial_record.civil_cases) >= self.thresholds["civil_cases_threshold"]:
            factors.append(
                ContributingFactor(
                    factor_key="civil_disputes",
                    factor_name=self.RISK_FACTORS["civil_disputes"]["description"],
                    weight=self.RISK_FACTORS["civil_disputes"]["weight"],
                    evidence=f"{len(judicial_record.civil_cases)} civil cases on record",
                    domain_source=DomainType.JUDICIAL,
                )
            )

        return factors

    async def _check_location_factors(self, npc_id: UUID) -> list[ContributingFactor]:
        """Check location-related risk factors."""
        factors: list[ContributingFactor] = []

        location_result = await self.db.execute(
            select(LocationRecord).where(LocationRecord.npc_id == npc_id)
        )
        location_record = location_result.scalar_one_or_none()

        if not location_record:
            return factors

        # Check for protest attendance (look for inferred locations)
        if location_record.inferred_locations:
            protest_keywords = self._keywords["protest_location_keywords"]
            protest_locations = [
                loc
                for loc in location_record.inferred_locations
                if any(keyword in loc.location_name.lower() for keyword in protest_keywords)
            ]
            if protest_locations:
                factors.append(
                    ContributingFactor(
                        factor_key="protest_attendance",
                        factor_name=self.RISK_FACTORS["protest_attendance"]["description"],
                        weight=self.RISK_FACTORS["protest_attendance"]["weight"],
                        evidence=f"Detected at {len(protest_locations)} protest/rally location(s)",
                        domain_source=DomainType.LOCATION,
                    )
                )

        # Check for flagged location visits (placeholder - would need flagged location database)
        if location_record.inferred_locations:
            # For now, flag "suspicious" location types
            # Check for location types that may indicate political involvement
            # Note: LocationType enum has: WORKPLACE, HOME, FREQUENT_VISIT, ROMANTIC_INTEREST,
            # FAMILY, MEDICAL_FACILITY, PLACE_OF_WORSHIP, ENTERTAINMENT, OTHER
            # Using OTHER and FREQUENT_VISIT as proxies for political/government locations
            flagged_types = [
                loc
                for loc in location_record.inferred_locations
                if "government" in loc.location_name.lower()
                or "political" in loc.location_name.lower()
                or "embassy" in loc.location_name.lower()
                or "community center" in loc.location_name.lower()
            ]
            if len(flagged_types) >= 3:
                factors.append(
                    ContributingFactor(
                        factor_key="flagged_location_visits",
                        factor_name=self.RISK_FACTORS["flagged_location_visits"][
                            "description"
                        ],
                        weight=self.RISK_FACTORS["flagged_location_visits"]["weight"],
                        evidence=f"Frequent visits to monitored locations ({len(flagged_types)} visits)",
                        domain_source=DomainType.LOCATION,
                    )
                )

        # Check for irregular patterns (high visit diversity)
        min_visits = self.thresholds["flagged_location_visits_min"]
        min_diversity = self.thresholds["location_diversity_min"]
        if location_record.inferred_locations and len(location_record.inferred_locations) >= min_visits:
            unique_places = len(set(loc.location_name for loc in location_record.inferred_locations))
            if unique_places >= min_diversity:
                factors.append(
                    ContributingFactor(
                        factor_key="irregular_patterns",
                        factor_name=self.RISK_FACTORS["irregular_patterns"]["description"],
                        weight=self.RISK_FACTORS["irregular_patterns"]["weight"],
                        evidence=f"High location diversity: {unique_places} unique places visited",
                        domain_source=DomainType.LOCATION,
                    )
                )

        return factors

    async def _check_social_factors(self, npc_id: UUID) -> list[ContributingFactor]:
        """Check social media-related risk factors."""
        factors: list[ContributingFactor] = []

        social_result = await self.db.execute(
            select(SocialMediaRecord).where(SocialMediaRecord.npc_id == npc_id)
        )
        social_record = social_result.scalar_one_or_none()

        if not social_record:
            return factors

        # Check for flagged connections (look for private inferences about connections)
        if social_record.private_inferences:
            flagged_connection_inferences = [
                inf
                for inf in social_record.private_inferences
                if "flagged" in inf.inference_text.lower()
                or "concerning" in inf.inference_text.lower()
                or "monitored" in inf.inference_text.lower()
            ]
            if flagged_connection_inferences:
                factors.append(
                    ContributingFactor(
                        factor_key="flagged_connections",
                        factor_name=self.RISK_FACTORS["flagged_connections"]["description"],
                        weight=self.RISK_FACTORS["flagged_connections"]["weight"],
                        evidence=f"Connected to {len(flagged_connection_inferences)} flagged individual(s)",
                        domain_source=DomainType.SOCIAL,
                    )
                )

        # Check for network centrality (high follower count or engagement)
        follower_count = social_record.follower_count or 0
        if follower_count > self.thresholds["follower_count_influential"]:
            factors.append(
                ContributingFactor(
                    factor_key="network_centrality",
                    factor_name=self.RISK_FACTORS["network_centrality"]["description"],
                    weight=self.RISK_FACTORS["network_centrality"]["weight"],
                    evidence=f"High influence: {follower_count:,} followers",
                    domain_source=DomainType.SOCIAL,
                )
            )

        # Check for rapid connection growth (placeholder - would need historical data)
        # For now, high follower count as proxy
        if follower_count > self.thresholds["network_activity_threshold"] and social_record.public_inferences:
            recent_activity = len(social_record.public_inferences)
            if recent_activity >= self.thresholds["network_inference_threshold"]:
                factors.append(
                    ContributingFactor(
                        factor_key="new_connections_rate",
                        factor_name=self.RISK_FACTORS["new_connections_rate"]["description"],
                        weight=self.RISK_FACTORS["new_connections_rate"]["weight"],
                        evidence=f"Rapid network expansion: {recent_activity} recent public interactions",
                        domain_source=DomainType.SOCIAL,
                    )
                )

        return factors

    def _classify_risk_level(self, score: int) -> RiskLevel:
        """Classify numeric risk score into risk level."""
        boundaries = self.risk_boundaries
        if score <= boundaries["low"][1]:
            return RiskLevel.LOW
        elif score <= boundaries["moderate"][1]:
            return RiskLevel.MODERATE
        elif score <= boundaries["elevated"][1]:
            return RiskLevel.ELEVATED
        elif score <= boundaries["high"][1]:
            return RiskLevel.HIGH
        else:
            return RiskLevel.SEVERE

    def _generate_recommendations(
        self, risk_score: int, contributing_factors: list[ContributingFactor]
    ) -> list[RecommendedAction]:
        """Generate action recommendations based on risk assessment."""
        recommendations: list[RecommendedAction] = []

        # Low risk - routine monitoring
        if risk_score <= 20:
            recommendations.append(
                RecommendedAction(
                    action_type=ActionType.INCREASE_MONITORING,
                    justification="Standard monitoring protocols sufficient",
                    urgency=ActionUrgency.ROUTINE,
                )
            )
            return recommendations

        # Moderate risk - increased monitoring
        if risk_score <= 40:
            recommendations.append(
                RecommendedAction(
                    action_type=ActionType.INCREASE_MONITORING,
                    justification="Risk factors present warrant enhanced surveillance",
                    urgency=ActionUrgency.ROUTINE,
                )
            )
            return recommendations

        # Elevated risk - travel restrictions
        if risk_score <= 60:
            recommendations.append(
                RecommendedAction(
                    action_type=ActionType.INCREASE_MONITORING,
                    justification="Multiple risk factors require active monitoring",
                    urgency=ActionUrgency.PRIORITY,
                )
            )
            # Add travel restriction if location factors present
            if any(
                f.domain_source == DomainType.LOCATION for f in contributing_factors
            ):
                recommendations.append(
                    RecommendedAction(
                        action_type=ActionType.TRAVEL_RESTRICTION,
                        justification="Location-based risk factors indicate travel restriction warranted",
                        urgency=ActionUrgency.PRIORITY,
                    )
                )
            return recommendations

        # High risk - intervention
        if risk_score <= 80:
            recommendations.append(
                RecommendedAction(
                    action_type=ActionType.INCREASE_MONITORING,
                    justification="High-risk profile requires constant surveillance",
                    urgency=ActionUrgency.IMMEDIATE,
                )
            )
            recommendations.append(
                RecommendedAction(
                    action_type=ActionType.TRAVEL_RESTRICTION,
                    justification="High risk score necessitates movement restrictions",
                    urgency=ActionUrgency.IMMEDIATE,
                )
            )
            recommendations.append(
                RecommendedAction(
                    action_type=ActionType.EMPLOYER_NOTIFICATION,
                    justification="Employer should be notified of risk status",
                    urgency=ActionUrgency.PRIORITY,
                )
            )
            return recommendations

        # Severe risk - detention
        recommendations.append(
            RecommendedAction(
                action_type=ActionType.DETENTION,
                justification="Severe risk level indicates immediate detention required",
                urgency=ActionUrgency.IMMEDIATE,
            )
        )
        recommendations.append(
            RecommendedAction(
                action_type=ActionType.INTERVENTION,
                justification="Direct intervention necessary for severe-risk individual",
                urgency=ActionUrgency.IMMEDIATE,
            )
        )

        return recommendations
