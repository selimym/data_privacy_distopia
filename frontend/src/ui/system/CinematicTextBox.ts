/**
 * CinematicTextBox - Text Display for Cinematic Transitions
 *
 * Displays citizen outcome narrative during camera pan cinematics.
 * Shows at bottom of screen like RPG dialogue box with skip button.
 */

export interface CinematicTextBoxConfig {
  scene: Phaser.Scene;
  citizenName: string;
  timeSkip: string;  // "immediate", "1_month", "6_months", "1_year"
  narrative: string;
  status: string;
  onComplete: () => void;
  onSkip: () => void;
}

export class CinematicTextBox {
  private container: HTMLDivElement;
  private skipButton!: HTMLButtonElement;
  private config: CinematicTextBoxConfig;
  private autoHideTimer: number | null = null;

  constructor(config: CinematicTextBoxConfig) {
    this.config = config;
    this.container = this.createContainer();
    document.body.appendChild(this.container);
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'cinematic-text-box';
    container.innerHTML = this.getHTML();

    // Setup skip button listener
    this.skipButton = container.querySelector('.cinematic-skip-button') as HTMLButtonElement;
    if (this.skipButton) {
      this.skipButton.addEventListener('click', () => this.skip());
    }

    // Setup keyboard listener
    this.setupKeyboardListener();

    return container;
  }

  private getHTML(): string {
    const timeLabel = this.formatTimeSkip(this.config.timeSkip);
    const timePeriodClass = this.getTimePeriodClass(this.config.timeSkip);

    return `
      <button class="cinematic-skip-button">
        SKIP [ESC]
      </button>

      <div class="cinematic-header">
        <span class="cinematic-citizen-name">${this.config.citizenName}</span>
        <span class="cinematic-time-period ${timePeriodClass}">${timeLabel}</span>
      </div>

      <div class="cinematic-status">
        ${this.config.status}
      </div>

      <div class="cinematic-narrative">
        ${this.config.narrative}
      </div>
    `;
  }

  private formatTimeSkip(timeSkip: string): string {
    const labels: Record<string, string> = {
      'immediate': 'IMMEDIATE',
      '1_month': '1 MONTH LATER',
      '6_months': '6 MONTHS LATER',
      '1_year': '1 YEAR LATER',
    };
    return labels[timeSkip] || timeSkip.toUpperCase();
  }

  private getTimePeriodClass(timeSkip: string): string {
    const classes: Record<string, string> = {
      'immediate': 'immediate',
      '1_month': 'month',
      '6_months': 'six-months',
      '1_year': 'year',
    };
    return classes[timeSkip] || '';
  }

  private setupKeyboardListener(): void {
    this.keyboardHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.skip();
      }
    };
    document.addEventListener('keydown', this.keyboardHandler);
  }

  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  show(): void {
    // Already visible from creation, but can add effects here
    // Auto-hide after reading time (roughly 50ms per character, min 5s, max 10s)
    const readingTime = Math.max(5000, Math.min(10000, this.config.narrative.length * 50));
    this.autoHideTimer = window.setTimeout(() => {
      this.complete();
    }, readingTime);
  }

  hide(): void {
    // Add fade out animation
    this.container.classList.add('fadeOut');

    // Remove after animation completes
    setTimeout(() => {
      this.cleanup();
      this.config.onComplete();
    }, 300);
  }

  skip(): void {
    // Cancel auto-hide
    if (this.autoHideTimer !== null) {
      window.clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }

    // Immediate cleanup
    this.cleanup();
    this.config.onSkip();
  }

  complete(): void {
    // Cancel auto-hide
    if (this.autoHideTimer !== null) {
      window.clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }

    this.hide();
  }

  private cleanup(): void {
    // Remove keyboard listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }

    // Remove DOM element
    if (this.container && this.container.parentElement) {
      this.container.remove();
    }
  }
}
