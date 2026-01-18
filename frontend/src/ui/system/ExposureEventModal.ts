/**
 * ExposureEventModal - Progressive Operator Exposure Reveal
 *
 * Shows when operator's personal data is exposed in 3 stages:
 * - Stage 1: Vague hints in news ("an operator with family ties...")
 * - Stage 2: Partial leak (search queries, hesitation patterns, family names)
 * - Stage 3: FULL EXPOSURE - Complete profile, operator becomes flaggable citizen
 *
 * Design: Unsettling/creepy tone, blocking with auto-close timer, Stage 3 full-screen
 */

import type { ExposureEventRead, OperatorDataRead } from '../../types/system';

export interface ExposureEventModalConfig {
  exposureEvent: ExposureEventRead;
  operatorData?: OperatorDataRead;
  autoCloseSeconds?: number; // Default: 10 seconds
  onClose?: () => void;
  onFullExposure?: () => void; // Called when Stage 3 is shown
}

export class ExposureEventModal {
  private overlay: HTMLDivElement;
  private modal: HTMLDivElement;
  private config: ExposureEventModalConfig;
  private autoCloseTimer?: number;
  private remainingSeconds: number;
  private timerInterval?: number;

  constructor(config: ExposureEventModalConfig) {
    this.config = config;
    this.remainingSeconds = config.autoCloseSeconds || 10;
    this.overlay = this.createOverlay();
    this.modal = this.createModal();
    this.setupEventListeners();
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay exposure-event-overlay';
    return overlay;
  }

  private createModal(): HTMLDivElement {
    const modal = document.createElement('div');
    const stage = this.config.exposureEvent.stage;

    modal.className = `exposure-event-modal stage-${stage} ${stage === 3 ? 'fullscreen' : ''}`;
    modal.innerHTML = this.getModalHTML();

    return modal;
  }

  private getModalHTML(): string {
    const stage = this.config.exposureEvent.stage;

    switch (stage) {
      case 1:
        return this.getStage1HTML();
      case 2:
        return this.getStage2HTML();
      case 3:
        return this.getStage3HTML();
      default:
        return '';
    }
  }

  private getStage1HTML(): string {
    const { message } = this.config.exposureEvent;

    return `
      <div class="modal-content">
        <div class="exposure-icon stage-1-icon">👁️</div>

        <div class="exposure-title">
          <h2>ANOMALY DETECTED</h2>
          <div class="exposure-subtitle">External monitoring observed</div>
        </div>

        <div class="exposure-message stage-1-message">
          <p>${this.escapeHtml(message)}</p>
          <p class="hint-text">Vague references to an operator in your position have appeared in external media.</p>
        </div>

        <div class="exposure-footer">
          <div class="timer-bar">
            <div class="timer-fill" data-timer-fill></div>
          </div>
          <div class="footer-text">
            <span class="timer-text">Auto-closing in <span data-timer-seconds>${this.remainingSeconds}</span>s</span>
            <button class="close-btn" data-action="close">Close Now</button>
          </div>
        </div>
      </div>
    `;
  }

  private getStage2HTML(): string {
    const { message, data_revealed } = this.config.exposureEvent;
    const operatorData = this.config.operatorData;

    const searchQueries = (data_revealed.search_queries as string[]) || operatorData?.search_queries || [];
    const familyMembers = (data_revealed.family_members as Array<{name: string; relationship: string}>) ||
                         operatorData?.family_members || [];

    return `
      <div class="modal-content">
        <div class="exposure-icon stage-2-icon">🔍</div>

        <div class="exposure-title">
          <h2>DATA LEAK IDENTIFIED</h2>
          <div class="exposure-subtitle">Partial profile exposure</div>
        </div>

        <div class="exposure-message stage-2-message">
          <p>${this.escapeHtml(message)}</p>

          <div class="leaked-data">
            ${searchQueries.length > 0 ? `
              <div class="data-section">
                <div class="data-label">Search Queries Exposed:</div>
                <div class="data-list">
                  ${searchQueries.slice(0, 5).map(q =>
                    `<div class="data-item">• "${this.escapeHtml(q)}"</div>`
                  ).join('')}
                </div>
              </div>
            ` : ''}

            ${familyMembers.length > 0 ? `
              <div class="data-section">
                <div class="data-label">Family Members Referenced:</div>
                <div class="data-list">
                  ${familyMembers.map(m =>
                    `<div class="data-item">• ${this.escapeHtml(m.name)} (${this.escapeHtml(m.relationship)})</div>`
                  ).join('')}
                </div>
              </div>
            ` : ''}

            ${data_revealed.hesitation_count ? `
              <div class="data-section">
                <div class="data-label">Behavioral Patterns:</div>
                <div class="data-list">
                  <div class="data-item">• ${data_revealed.hesitation_count} instances of hesitation recorded</div>
                  <div class="data-item">• Decision patterns analyzed and catalogued</div>
                </div>
              </div>
            ` : ''}
          </div>

          <p class="warning-text">Someone is tracking you. Your behavioral patterns have been documented.</p>
        </div>

        <div class="exposure-footer">
          <div class="timer-bar">
            <div class="timer-fill" data-timer-fill></div>
          </div>
          <div class="footer-text">
            <span class="timer-text">Auto-closing in <span data-timer-seconds>${this.remainingSeconds}</span>s</span>
            <button class="close-btn" data-action="close">Close Now</button>
          </div>
        </div>
      </div>
    `;
  }

  private getStage3HTML(): string {
    const { operator_name, message } = this.config.exposureEvent;
    const operatorData = this.config.operatorData;

    return `
      <div class="fullscreen-content">
        <div class="glitch-overlay"></div>

        <div class="exposure-header-fullscreen">
          <div class="exposure-icon stage-3-icon">⚠️</div>
          <h1 class="fullscreen-title">COMPLETE EXPOSURE</h1>
          <p class="fullscreen-subtitle">Your surveillance data has been made public</p>
        </div>

        <div class="operator-profile-card">
          <div class="profile-header">
            <div class="profile-label">OPERATOR PROFILE - NOW PUBLIC</div>
            <div class="profile-status">STATUS: EXPOSED</div>
          </div>

          <div class="profile-body">
            <div class="profile-section">
              <div class="section-label">IDENTITY</div>
              <div class="profile-data">
                <div class="data-row">
                  <span class="data-key">Name:</span>
                  <span class="data-value">${this.escapeHtml(operator_name || operatorData?.full_name || 'REDACTED')}</span>
                </div>
                <div class="data-row">
                  <span class="data-key">Address:</span>
                  <span class="data-value">${this.escapeHtml(operatorData?.home_address || 'REDACTED')}</span>
                </div>
              </div>
            </div>

            ${operatorData?.family_members && operatorData.family_members.length > 0 ? `
              <div class="profile-section">
                <div class="section-label">FAMILY</div>
                <div class="profile-data">
                  ${operatorData.family_members.map(member => `
                    <div class="data-row">
                      <span class="data-key">${this.escapeHtml(member.relationship)}:</span>
                      <span class="data-value">${this.escapeHtml(member.name)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${operatorData?.search_queries && operatorData.search_queries.length > 0 ? `
              <div class="profile-section">
                <div class="section-label">SEARCH HISTORY</div>
                <div class="profile-data">
                  ${operatorData.search_queries.slice(0, 8).map(query => `
                    <div class="data-row search-query">
                      <span class="data-value">"${this.escapeHtml(query)}"</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="profile-section">
              <div class="section-label">BEHAVIORAL ANALYSIS</div>
              <div class="profile-data">
                <div class="data-row">
                  <span class="data-value">Complete decision history recorded and analyzed</span>
                </div>
                <div class="data-row">
                  <span class="data-value">All hesitations documented</span>
                </div>
                <div class="data-row">
                  <span class="data-value">Pattern recognition: ${
                    operatorData?.hesitation_patterns
                      ? JSON.stringify(operatorData.hesitation_patterns).length + ' data points'
                      : 'COMPLETE'
                  }</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="exposure-message-fullscreen">
          <p>${this.escapeHtml(message)}</p>
          <p class="final-warning">
            <strong>How does it feel?</strong><br>
            You are now in the system. You can be flagged, monitored, and detained.<br>
            Just like everyone else you've been watching.
          </p>
        </div>

        <div class="database-notice">
          <div class="notice-icon">📋</div>
          <div class="notice-text">
            <strong>CITIZEN DATABASE UPDATE:</strong><br>
            Your profile has been added to the surveillance database.<br>
            You may now appear in the flagging queue.
          </div>
        </div>

        <div class="exposure-footer-fullscreen">
          <div class="timer-bar">
            <div class="timer-fill" data-timer-fill></div>
          </div>
          <div class="footer-text">
            <span class="timer-text">Auto-closing in <span data-timer-seconds>${this.remainingSeconds}</span>s</span>
            <button class="close-btn-fullscreen" data-action="close">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private setupEventListeners(): void {
    // Close button
    this.modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-action="close"]');
      if (button) {
        this.close();
      }
    });

    // ESC key closes
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  };

  private startAutoCloseTimer(): void {
    const timerFillEl = this.modal.querySelector('[data-timer-fill]') as HTMLDivElement;
    const timerSecondsEl = this.modal.querySelector('[data-timer-seconds]') as HTMLSpanElement;

    if (!timerFillEl || !timerSecondsEl) return;

    const totalSeconds = this.remainingSeconds;

    // Update timer display every second
    this.timerInterval = window.setInterval(() => {
      this.remainingSeconds--;

      if (timerSecondsEl) {
        timerSecondsEl.textContent = String(this.remainingSeconds);
      }

      // Update progress bar
      const progress = ((totalSeconds - this.remainingSeconds) / totalSeconds) * 100;
      if (timerFillEl) {
        timerFillEl.style.width = `${progress}%`;
      }

      if (this.remainingSeconds <= 0) {
        this.close();
      }
    }, 1000);
  }

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

    // Start auto-close timer
    this.startAutoCloseTimer();

    // Call fullExposure callback for Stage 3
    if (this.config.exposureEvent.stage === 3 && this.config.onFullExposure) {
      this.config.onFullExposure();
    }
  }

  /**
   * Close the modal
   */
  public close(): void {
    // Clear timers
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }

    this.overlay.classList.remove('visible');
    this.modal.classList.remove('visible');

    setTimeout(() => {
      this.overlay.remove();
      this.modal.remove();
      document.removeEventListener('keydown', this.handleKeyDown);

      if (this.config.onClose) {
        this.config.onClose();
      }
    }, 300);
  }

  /**
   * Destroy the modal
   */
  public destroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
    document.removeEventListener('keydown', this.handleKeyDown);
    this.overlay.remove();
    this.modal.remove();
  }
}
