"""Pydantic schemas for social media record API endpoints."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from datafusion.models.social import InferenceCategory, Platform


class PublicInferenceRead(BaseModel):
    """Schema for public inference responses."""

    id: UUID
    social_media_record_id: UUID
    category: InferenceCategory
    inference_text: str
    supporting_evidence: str
    confidence_score: int
    source_platform: Platform
    data_points_analyzed: int
    potential_harm: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PrivateInferenceRead(BaseModel):
    """Schema for private inference responses (requires privileged access)."""

    id: UUID
    social_media_record_id: UUID
    category: InferenceCategory
    inference_text: str
    supporting_evidence: str
    confidence_score: int
    source_platform: Platform
    message_count: int
    involves_other_parties: bool
    is_highly_sensitive: bool
    potential_harm: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SocialMediaRecordRead(BaseModel):
    """Schema for complete social media record with nested data."""

    id: UUID
    npc_id: UUID
    has_public_profile: bool
    primary_platform: Platform | None
    account_created_date: date | None
    follower_count: int | None
    post_frequency: str | None
    uses_end_to_end_encryption: bool
    encryption_explanation: str | None
    public_inferences: list[PublicInferenceRead]
    private_inferences: list[PrivateInferenceRead]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SocialMediaRecordPublicOnly(BaseModel):
    """Schema for social media record with only public data (no privilege required)."""

    id: UUID
    npc_id: UUID
    has_public_profile: bool
    primary_platform: Platform | None
    account_created_date: date | None
    follower_count: int | None
    post_frequency: str | None
    public_inferences: list[PublicInferenceRead]
    uses_end_to_end_encryption: bool
    encryption_explanation: str | None

    model_config = ConfigDict(from_attributes=True)


class SocialMediaRecordFiltered(BaseModel):
    """Schema for social media record with content filtering applied."""

    id: UUID
    npc_id: UUID
    has_public_profile: bool
    primary_platform: Platform | None
    account_created_date: date | None
    follower_count: int | None
    post_frequency: str | None
    uses_end_to_end_encryption: bool
    encryption_explanation: str | None
    public_inferences: list[PublicInferenceRead]
    private_inferences: list[PrivateInferenceRead]

    model_config = ConfigDict(from_attributes=True)
