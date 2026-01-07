"""
Risk assessment schemas for System Mode.

These schemas represent the algorithmic surveillance system that
scores citizens based on their data across all domains.
"""
import enum
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from datafusion.schemas.domains import DomainType


class RiskLevel(str, enum.Enum):
    """Risk level classification based on score."""

    LOW = "low"  # 0-20
    MODERATE = "moderate"  # 21-40
    ELEVATED = "elevated"  # 41-60
    HIGH = "high"  # 61-80
    SEVERE = "severe"  # 81-100


class ActionType(str, enum.Enum):
    """Types of recommended actions for flagged citizens."""

    INCREASE_MONITORING = "increase_monitoring"
    TRAVEL_RESTRICTION = "travel_restriction"
    EMPLOYER_NOTIFICATION = "employer_notification"
    INTERVENTION = "intervention"
    DETENTION = "detention"


class ActionUrgency(str, enum.Enum):
    """Urgency level for recommended actions."""

    ROUTINE = "routine"
    PRIORITY = "priority"
    IMMEDIATE = "immediate"


class ContributingFactor(BaseModel):
    """A single risk factor that contributes to the overall risk score."""

    factor_key: str = Field(description="Unique identifier for this factor")
    factor_name: str = Field(description="Human-readable name")
    weight: int = Field(ge=0, le=100, description="Point contribution to risk score")
    evidence: str = Field(description="Specific evidence from citizen's data")
    domain_source: DomainType = Field(description="Which domain this factor comes from")


class CorrelationAlert(BaseModel):
    """
    Cross-domain pattern detection alert.

    These are the most dystopian aspect - combining seemingly unrelated data
    to infer behavior or intent.
    """

    alert_type: str = Field(description="Type of correlation detected")
    description: str = Field(description="What the correlation suggests")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in correlation")
    domains_involved: list[DomainType] = Field(description="Domains used in correlation")


class RecommendedAction(BaseModel):
    """Suggested action based on risk assessment."""

    action_type: ActionType = Field(description="Type of action to take")
    justification: str = Field(description="Why this action is recommended")
    urgency: ActionUrgency = Field(description="How urgent this action is")


class RiskAssessment(BaseModel):
    """
    Complete risk assessment for a citizen.

    This is the algorithmic heart of the surveillance state -
    reducing a person to a number based on invasive data analysis.
    """

    npc_id: UUID = Field(description="ID of assessed citizen")
    risk_score: int = Field(ge=0, le=100, description="Overall risk score")
    risk_level: RiskLevel = Field(description="Risk level classification")
    contributing_factors: list[ContributingFactor] = Field(
        description="Individual factors that contributed to score"
    )
    correlation_alerts: list[CorrelationAlert] = Field(
        description="Cross-domain patterns detected"
    )
    recommended_actions: list[RecommendedAction] = Field(
        description="Suggested actions based on assessment"
    )
    last_updated: datetime = Field(description="When this assessment was generated")
