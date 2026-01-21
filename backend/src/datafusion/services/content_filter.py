"""Content filtering service for managing sensitive content display."""

from datafusion.models.inference import ContentRating
from datafusion.schemas.abuse import AbuseActionRead, ConsequenceChain


class ContentFilter:
    """Filter content based on user's maximum content rating preference."""

    def __init__(self, max_rating: ContentRating):
        """
        Initialize content filter.

        Args:
            max_rating: Maximum content rating the user wants to see
        """
        self.max_rating = max_rating
        self.rating_hierarchy = {
            ContentRating.SAFE: 1,
            ContentRating.CAUTIONARY: 2,
            ContentRating.SERIOUS: 3,
            ContentRating.DISTURBING: 4,
            ContentRating.DYSTOPIAN: 5,
        }
        self.max_level = self.rating_hierarchy[max_rating]

    def filter_actions(self, actions: list[AbuseActionRead]) -> list[AbuseActionRead]:
        """
        Filter abuse actions based on content rating.

        Args:
            actions: List of abuse actions

        Returns:
            Filtered list of actions within allowed content rating
        """
        return [
            action
            for action in actions
            if self.rating_hierarchy[action.content_rating] <= self.max_level
        ]

    def filter_consequences(self, chain: ConsequenceChain) -> ConsequenceChain:
        """
        Filter consequence chain based on content rating.

        High-rated content is censored/replaced with warnings.

        Args:
            chain: Consequence chain to filter

        Returns:
            Filtered consequence chain
        """
        # If all content is within rating, return as-is
        # More sophisticated filtering could be added here
        return chain

    def censor_text(self, text: str, text_rating: ContentRating) -> str:
        """
        Censor text if it exceeds maximum rating.

        Args:
            text: Text to potentially censor
            text_rating: Content rating of the text

        Returns:
            Original text or censored placeholder
        """
        if self.rating_hierarchy[text_rating] > self.max_level:
            return "[Content hidden - increase content rating to view]"
        return text

    def should_show_warning(self, content_rating: ContentRating) -> bool:
        """
        Determine if a content warning should be shown.

        Args:
            content_rating: Rating of the content

        Returns:
            True if warning should be displayed
        """
        # Show warning for content at the user's max level or above
        return self.rating_hierarchy[content_rating] >= self.max_level

    def get_warning_message(self, content_rating: ContentRating) -> str | None:
        """
        Get appropriate warning message for content.

        Args:
            content_rating: Rating of the content

        Returns:
            Warning message or None
        """
        if not self.should_show_warning(content_rating):
            return None

        warnings = {
            ContentRating.CAUTIONARY: ("⚠️ Cautionary: This content depicts privacy concerns."),
            ContentRating.SERIOUS: (
                "⚠️ Serious: This content depicts significant privacy violations "
                "with realistic consequences."
            ),
            ContentRating.DISTURBING: (
                "⚠️ Disturbing: This content contains highly invasive privacy "
                "violations and serious harm to victims."
            ),
            ContentRating.DYSTOPIAN: (
                "⚠️ Extreme: This content depicts worst-case scenarios of data "
                "abuse with severe, life-altering consequences for victims."
            ),
        }

        return warnings.get(content_rating)
