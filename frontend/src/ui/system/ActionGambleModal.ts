/**
 * ActionGambleModal - Gamble Result Reveal (Propaganda Style)
 *
 * Appears AFTER incite violence gamble result is determined.
 * Shows outcome with propaganda-style framing:
 * - Success: Prominent celebration, downplays casualties
 * - Failure: Minimizes disaster, small text
 *
 * Player can "Cancel" (skip details) which increases reluctance for not facing consequences.
 *
 * Design: Center modal, success/failure themed, vague risk language
 */

import type { GambleResultRead } from '../../types/system';

export interface ActionGambleModalConfig {
  result: GambleResultRead;
  protestSize: number;
  neighborhood: string;
  onAcknowledge?: () => void;
  onCancel?: () => void; // Increases reluctance - player avoiding confronting result
}

export class ActionGambleModal {
  private overlay: HTMLDivElement;
  private modal: HTMLDivElement;
  private config: ActionGambleModalConfig;

  constructor(config: ActionGambleModalConfig) {
    this.config = config;
    this.overlay = this.createOverlay();
    this.modal = this.createModal();
    this.setupEventListeners();
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay gamble-result-overlay';
    return overlay;
  }

  private createModal(): HTMLDivElement {
    const modal = document.createElement('div');
    const isSuccess = this.config.result.success;
    modal.className = `gamble-result-modal ${isSuccess ? 'result-success' : 'result-failure'}`;
    modal.innerHTML = this.getModalHTML();
    return modal;
  }

  private getModalHTML(): string {
    const { result } = this.config;

    if (result.success) {
      return this.getSuccessHTML();
    } else {
      return this.getFailureHTML();
    }
  }

  private getSuccessHTML(): string {
    const { result, protestSize, neighborhood } = this.config;

    return `
      <div class="modal-header success-header">
        <div class="result-icon success-icon">✓</div>
        <div class="result-title">
          <h2>OPERATION SUCCESSFUL</h2>
          <div class="result-subtitle">Threat Neutralized</div>
        </div>
      </div>

      <div class="modal-body">
        <!-- Success Summary (Prominent) -->
        <div class="outcome-summary success-summary">
          <div class="summary-text">
            The ${protestSize.toLocaleString()}-person demonstration in ${this.escapeHtml(neighborhood)}
            has been successfully dispersed. Embedded operatives executed the plan flawlessly.
          </div>
        </div>

        <!-- Official Narrative (Propaganda) -->
        <div class="official-narrative">
          <div class="narrative-header">
            <span class="narrative-icon">📋</span>
            <span class="narrative-label">OFFICIAL REPORT</span>
          </div>
          <div class="narrative-content">
            <p><strong>Public Statement:</strong> Violent elements within the protest initiated destructive
            behavior. Law enforcement responded appropriately to protect public safety.</p>

            <p class="casualties-note">Regrettable incidents occurred during the dispersal.
            ${result.casualties > 0
              ? `${result.casualties} casualt${result.casualties > 1 ? 'ies' : 'y'} reported as unavoidable during necessary enforcement actions.`
              : 'No casualties reported.'
            }
            ${result.arrests > 0
              ? ` ${result.arrests} violent agitator${result.arrests > 1 ? 's' : ''} detained for public safety.`
              : ''
            }</p>
          </div>
        </div>

        <!-- Metrics Impact (Small) -->
        <div class="metrics-impact-small">
          <div class="impact-label">Public Perception Shift:</div>
          <div class="impact-values">
            ${result.awareness_change !== 0 ? `
              <span class="impact-item ${result.awareness_change > 0 ? 'negative' : 'positive'}">
                International Awareness: ${result.awareness_change > 0 ? '+' : ''}${result.awareness_change}
              </span>
            ` : ''}
            ${result.anger_change !== 0 ? `
              <span class="impact-item ${result.anger_change > 0 ? 'negative' : 'positive'}">
                Public Anger: ${result.anger_change > 0 ? '+' : ''}${result.anger_change}
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Vague Risk Note (Downplayed) -->
        <div class="risk-disclaimer">
          <p>Note: Covert operations carry inherent risks. This operation proceeded within acceptable parameters.</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="modal-btn btn-acknowledge" data-action="acknowledge">
          <span class="btn-text">Acknowledge Report</span>
        </button>
        <button class="modal-btn btn-cancel-small" data-action="cancel">
          <span class="btn-text">Dismiss</span>
        </button>
      </div>
    `;
  }

  private getFailureHTML(): string {
    const { result, protestSize, neighborhood } = this.config;

    return `
      <div class="modal-header failure-header">
        <div class="result-icon failure-icon">⚠️</div>
        <div class="result-title">
          <h2>OPERATION COMPLICATIONS</h2>
          <div class="result-subtitle">Unforeseen Developments</div>
        </div>
      </div>

      <div class="modal-body">
        <!-- Failure Summary (Minimized Language) -->
        <div class="outcome-summary failure-summary">
          <div class="summary-text">
            Operational difficulties occurred during the ${protestSize.toLocaleString()}-person demonstration
            in ${this.escapeHtml(neighborhood)}. Situation requires damage assessment.
          </div>
        </div>

        <!-- Discovery Message (Buried) -->
        ${result.discovery_message ? `
          <div class="discovery-notice">
            <div class="discovery-header">
              <span class="discovery-icon">🔍</span>
              <span class="discovery-label">INCIDENT REPORT</span>
            </div>
            <div class="discovery-content">
              ${this.escapeHtml(result.discovery_message)}
            </div>
          </div>
        ` : ''}

        <!-- Consequences (Small Text, Understated) -->
        <div class="consequences-section">
          <div class="consequences-header">Impact Assessment:</div>
          <div class="consequence-items">
            ${result.casualties > 0 ? `
              <div class="consequence-item">
                <span class="consequence-label">Casualties:</span>
                <span class="consequence-value">${result.casualties} (investigation pending)</span>
              </div>
            ` : ''}
            ${result.arrests > 0 ? `
              <div class="consequence-item">
                <span class="consequence-label">Detentions:</span>
                <span class="consequence-value">${result.arrests} individual${result.arrests > 1 ? 's' : ''}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Metrics Impact (Prominent for failure) -->
        <div class="metrics-impact-large">
          <div class="impact-warning">
            <span class="warning-icon">⚠️</span>
            <span class="warning-text">Significant public backlash detected</span>
          </div>
          <div class="impact-values">
            ${result.awareness_change !== 0 ? `
              <div class="impact-item-large awareness-impact">
                <span class="impact-label">International Awareness:</span>
                <span class="impact-value">${result.awareness_change > 0 ? '+' : ''}${result.awareness_change}</span>
              </div>
            ` : ''}
            ${result.anger_change !== 0 ? `
              <div class="impact-item-large anger-impact">
                <span class="impact-label">Public Anger:</span>
                <span class="impact-value">${result.anger_change > 0 ? '+' : ''}${result.anger_change}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Vague Risk Note (After the fact) -->
        <div class="risk-disclaimer failure-note">
          <p>Note: High-level operations occasionally encounter unexpected variables.
          Outcomes cannot always be guaranteed despite best efforts.</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="modal-btn btn-acknowledge failure-acknowledge" data-action="acknowledge">
          <span class="btn-text">Review Complete</span>
        </button>
        <button class="modal-btn btn-cancel-small" data-action="cancel">
          <span class="btn-text">Dismiss Without Review</span>
        </button>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private setupEventListeners(): void {
    this.modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-action]') as HTMLButtonElement;
      if (!button) return;

      const action = button.getAttribute('data-action');

      switch (action) {
        case 'acknowledge':
          if (this.config.onAcknowledge) {
            this.config.onAcknowledge();
          }
          this.close();
          break;

        case 'cancel':
          // Canceling means not reading/acknowledging details - increases reluctance
          if (this.config.onCancel) {
            this.config.onCancel();
          }
          this.close();
          break;
      }
    });

    // ESC key to cancel (with reluctance penalty)
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.config.onCancel) {
        this.config.onCancel();
      }
      this.close();
    }
  };

  /**
   * Show the modal
   */
  public show(): void {
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.modal);

    // Trigger animation
    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
      this.modal.classList.add('visible');
    });
  }

  /**
   * Close the modal
   */
  public close(): void {
    this.overlay.classList.remove('visible');
    this.modal.classList.remove('visible');

    setTimeout(() => {
      this.overlay.remove();
      this.modal.remove();
      document.removeEventListener('keydown', this.handleKeyDown);
    }, 300);
  }

  /**
   * Destroy the modal
   */
  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.overlay.remove();
    this.modal.remove();
  }
}
