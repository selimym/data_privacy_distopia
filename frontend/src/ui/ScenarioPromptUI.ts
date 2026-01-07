/**
 * Scenario Prompt UI
 *
 * Floating narrative prompt with typewriter effect
 */

import type { ScenarioPrompt } from '../types/scenario';

export class ScenarioPromptUI {
  private container: HTMLDivElement;
  private prompt: ScenarioPrompt;
  private onDismiss: () => void;
  private typewriterIndex: number = 0;
  private typewriterInterval: number | null = null;

  constructor(prompt: ScenarioPrompt, onDismiss: () => void) {
    this.prompt = prompt;
    this.onDismiss = onDismiss;
    this.container = document.createElement('div');
    this.container.className = 'scenario-prompt-container';
    this.render();
  }

  private render() {
    this.container.innerHTML = `
      <div class="scenario-prompt">
        <div class="prompt-phase">${this.formatPhase(this.prompt.phase)}</div>
        <div class="prompt-text" id="prompt-text"></div>
        ${
          this.prompt.suggested_action || this.prompt.suggested_target
            ? `
          <div class="prompt-suggestion">
            ${
              this.prompt.suggested_target
                ? `
              <span class="suggestion-label">Suggested target:</span>
              <span class="suggestion-value">${this.prompt.suggested_target.first_name} ${this.prompt.suggested_target.last_name}</span>
            `
                : ''
            }
            ${
              this.prompt.suggested_action
                ? `
              <span class="suggestion-label">Suggested action:</span>
              <span class="suggestion-value">${this.prompt.suggested_action.name}</span>
            `
                : ''
            }
          </div>
        `
            : ''
        }
        <button class="btn-dismiss" id="dismiss-prompt">Continue</button>
      </div>
    `;

    this.startTypewriter();
    this.attachEventListeners();
  }

  private startTypewriter() {
    const textElement = this.container.querySelector(
      '#prompt-text'
    ) as HTMLDivElement;
    if (!textElement) return;

    const text = this.prompt.prompt_text;
    this.typewriterIndex = 0;

    // Start typewriter effect
    this.typewriterInterval = window.setInterval(() => {
      if (this.typewriterIndex < text.length) {
        textElement.textContent = text.slice(0, this.typewriterIndex + 1);
        this.typewriterIndex++;
      } else {
        // Finished typing
        if (this.typewriterInterval !== null) {
          clearInterval(this.typewriterInterval);
          this.typewriterInterval = null;
        }
      }
    }, 30); // 30ms per character
  }

  private stopTypewriter() {
    if (this.typewriterInterval !== null) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }

    // Show full text immediately
    const textElement = this.container.querySelector(
      '#prompt-text'
    ) as HTMLDivElement;
    if (textElement) {
      textElement.textContent = this.prompt.prompt_text;
    }
  }

  private formatPhase(phase: string): string {
    // Convert snake_case to Title Case
    return phase
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private attachEventListeners() {
    const dismissBtn = this.container.querySelector(
      '#dismiss-prompt'
    ) as HTMLButtonElement;

    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this.hide();
        this.onDismiss();
      });
    }

    // Click anywhere on prompt to skip typewriter
    this.container.addEventListener('click', (e) => {
      if (e.target !== dismissBtn && this.typewriterInterval !== null) {
        this.stopTypewriter();
      }
    });

    // Auto-dismiss after reading (10 seconds after typewriter finishes)
    const autoDismissDelay =
      this.prompt.prompt_text.length * 30 + 10000;
    setTimeout(() => {
      this.fadeOut();
    }, autoDismissDelay);
  }

  private fadeOut() {
    this.container.classList.add('fading-out');
    setTimeout(() => {
      this.hide();
      this.onDismiss();
    }, 500);
  }

  public show() {
    document.body.appendChild(this.container);
    // Trigger animation
    setTimeout(() => {
      this.container.classList.add('visible');
    }, 10);
  }

  public hide() {
    if (this.typewriterInterval !== null) {
      clearInterval(this.typewriterInterval);
    }
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}
