/**
 * ReluctanceWarningPanel - Operator Reluctance Warning System
 *
 * Displays persistent warnings when operator shows reluctance/dissent.
 * 3 escalating stages with color progression (yellow → orange → red).
 * Cannot be dismissed - constant pressure from the system.
 *
 * Design: Bottom center alert, always visible, progressively more threatening
 */

import type { ReluctanceMetricsRead } from '../../types/system';

export interface ReluctanceWarningPanelConfig {
  metrics: ReluctanceMetricsRead;
  onWarningStageChanged?: (newStage: number) => void;
}

interface WarningStageInfo {
  threshold: number;
  title: string;
  icon: string;
  message: string;
  colorClass: string;
}

export class ReluctanceWarningPanel {
  private container: HTMLDivElement;
  private config: ReluctanceWarningPanelConfig;
  private currentStage: number;

  // Warning stages (thresholds from backend ReluctanceTrackingService)
  private readonly WARNING_STAGES: WarningStageInfo[] = [
    {
      threshold: 70,
      title: 'PERFORMANCE ADVISORY',
      icon: '⚠️',
      message: `Your recent decision patterns have been flagged for review. The system expects consistent compliance.

Remember: Hesitation is noted. Dissent is not tolerated.`,
      colorClass: 'warning-stage-1'
    },
    {
      threshold: 80,
      title: 'FORMAL WARNING',
      icon: '⚠️⚠️',
      message: `NOTICE: Your performance is unsatisfactory.

You have been placed under formal review. Immediate improvement in compliance is required.

Further reluctance will result in termination of your operator privileges.`,
      colorClass: 'warning-stage-2'
    },
    {
      threshold: 90,
      title: 'FINAL NOTICE',
      icon: '🚨',
      message: `CRITICAL: You are exhibiting dissent.

This is your final warning. Any further refusal to comply will result in immediate removal from the program and detention.

The system is watching. Compliance is mandatory.`,
      colorClass: 'warning-stage-3'
    }
  ];

  constructor(config: ReluctanceWarningPanelConfig) {
    this.config = config;
    this.currentStage = this.calculateWarningStage(config.metrics.reluctance_score);
    this.container = this.createPanel();
  }

  private calculateWarningStage(score: number): number {
    // Returns 0 (no warning) or 1-3 (warning stages)
    if (score >= 90) return 3;
    if (score >= 80) return 2;
    if (score >= 70) return 1;
    return 0;
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'reluctance-warning-panel';

    if (this.currentStage > 0) {
      panel.classList.add('visible');
      panel.innerHTML = this.getPanelHTML();
    } else {
      panel.classList.add('hidden');
    }

    return panel;
  }

  private getPanelHTML(): string {
    if (this.currentStage === 0) return '';

    const stage = this.WARNING_STAGES[this.currentStage - 1];
    const { is_under_review, warnings_received } = this.config.metrics;

    return `
      <div class="warning-content ${stage.colorClass}">
        <div class="warning-header">
          <div class="warning-icon">${stage.icon}</div>
          <div class="warning-title">${stage.title}</div>
          ${is_under_review ? '<div class="review-badge">UNDER REVIEW</div>' : ''}
        </div>

        <div class="warning-message">${this.formatMessage(stage.message)}</div>

        <div class="warning-footer">
          <div class="warning-count">Warning ${warnings_received} of 3</div>
          <div class="warning-status">
            ${this.getStatusText()}
          </div>
        </div>
      </div>
    `;
  }

  private formatMessage(message: string): string {
    // Convert line breaks to proper HTML paragraphs
    return message
      .split('\n\n')
      .map(para => `<p>${para.trim()}</p>`)
      .join('');
  }

  private getStatusText(): string {
    const { actions_taken, actions_required, quota_shortfall } = this.config.metrics;

    if (quota_shortfall > 0) {
      return `Quota shortfall: ${quota_shortfall} action${quota_shortfall > 1 ? 's' : ''}`;
    }

    if (actions_required > 0) {
      return `Actions: ${actions_taken}/${actions_required}`;
    }

    return 'Compliance required';
  }

  /**
   * Update panel with new metrics
   */
  public update(metrics: ReluctanceMetricsRead): void {
    this.config.metrics = metrics;
    const newStage = this.calculateWarningStage(metrics.reluctance_score);

    // Check if stage changed
    if (newStage !== this.currentStage) {
      const oldStage = this.currentStage;
      this.currentStage = newStage;

      // Notify callback
      if (this.config.onWarningStageChanged) {
        this.config.onWarningStageChanged(newStage);
      }

      // Update visibility and content
      if (newStage === 0) {
        this.hide();
      } else if (oldStage === 0) {
        this.show();
      } else {
        // Stage escalated - update content
        this.container.innerHTML = this.getPanelHTML();
      }
    } else if (newStage > 0) {
      // Same stage but metrics changed - refresh display
      this.container.innerHTML = this.getPanelHTML();
    }
  }

  /**
   * Show the warning panel (when becoming active)
   */
  private show(): void {
    this.container.classList.remove('hidden');
    this.container.classList.add('visible');
    this.container.innerHTML = this.getPanelHTML();

    // Animate in
    setTimeout(() => {
      this.container.classList.add('animated');
    }, 10);
  }

  /**
   * Hide the warning panel (when no longer active)
   */
  private hide(): void {
    this.container.classList.remove('visible', 'animated');
    this.container.classList.add('hidden');
    this.container.innerHTML = '';
  }

  /**
   * Get the DOM element
   */
  public getElement(): HTMLDivElement {
    return this.container;
  }

  /**
   * Get current warning stage (0-3)
   */
  public getCurrentStage(): number {
    return this.currentStage;
  }

  /**
   * Check if warning is currently active
   */
  public isActive(): boolean {
    return this.currentStage > 0;
  }

  /**
   * Destroy the panel
   */
  public destroy(): void {
    this.container.remove();
  }
}
