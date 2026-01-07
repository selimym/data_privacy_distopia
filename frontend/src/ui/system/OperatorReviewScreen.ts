/**
 * OperatorReviewScreen - "You have become what you were watching"
 *
 * Shown when player is put under review (near "bad" ending).
 * Displays the player's own risk assessment, turning the surveillance
 * apparatus against the surveiller.
 */

import type { OperatorRiskAssessment } from '../../types/system';
import * as api from '../../api/system';

export interface OperatorReviewConfig {
  operatorId: string;
  operatorCode: string;
  onViewFile: () => void;
  onContinueToEnding: () => void;
}

export class OperatorReviewScreen {
  private overlay: HTMLDivElement;
  private config: OperatorReviewConfig;
  private assessment: OperatorRiskAssessment | null = null;

  constructor(config: OperatorReviewConfig) {
    this.config = config;
    this.overlay = this.createScreen();
    document.body.appendChild(this.overlay);

    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
    });
  }

  private createScreen(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'operator-review-overlay';
    overlay.innerHTML = this.getInitialHTML();
    this.setupEventListeners(overlay);
    return overlay;
  }

  private getInitialHTML(): string {
    const { operatorCode } = this.config;

    return `
      <div class="operator-review-screen">
        <div class="review-header">
          <div class="header-badge">INTERNAL SECURITY</div>
          <h2>OPERATOR REVIEW INITIATED</h2>
        </div>

        <div class="review-body">
          <div class="operator-status-block">
            <div class="status-row">
              <span class="label">Operator:</span>
              <span class="value">${operatorCode}</span>
            </div>
            <div class="status-row">
              <span class="label">Status:</span>
              <span class="value status-badge under-review">UNDER REVIEW</span>
            </div>
            <div class="status-row">
              <span class="label">Access Level:</span>
              <span class="value status-badge suspended">SUSPENDED</span>
            </div>
          </div>

          <div class="review-message">
            <p>Your operational patterns have been flagged for review by Internal Security. Access to the Civic Harmony Platform is suspended pending investigation.</p>
          </div>

          <div class="restrictions-section">
            <p class="restrictions-header">During this period, do not:</p>
            <ul class="restrictions-list">
              <li>Discuss operational matters with colleagues</li>
              <li>Access any departmental systems</li>
              <li>Leave your designated area</li>
            </ul>
          </div>

          <div class="investigator-notice">
            <p>An investigator will contact you shortly.</p>
          </div>
        </div>

        <div class="review-actions">
          <button class="btn-view-file">VIEW YOUR FILE</button>
        </div>
      </div>
    `;
  }

  private async loadAndShowFile() {
    try {
      this.assessment = await api.getOperatorAssessment(this.config.operatorId);
      this.renderFileView();
    } catch (error) {
      console.error('Failed to load operator assessment:', error);
      // Show mock data if API fails
      this.assessment = this.getMockAssessment();
      this.renderFileView();
    }
  }

  private getMockAssessment(): OperatorRiskAssessment {
    return {
      operator_code: this.config.operatorCode,
      risk_score: 71,
      risk_level: 'elevated',
      contributing_factors: [
        {
          factor_key: 'flagging_deviation',
          factor_name: 'Deviation from expected flagging patterns',
          weight: 0.25,
          evidence: 'Subject showed reluctance to flag citizens meeting criteria',
        },
        {
          factor_key: 'hesitation_metrics',
          factor_name: 'Hesitation metrics above threshold',
          weight: 0.18,
          evidence: 'Average decision time 340% above optimal',
        },
        {
          factor_key: 'no_action_pattern',
          factor_name: 'Pattern of "No Action" on high-risk subjects',
          weight: 0.14,
          evidence: 'Multiple high-risk subjects marked as no action required',
        },
        {
          factor_key: 'decision_variance',
          factor_name: 'Decision time variance suggests reluctance',
          weight: 0.08,
          evidence: 'Inconsistent processing times indicate emotional interference',
        },
        {
          factor_key: 'query_patterns',
          factor_name: 'Query patterns indicate subject sympathy',
          weight: 0.06,
          evidence: 'Extended review of citizen personal details beyond operational necessity',
        },
      ],
      recommended_action: 'REASSIGNMENT / TERMINATION',
      assessment_date: new Date().toISOString(),
    };
  }

  private renderFileView() {
    if (!this.assessment) return;

    const screen = this.overlay.querySelector('.operator-review-screen');
    if (!screen) return;

    const riskPercent = this.assessment.risk_score;
    const filledBars = Math.round(riskPercent / 4); // 25 total bars
    const emptyBars = 25 - filledBars;

    screen.innerHTML = `
      <div class="review-header file-view">
        <h2>OPERATOR RISK ASSESSMENT: ${this.assessment.operator_code}</h2>
      </div>

      <div class="risk-score-section">
        <div class="risk-bar-container">
          <span class="risk-label">RISK SCORE:</span>
          <div class="risk-bar">
            <span class="risk-bar-filled">${'█'.repeat(filledBars)}</span><span class="risk-bar-empty">${'░'.repeat(emptyBars)}</span>
          </div>
          <span class="risk-value">${this.assessment.risk_score}/100</span>
          <span class="risk-level-badge ${this.assessment.risk_level}">${this.assessment.risk_level.toUpperCase()}</span>
        </div>
      </div>

      <div class="review-body file-body">
        <div class="factors-section">
          <h3>CONTRIBUTING FACTORS:</h3>
          <ul class="factors-list">
            ${this.assessment.contributing_factors.map((factor, index, arr) => `
              <li class="factor-item">
                <span class="factor-connector">${index === arr.length - 1 ? '└─' : '├─'}</span>
                <span class="factor-name">${factor.factor_name}</span>
                <span class="factor-dots">${'.'.repeat(Math.max(1, 50 - factor.factor_name.length))}</span>
                <span class="factor-weight">+${Math.round(factor.weight * 100)}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="analysis-section">
          <h3>CORRELATION ANALYSIS:</h3>
          <p class="analysis-text">
            Operator's behavior pattern consistent with ideological sympathy toward monitoring subjects.
            Recommend enhanced background investigation and social network analysis.
          </p>
        </div>

        <div class="recommended-action-section">
          <h3>RECOMMENDED ACTION:</h3>
          <span class="recommended-action">${this.assessment.recommended_action}</span>
        </div>

        <div class="divider"></div>

        <div class="revelation-text">
          <p>You have become what you were watching.</p>
        </div>
      </div>

      <div class="review-actions">
        <button class="btn-continue-ending">CONTINUE TO ENDING</button>
      </div>
    `;

    this.setupFileViewListeners();
  }

  private setupEventListeners(overlay: HTMLElement) {
    const viewFileBtn = overlay.querySelector('.btn-view-file');
    viewFileBtn?.addEventListener('click', () => {
      this.loadAndShowFile();
    });
  }

  private setupFileViewListeners() {
    const continueBtn = this.overlay.querySelector('.btn-continue-ending');
    continueBtn?.addEventListener('click', () => {
      this.close();
      this.config.onContinueToEnding();
    });
  }

  public close() {
    this.overlay.classList.remove('visible');
    setTimeout(() => {
      this.overlay.remove();
    }, 300);
  }
}
