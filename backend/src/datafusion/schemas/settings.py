"""Pydantic schemas for user settings and content warnings."""

from pydantic import BaseModel, ConfigDict, Field

from datafusion.models.inference import ContentRating
from datafusion.schemas.domains import DomainType


class ContentWarning(BaseModel):
    """Individual content warning for specific content types."""

    warning_type: str = Field(
        description="Type of content (e.g., 'stalking', 'medical_privacy')"
    )
    content_rating: ContentRating = Field(description="Severity rating of this content")
    description: str = Field(description="What this content depicts")
    appears_in: list[str] = Field(
        description="Which actions or time skips contain this content"
    )


class ScenarioWarnings(BaseModel):
    """Complete warning information for a scenario."""

    scenario_key: str = Field(description="Scenario identifier")
    scenario_name: str = Field(description="Display name")
    description: str = Field(description="Brief scenario description")
    warnings: list[ContentWarning] = Field(description="All content warnings")
    can_filter_dark_content: bool = Field(
        default=True, description="Whether content filtering is available"
    )
    educational_purpose: str = Field(
        description="Why this scenario exists (educational context)"
    )


class UserSettings(BaseModel):
    """User preferences for content filtering and enabled domains."""

    max_content_rating: ContentRating = Field(
        default=ContentRating.SERIOUS,
        description="Maximum content rating to display",
    )
    show_content_warnings: bool = Field(
        default=True, description="Whether to show warnings before dark content"
    )
    show_victim_statements: bool = Field(
        default=True, description="Whether to include victim perspectives"
    )
    show_real_world_parallels: bool = Field(
        default=True, description="Whether to show real-world case examples"
    )
    enabled_domains: set[DomainType] = Field(
        default_factory=set,
        description="Data domains accessible to the user",
    )

    model_config = ConfigDict(from_attributes=True)


class UserSettingsUpdate(BaseModel):
    """Partial update for user settings."""

    max_content_rating: ContentRating | None = None
    show_content_warnings: bool | None = None
    show_victim_statements: bool | None = None
    show_real_world_parallels: bool | None = None
    enabled_domains: set[DomainType] | None = None
