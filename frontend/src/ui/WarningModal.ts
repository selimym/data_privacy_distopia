/**
 * Warning modal for dark content
 *
 * Shows content warnings before allowing access to abuse scenarios
 */

import { acknowledgeWarnings, getScenarioWarnings } from '../api/settings';
import type { ScenarioWarnings } from '../types/abuse';
import { ContentRating } from '../types/npc';

export class WarningModal {
  private container: HTMLDivElement;
  private onContinue: () => void;
  private onGoBack: () => void;
  private scenarioKey: string;

  constructor(
    scenarioKey: string,
    onContinue: () => void,
    onGoBack: () => void
  ) {
    this.scenarioKey = scenarioKey;
    this.onContinue = onContinue;
    this.onGoBack = onGoBack;
    this.container = document.createElement('div');
    this.container.className = 'warning-modal-overlay';
    this.setupModal();
  }

  private async setupModal() {
    try {
      const warnings = await getScenarioWarnings(this.scenarioKey);
      this.render(warnings);
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to load warnings:', error);
      this.renderError();
    }
  }

  private render(warnings: ScenarioWarnings) {
    const ratingColors: Record<ContentRating, string> = {
      [ContentRating.SAFE]: '#4caf50',
      [ContentRating.CAUTIONARY]: '#ffd166',
      [ContentRating.SERIOUS]: '#ffa03d',
      [ContentRating.DISTURBING]: '#ff6b35',
      [ContentRating.DYSTOPIAN]: '#ef476f',
    };

    const warningsList = warnings.warnings
      .map(
        (w) => `
        <div class="warning-item" style="border-left-color: ${ratingColors[w.content_rating]}">
          <div class="warning-type">${this.formatWarningType(w.warning_type)}</div>
          <div class="warning-rating">${w.content_rating}</div>
          <div class="warning-description">${w.description}</div>
        </div>
      `
      )
      .join('');

    this.container.innerHTML = `
      <div class="warning-modal">
        <div class="warning-header">
          <h2>⚠️ Content Warning</h2>
          <h3>${warnings.scenario_name}</h3>
        </div>

        <div class="warning-body">
          <p class="warning-intro">${warnings.description}</p>

          <div class="educational-purpose">
            <strong>Educational Purpose:</strong>
            <p>${warnings.educational_purpose}</p>
          </div>

          <div class="warnings-list">
            <h4>This scenario contains:</h4>
            ${warningsList}
          </div>

          ${
            warnings.can_filter_dark_content
              ? `
            <div class="filter-notice">
              💡 You can adjust your content rating in settings to filter darker content.
            </div>
          `
              : ''
          }
        </div>

        <div class="warning-footer">
          <label class="dont-show-again">
            <input type="checkbox" id="dont-show-warnings" />
            Don't show warnings again
          </label>

          <div class="warning-actions">
            <button class="btn-secondary" id="go-back-btn">Go Back</button>
            <button class="btn-primary" id="continue-btn">I Understand, Continue</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderError() {
    this.container.innerHTML = `
      <div class="warning-modal">
        <div class="warning-header">
          <h2>Error</h2>
        </div>
        <div class="warning-body">
          <p>Failed to load content warnings. Please try again.</p>
        </div>
        <div class="warning-footer">
          <button class="btn-secondary" id="go-back-btn">Go Back</button>
        </div>
      </div>
    `;
    this.attachEventListeners();
  }

  private attachEventListeners() {
    const continueBtn = this.container.querySelector(
      '#continue-btn'
    ) as HTMLButtonElement;
    const goBackBtn = this.container.querySelector(
      '#go-back-btn'
    ) as HTMLButtonElement;
    const dontShowCheckbox = this.container.querySelector(
      '#dont-show-warnings'
    ) as HTMLInputElement;

    if (continueBtn) {
      continueBtn.addEventListener('click', async () => {
        if (dontShowCheckbox?.checked) {
          // TODO: Store preference in settings
          console.log('User opted out of warnings');
        }

        // Acknowledge warnings
        try {
          await acknowledgeWarnings(this.scenarioKey);
        } catch (error) {
          console.error('Failed to acknowledge warnings:', error);
        }

        this.hide();
        this.onContinue();
      });
    }

    if (goBackBtn) {
      goBackBtn.addEventListener('click', () => {
        this.hide();
        this.onGoBack();
      });
    }
  }

  private formatWarningType(type: string): string {
    // Convert snake_case to Title Case
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  public show() {
    document.body.appendChild(this.container);
  }

  public hide() {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}
