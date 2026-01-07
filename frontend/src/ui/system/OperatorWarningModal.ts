/**
 * OperatorWarningModal - Performance Advisory Notice
 *
 * Shown when player's compliance drops or they show signs of
 * "deviation" from expected operational parameters.
 * The bureaucratic language masks the horror of being watched.
 */

export interface WarningMetrics {
  quotaCompletionRate: number;
  expectedRate: number;
  noActionCount: number;
  noActionThreshold: number;
  avgDecisionTime: number;
  expectedDecisionTime: number;
  hesitationIncidents: number;
}

export interface OperatorWarningConfig {
  operatorCode: string;
  warningType: 'performance_advisory' | 'formal_warning' | 'final_notice';
  metrics: WarningMetrics;
  warningNumber: number;
  onAcknowledge: () => void;
}

export class OperatorWarningModal {
  private overlay: HTMLDivElement;
  private config: OperatorWarningConfig;

  constructor(config: OperatorWarningConfig) {
    this.config = config;
    this.overlay = this.createModal();
    document.body.appendChild(this.overlay);

    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
    });
  }

  private createModal(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'operator-warning-overlay';
    overlay.innerHTML = this.getModalHTML();
    this.setupEventListeners(overlay);
    return overlay;
  }

  private getModalHTML(): string {
    const { operatorCode, warningType, metrics, warningNumber } = this.config;
    const severity = this.getSeverityInfo(warningType);

    return `
      <div class="operator-warning-modal ${warningType}">
        <div class="warning-header">
          <span class="warning-icon">${severity.icon}</span>
          <h2>OPERATOR NOTICE</h2>
        </div>

        <div class="warning-body">
          <div class="operator-info">
            <div class="info-row">
              <span class="label">Operator:</span>
              <span class="value">${operatorCode}</span>
            </div>
            <div class="info-row">
              <span class="label">Notice Type:</span>
              <span class="value notice-type ${warningType}">${severity.label}</span>
            </div>
            ${warningNumber > 1 ? `
              <div class="info-row">
                <span class="label">Warning Count:</span>
                <span class="value warning-count">${warningNumber}</span>
              </div>
            ` : ''}
          </div>

          <div class="warning-message">
            <p>${severity.message}</p>
          </div>

          <div class="metrics-section">
            <ul class="metric-list">
              ${this.renderMetricItem(
                'Quota completion rate',
                `${metrics.quotaCompletionRate}%`,
                `expected: >${metrics.expectedRate}%`,
                metrics.quotaCompletionRate < metrics.expectedRate
              )}
              ${metrics.noActionCount > 0 ? this.renderMetricItem(
                '"No Action" decisions',
                metrics.noActionCount.toString(),
                metrics.noActionCount > metrics.noActionThreshold ? 'above threshold' : 'within threshold',
                metrics.noActionCount > metrics.noActionThreshold
              ) : ''}
              ${this.renderMetricItem(
                'Average decision time',
                `${metrics.avgDecisionTime}s`,
                `expected: <${metrics.expectedDecisionTime}s`,
                metrics.avgDecisionTime > metrics.expectedDecisionTime
              )}
              ${metrics.hesitationIncidents > 0 ? this.renderMetricItem(
                'Hesitation incidents',
                metrics.hesitationIncidents.toString(),
                'logged',
                true
              ) : ''}
            </ul>
          </div>

          <div class="warning-footer-text">
            <p class="logged-notice">This notice has been logged in your personnel file.</p>
            <p class="consequence-warning">${severity.consequence}</p>
          </div>
        </div>

        <div class="warning-actions">
          <button class="btn-acknowledge">ACKNOWLEDGE</button>
        </div>
      </div>
    `;
  }

  private renderMetricItem(
    label: string,
    value: string,
    expected: string,
    isBad: boolean
  ): string {
    return `
      <li class="${isBad ? 'bad' : 'ok'}">
        <span class="metric-bullet">${isBad ? '!' : '-'}</span>
        <span class="metric-label">${label}:</span>
        <span class="metric-value">${value}</span>
        <span class="metric-expected">(${expected})</span>
      </li>
    `;
  }

  private getSeverityInfo(type: string): {
    icon: string;
    label: string;
    message: string;
    consequence: string;
  } {
    switch (type) {
      case 'formal_warning':
        return {
          icon: '&#9888;&#9888;',
          label: 'FORMAL WARNING',
          message: 'Your operational performance has fallen significantly below acceptable standards. This is an official warning.',
          consequence: 'Further deviation will result in immediate operational review and potential suspension.',
        };
      case 'final_notice':
        return {
          icon: '&#9888;&#9888;&#9888;',
          label: 'FINAL NOTICE',
          message: 'This is your final warning. Your behavior pattern has been flagged for Internal Security review.',
          consequence: 'Any further non-compliance will result in immediate suspension and investigation.',
        };
      default:
        return {
          icon: '&#9888;',
          label: 'PERFORMANCE ADVISORY',
          message: 'Your recent performance metrics indicate deviation from expected operational parameters:',
          consequence: 'Continued deviation may result in operational review.',
        };
    }
  }

  private setupEventListeners(overlay: HTMLElement) {
    const acknowledgeBtn = overlay.querySelector('.btn-acknowledge');
    acknowledgeBtn?.addEventListener('click', () => {
      this.close();
      this.config.onAcknowledge();
    });
  }

  public close() {
    this.overlay.classList.remove('visible');
    setTimeout(() => {
      this.overlay.remove();
    }, 300);
  }
}
