"""Pydantic schemas for user settings and content preferences."""

import enum

from pydantic import BaseModel, ConfigDict, Field

from datafusion.schemas.domains import DomainType


class ContentRating(enum.Enum):
    """Content rating levels for filtering sensitive content."""

    MILD = "mild"
    MODERATE = "moderate"
    DARK = "dark"
    SEVERE = "severe"


class UserSettings(BaseModel):
    """User preferences for content filtering and enabled domains."""

    max_content_rating: ContentRating = Field(
        default=ContentRating.MODERATE,
        description="Maximum content rating to display",
    )
    show_warnings: bool = Field(
        default=True,
        description="Show content warnings before sensitive data",
    )
    enabled_domains: set[DomainType] = Field(
        default_factory=set,
        description="Data domains accessible to the user",
    )

    model_config = ConfigDict(from_attributes=True)
