/**
 * Content Filtering Service - manage sensitive content display.
 * Port of backend/src/datafusion/services/content_filter.py
 *
 * Filters content based on user's maximum content rating preference.
 */

import { ContentRating } from '../types';

/**
 * Content filter for managing sensitive content display.
 */
export class ContentFilter {
  private maxRating: ContentRating;
  private maxLevel: number;

  private readonly ratingHierarchy: Record<ContentRating, number> = {
    [ContentRating.SAFE]: 1,
    [ContentRating.CAUTIONARY]: 2,
    [ContentRating.SERIOUS]: 3,
    [ContentRating.DISTURBING]: 4,
    [ContentRating.DYSTOPIAN]: 5,
  };

  constructor(maxRating: ContentRating) {
    this.maxRating = maxRating;
    this.maxLevel = this.ratingHierarchy[maxRating];
  }

  /**
   * Filter items based on content rating.
   *
   * @param items - Items with content_rating property
   * @returns Filtered list of items within allowed content rating
   */
  filterByRating<T extends { content_rating: ContentRating }>(items: T[]): T[] {
    return items.filter((item) => this.ratingHierarchy[item.content_rating] <= this.maxLevel);
  }

  /**
   * Censor text if it exceeds maximum rating.
   *
   * @param text - Text to potentially censor
   * @param textRating - Content rating of the text
   * @returns Original text or censored placeholder
   */
  censorText(text: string, textRating: ContentRating): string {
    if (this.ratingHierarchy[textRating] > this.maxLevel) {
      return '[Content hidden - increase content rating to view]';
    }
    return text;
  }

  /**
   * Determine if a content warning should be shown.
   *
   * @param contentRating - Rating of the content
   * @returns True if warning should be displayed
   */
  shouldShowWarning(contentRating: ContentRating): boolean {
    // Show warning for content at the user's max level or above
    return this.ratingHierarchy[contentRating] >= this.maxLevel;
  }

  /**
   * Get appropriate warning message for content.
   *
   * @param contentRating - Rating of the content
   * @returns Warning message or null
   */
  getWarningMessage(contentRating: ContentRating): string | null {
    if (!this.shouldShowWarning(contentRating)) {
      return null;
    }

    const warnings: Record<ContentRating, string> = {
      [ContentRating.SAFE]: '',
      [ContentRating.CAUTIONARY]: '⚠️ Cautionary: This content depicts privacy concerns.',
      [ContentRating.SERIOUS]:
        '⚠️ Serious: This content depicts significant privacy violations with realistic consequences.',
      [ContentRating.DISTURBING]:
        '⚠️ Disturbing: This content contains highly invasive privacy violations and serious harm to victims.',
      [ContentRating.DYSTOPIAN]:
        '⚠️ Extreme: This content depicts worst-case scenarios of data abuse with severe, life-altering consequences for victims.',
    };

    return warnings[contentRating] || null;
  }

  /**
   * Get the current max rating.
   */
  getMaxRating(): ContentRating {
    return this.maxRating;
  }

  /**
   * Update the max rating filter.
   */
  setMaxRating(maxRating: ContentRating): void {
    this.maxRating = maxRating;
    this.maxLevel = this.ratingHierarchy[maxRating];
  }
}
