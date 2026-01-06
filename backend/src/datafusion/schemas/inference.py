"""Inference engine schemas for API responses."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from datafusion.models.inference import ContentRating
from datafusion.schemas.domains import DomainType


class InferenceRuleRead(BaseModel):
    """Schema for reading inference rules from the database."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    rule_key: str
    name: str
    description: str
    required_domains: str  # JSON string, will be parsed
    scariness_level: int = Field(ge=1, le=5)
    content_rating: ContentRating
    is_active: bool
    created_at: datetime
    updated_at: datetime


class InferenceResult(BaseModel):
    """
    A computed inference result from analyzing NPC data.

    This is not stored in the database - it's computed on-the-fly
    when an NPC is queried with specific domains enabled.
    """

    rule_key: str
    rule_name: str
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score 0-1")
    inference_text: str = Field(description="The main conclusion or insight")
    supporting_evidence: list[str] = Field(
        default_factory=list, description="Data points that support this inference"
    )
    implications: list[str] = Field(
        default_factory=list, description="Potential consequences or next steps"
    )
    domains_used: list[DomainType] = Field(description="Which domains contributed to this inference")
    scariness_level: int = Field(ge=1, le=5, description="How concerning this inference is")
    content_rating: ContentRating


class UnlockableInference(BaseModel):
    """Information about inferences that could be unlocked by enabling more domains."""

    domain: DomainType = Field(description="The domain that needs to be enabled")
    rule_keys: list[str] = Field(description="Inference rules that would be unlocked")


class InferencesResponse(BaseModel):
    """Response containing all inferences for an NPC."""

    npc_id: UUID
    enabled_domains: list[DomainType] = Field(description="Currently enabled domains")
    inferences: list[InferenceResult] = Field(
        default_factory=list, description="Inferences derived from enabled domains"
    )
    unlockable_inferences: list[UnlockableInference] = Field(
        default_factory=list,
        description="Inferences that could be unlocked by enabling additional domains",
    )
