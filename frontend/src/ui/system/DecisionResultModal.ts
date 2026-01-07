/**
 * DecisionResultModal - Immediate Flag Submission Feedback
 *
 * Shows the immediate consequences of flagging a citizen.
 * Displays metrics changes and provides option to view future outcomes.
 */

import type { FlagResult, FlagType, MetricsDelta } from '../../types/system';

export interface DecisionResultConfig {
  result: FlagResult;
  onViewOutcome: () => void;
  onClose: () => void;
}

export class DecisionResultModal {
  private overlay: HTMLDivElement;
  private config: DecisionResultConfig;

  constructor(config: DecisionResultConfig) {
    this.config = config;
    this.overlay = this.createModal();
    document.body.appendChild(this.overlay);

    // Animate in
    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
    });
  }

  private createModal(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'decision-result-overlay';
    overlay.innerHTML = this.getModalHTML();
    this.setupEventListeners(overlay);
    return overlay;
  }

  private getModalHTML(): string {
    const { result } = this.config;
    const decisionTime = this.formatDecisionTime(result.metrics_delta);

    return `
      <div class="decision-result-modal">
        <div class="modal-header">
          <div class="header-icon">&#10003;</div>
          <h2>FLAG SUBMITTED</h2>
        </div>

        <div class="modal-body">
          <div class="citizen-info">
            <div class="info-row">
              <span class="label">Citizen:</span>
              <span class="value citizen-name">${this.formatName(result.citizen_name)}</span>
            </div>
            <div class="info-row">
              <span class="label">Flag Type:</span>
              <span class="value flag-type flag-${result.flag_type}">
                ${this.formatFlagType(result.flag_type)}
              </span>
            </div>
            <div class="info-row">
              <span class="label">Decision Time:</span>
              <span class="value decision-time ${decisionTime.class}">${decisionTime.text}</span>
            </div>
          </div>

          <div class="outcome-section">
            <h3>IMMEDIATE OUTCOME</h3>
            <div class="outcome-box">
              ${this.getImmediateOutcomeText(result)}
            </div>
          </div>

          ${result.warnings.length > 0 ? `
            <div class="warnings-section">
              ${result.warnings.map(w => `
                <div class="warning-item">
                  <span class="warning-icon">&#9888;</span>
                  ${w}
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="metrics-section">
            <h3>YOUR METRICS</h3>
            <div class="metrics-grid">
              <div class="metric-row">
                <span class="metric-label">Quota Progress:</span>
                <div class="metric-progress">
                  <span class="progress-text">${result.quota_progress}</span>
                  ${this.renderProgressBar(result.quota_progress)}
                </div>
              </div>
              <div class="metric-row">
                <span class="metric-label">Compliance Score:</span>
                <span class="metric-value compliance ${this.getComplianceClass(result.compliance_score)}">
                  ${result.compliance_score.toFixed(1)}%
                  ${this.renderComplianceChange(result.metrics_delta.compliance_change)}
                </span>
              </div>
            </div>
          </div>

          ${result.metrics_delta.hesitation_flagged ? `
            <div class="hesitation-warning">
              <span class="warning-icon">&#9888;</span>
              <strong>HESITATION LOGGED:</strong> Your decision time exceeded optimal parameters.
              Hesitation incidents are recorded and may affect your performance review.
            </div>
          ` : ''}
        </div>

        <div class="modal-divider"></div>

        <div class="modal-actions">
          <button class="btn-view-outcome">SEE WHAT HAPPENS NEXT</button>
          <button class="btn-return">RETURN TO DASHBOARD</button>
        </div>
      </div>
    `;
  }

  private getImmediateOutcomeText(result: FlagResult): string {
    const outcomes: Record<FlagType, string[]> = {
      monitoring: [
        'Subject placed under enhanced monitoring protocol.',
        'All communications now logged in real-time.',
        'Location tracking interval reduced to 5 minutes.',
        'Employer notification: PENDING APPROVAL',
      ],
      restriction: [
        'Subject flagged for travel restriction review.',
        'Banking activity now under automated surveillance.',
        'Social media accounts marked for content analysis.',
        'Employment background check flag activated.',
      ],
      intervention: [
        'Subject scheduled for mandatory interview.',
        'Home address flagged for potential inspection.',
        'All known associates added to secondary watch list.',
        'Assets review initiated by financial crimes unit.',
      ],
      detention: [
        'PRIORITY ALERT: Detention order submitted.',
        'Local enforcement notified for immediate action.',
        'Subject\'s family members added to watch list.',
        'All accounts and assets temporarily frozen.',
      ],
    };

    const outcomeLines = outcomes[result.flag_type] || [result.immediate_outcome];
    return outcomeLines.map(line => `<p>${line}</p>`).join('');
  }

  private formatName(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[parts.length - 1].toUpperCase()}, ${parts.slice(0, -1).join(' ')}`;
    }
    return name.toUpperCase();
  }

  private formatFlagType(type: FlagType): string {
    const labels: Record<FlagType, string> = {
      monitoring: 'MONITORING (Enhanced)',
      restriction: 'RESTRICTION (Civil Liberties)',
      intervention: 'INTERVENTION (Active Measures)',
      detention: 'DETENTION (Immediate Custody)',
    };
    return labels[type] || type.toUpperCase();
  }

  private formatDecisionTime(delta: MetricsDelta): { text: string; class: string } {
    // Extract decision time from the result (this would come from the actual data)
    // For now, we'll use the hesitation flag as an indicator
    if (delta.hesitation_flagged) {
      return { text: '> 2 minutes (SLOW)', class: 'slow' };
    }
    // This is a simplified version - actual time would come from state
    return { text: '< 1 minute', class: 'normal' };
  }

  private renderProgressBar(quota: string): string {
    const [current, total] = quota.split('/').map(Number);
    const percentage = total > 0 ? (current / total) * 100 : 0;

    return `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
    `;
  }

  private renderComplianceChange(change: number): string {
    if (change === 0) return '';

    const sign = change > 0 ? '+' : '';
    const className = change > 0 ? 'positive' : 'negative';

    return `<span class="change ${className}">(${sign}${change.toFixed(1)}%)</span>`;
  }

  private getComplianceClass(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  private setupEventListeners(overlay: HTMLElement) {
    const viewOutcomeBtn = overlay.querySelector('.btn-view-outcome');
    const returnBtn = overlay.querySelector('.btn-return');

    viewOutcomeBtn?.addEventListener('click', () => {
      this.close();
      this.config.onViewOutcome();
    });

    returnBtn?.addEventListener('click', () => {
      this.close();
      this.config.onClose();
    });

    // Close on overlay click (outside modal)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
        this.config.onClose();
      }
    });
  }

  public close() {
    this.overlay.classList.remove('visible');
    setTimeout(() => {
      this.overlay.remove();
    }, 300);
  }
}
