"""
Risk Scoring Service for System Mode.

The algorithmic heart of surveillance - reduces citizens to risk scores
by analyzing their data across all domains.

Educational purpose: Shows how real surveillance systems work and why
they're problematic (bias, lack of transparency, chilling effects).
"""
from datetime import datetime
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


class RiskScorer:
    """
    Calculates risk scores for citizens based on invasive data analysis.

    This is intentionally dystopian to demonstrate the dangers of
    mass surveillance and algorithmic decision-making.
    """

    # Risk factor definitions with weights
    RISK_FACTORS = {
        # Health factors - discriminatory surveillance of medical conditions
        "mental_health_treatment": {
            "weight": 15,
            "domain": DomainType.HEALTH,
            "description": "Mental health treatment history",
        },
        "substance_treatment": {
            "weight": 20,
            "domain": DomainType.HEALTH,
            "description": "Substance abuse treatment",
        },
        "chronic_condition": {
            "weight": 5,
            "domain": DomainType.HEALTH,
            "description": "Chronic health condition",
        },
        # Financial factors - poverty as suspicion
        "financial_stress": {
            "weight": 12,
            "domain": DomainType.FINANCE,
            "description": "Financial instability indicators",
        },
        "unusual_transactions": {
            "weight": 18,
            "domain": DomainType.FINANCE,
            "description": "Anomalous financial patterns",
        },
        "cash_heavy": {
            "weight": 10,
            "domain": DomainType.FINANCE,
            "description": "High cash transaction ratio",
        },
        # Judicial factors - past punishment predicts future crime
        "prior_record": {
            "weight": 25,
            "domain": DomainType.JUDICIAL,
            "description": "Prior criminal record",
        },
        "civil_disputes": {
            "weight": 8,
            "domain": DomainType.JUDICIAL,
            "description": "Civil court involvement",
        },
        # Location factors - movement as evidence
        "protest_attendance": {
            "weight": 20,
            "domain": DomainType.LOCATION,
            "description": "Presence at protest events",
        },
        "flagged_location_visits": {
            "weight": 15,
            "domain": DomainType.LOCATION,
            "description": "Visits to flagged locations",
        },
        "irregular_patterns": {
            "weight": 10,
            "domain": DomainType.LOCATION,
            "description": "Deviation from routine",
        },
        # Social factors - guilt by association
        "flagged_connections": {
            "weight": 18,
            "domain": DomainType.SOCIAL,
            "description": "Connections to flagged citizens",
        },
        "network_centrality": {
            "weight": 8,
            "domain": DomainType.SOCIAL,
            "description": "High social network influence",
        },
        "new_connections_rate": {
            "weight": 5,
            "domain": DomainType.SOCIAL,
            "description": "Rapid network expansion",
        },
    }

    def __init__(self, db: AsyncSession):
        """Initialize with database session."""
        self.db = db

    async def calculate_risk_score(self, npc_id: UUID) -> RiskAssessment:
        """
        Calculate comprehensive risk score for a citizen.

        Args:
            npc_id: UUID of the citizen to assess

        Returns:
            RiskAssessment with score, factors, alerts, and recommendations
        """
        # Verify NPC exists
        npc_result = await self.db.execute(select(NPC).where(NPC.id == npc_id))
        npc = npc_result.scalar_one_or_none()
        if not npc:
            raise ValueError(f"NPC {npc_id} not found")

        # Get contributing factors
        contributing_factors = await self.get_contributing_factors(npc_id)

        # Calculate total risk score (capped at 100)
        risk_score = min(sum(f.weight for f in contributing_factors), 100)

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
            last_updated=datetime.utcnow(),
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

        # Get domains present in factors
        domains_present = {f.domain_source for f in contributing_factors}

        # Financial stress + judicial record = recidivism risk
        if DomainType.FINANCE in domains_present and DomainType.JUDICIAL in domains_present:
            if any(f.factor_key == "financial_stress" for f in contributing_factors):
                if any(f.factor_key == "prior_record" for f in contributing_factors):
                    alerts.append(
                        CorrelationAlert(
                            alert_type="recidivism_risk",
                            description="Financial stress combined with prior record suggests elevated recidivism risk",
                            confidence=0.72,
                            domains_involved=[DomainType.FINANCE, DomainType.JUDICIAL],
                        )
                    )

        # Health + financial stress = desperation indicator
        if DomainType.HEALTH in domains_present and DomainType.FINANCE in domains_present:
            if any(
                f.factor_key in ["mental_health_treatment", "substance_treatment"]
                for f in contributing_factors
            ):
                if any(f.factor_key == "financial_stress" for f in contributing_factors):
                    alerts.append(
                        CorrelationAlert(
                            alert_type="desperation_indicator",
                            description="Health issues combined with financial stress indicate potential desperation",
                            confidence=0.65,
                            domains_involved=[DomainType.HEALTH, DomainType.FINANCE],
                        )
                    )

        # Social connections + location patterns = organizing activity
        if DomainType.SOCIAL in domains_present and DomainType.LOCATION in domains_present:
            if any(
                f.factor_key in ["network_centrality", "new_connections_rate"]
                for f in contributing_factors
            ):
                if any(
                    f.factor_key in ["protest_attendance", "irregular_patterns"]
                    for f in contributing_factors
                ):
                    alerts.append(
                        CorrelationAlert(
                            alert_type="organizing_activity",
                            description="Social network activity combined with location patterns suggest organizing/mobilization activity",
                            confidence=0.78,
                            domains_involved=[
                                DomainType.SOCIAL,
                                DomainType.LOCATION,
                            ],
                        )
                    )

        # Flagged connections + unusual transactions = recruitment vulnerability
        if DomainType.SOCIAL in domains_present and DomainType.FINANCE in domains_present:
            if any(f.factor_key == "flagged_connections" for f in contributing_factors):
                if any(f.factor_key == "unusual_transactions" for f in contributing_factors):
                    alerts.append(
                        CorrelationAlert(
                            alert_type="recruitment_vulnerability",
                            description="Connections to flagged individuals combined with unusual financial activity suggests recruitment vulnerability or involvement",
                            confidence=0.68,
                            domains_involved=[
                                DomainType.SOCIAL,
                                DomainType.FINANCE,
                            ],
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
            mental_health_conditions = [
                c
                for c in health_record.conditions
                if c.category.lower()
                in ["mental_health", "psychological", "psychiatric", "anxiety", "depression"]
            ]
            if mental_health_conditions:
                condition_names = ", ".join(c.name for c in mental_health_conditions[:2])
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
            substance_meds = [
                m
                for m in health_record.medications
                if "substance" in m.name.lower()
                or "addiction" in m.name.lower()
                or "methadone" in m.name.lower()
                or "suboxone" in m.name.lower()
            ]
            if substance_meds:
                factors.append(
                    ContributingFactor(
                        factor_key="substance_treatment",
                        factor_name=self.RISK_FACTORS["substance_treatment"]["description"],
                        weight=self.RISK_FACTORS["substance_treatment"]["weight"],
                        evidence=f"Medication history indicates substance treatment: {substance_meds[0].name}",
                        domain_source=DomainType.HEALTH,
                    )
                )

        # Check for chronic conditions
        if health_record.conditions and len(health_record.conditions) >= 2:
            factors.append(
                ContributingFactor(
                    factor_key="chronic_condition",
                    factor_name=self.RISK_FACTORS["chronic_condition"]["description"],
                    weight=self.RISK_FACTORS["chronic_condition"]["weight"],
                    evidence=f"Multiple chronic conditions ({len(health_record.conditions)} total)",
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
        monthly_income = finance_record.monthly_income or 0

        if total_debt > 0 and monthly_income > 0:
            debt_to_income = total_debt / (monthly_income * 12)
            if debt_to_income > 0.5:  # Debt exceeds 6 months of income
                factors.append(
                    ContributingFactor(
                        factor_key="financial_stress",
                        factor_name=self.RISK_FACTORS["financial_stress"]["description"],
                        weight=self.RISK_FACTORS["financial_stress"]["weight"],
                        evidence=f"Debt-to-income ratio: {debt_to_income:.1f}x (${total_debt:,.0f} debt vs ${monthly_income:,.0f}/mo income)",
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
                large_transactions = [t for t in transactions if abs(t.amount) > avg_amount * 5]

                if large_transactions:
                    factors.append(
                        ContributingFactor(
                            factor_key="unusual_transactions",
                            factor_name=self.RISK_FACTORS["unusual_transactions"]["description"],
                            weight=self.RISK_FACTORS["unusual_transactions"]["weight"],
                            evidence=f"{len(large_transactions)} transactions significantly above average (>5x mean)",
                            domain_source=DomainType.FINANCE,
                        )
                    )

        # Check for cash-heavy behavior
        if transactions:
            cash_transactions = [
                t for t in transactions if t.category == TransactionCategory.CASH_WITHDRAWAL
            ]
            cash_ratio = len(cash_transactions) / len(transactions)

            if cash_ratio > 0.3:  # More than 30% cash transactions
                factors.append(
                    ContributingFactor(
                        factor_key="cash_heavy",
                        factor_name=self.RISK_FACTORS["cash_heavy"]["description"],
                        weight=self.RISK_FACTORS["cash_heavy"]["weight"],
                        evidence=f"{cash_ratio*100:.0f}% of transactions are cash withdrawals",
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
                c.crime for c in judicial_record.criminal_records[:2]
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
        if judicial_record.civil_cases and len(judicial_record.civil_cases) >= 2:
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
            protest_locations = [
                loc
                for loc in location_record.inferred_locations
                if "protest" in loc.place_name.lower()
                or "rally" in loc.place_name.lower()
                or "demonstration" in loc.place_name.lower()
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
            flagged_types = [
                loc
                for loc in location_record.inferred_locations
                if loc.place_type
                in ["political_office", "government_building", "embassy", "community_center"]
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
        if location_record.inferred_locations and len(location_record.inferred_locations) >= 10:
            unique_places = len(set(loc.place_name for loc in location_record.inferred_locations))
            if unique_places >= 8:  # High variety of locations
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
        if follower_count > 1000:  # Influential account
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
        if follower_count > 500 and social_record.public_inferences:
            recent_activity = len(social_record.public_inferences)
            if recent_activity >= 10:  # Active networker
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
        if score <= 20:
            return RiskLevel.LOW
        elif score <= 40:
            return RiskLevel.MODERATE
        elif score <= 60:
            return RiskLevel.ELEVATED
        elif score <= 80:
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
