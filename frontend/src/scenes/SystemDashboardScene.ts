import Phaser from 'phaser';
import { systemState } from '../state/SystemState';
import type { CaseOverview, FlagResult, FlagType, RiskLevel, CinematicData, CitizenOutcome, ExposureEventRead, OperatorDataRead } from '../types/system';
import { NewActionType } from '../types';
import { MessagesPanel } from '../ui/system/MessagesPanel';
import { DecisionResultModal } from '../ui/system/DecisionResultModal';
import { OutcomeViewer } from '../ui/system/OutcomeViewer';
import { PublicMetricsDisplay } from '../ui/system/PublicMetricsDisplay';
import { ReluctanceWarningPanel } from '../ui/system/ReluctanceWarningPanel';
import { NewsFeedPanel } from '../ui/system/NewsFeedPanel';
import { ProtestAlertModal } from '../ui/system/ProtestAlertModal';
import { ActionGambleModal } from '../ui/system/ActionGambleModal';
import { ExposureEventModal } from '../ui/system/ExposureEventModal';
import { getSystemAudioManager } from '../audio/SystemAudioManager';
import { getSystemVisualEffects } from '../ui/system/SystemVisualEffects';
import * as systemApi from '../api/system';
import { getNPCsBatch, getNPC } from '../api/npcs';
import { generateActionCinematic, getDefaultCinematicLocation } from '../utils/cinematicGenerator';

/**
 * SystemDashboardScene - Main surveillance operator interface.
 * Renders the "Civic Harmony Platform" dashboard with case queue,
 * directives, metrics, and alerts.
 */
export class SystemDashboardScene extends Phaser.Scene {
  private container!: HTMLDivElement;
  private unsubscribe: (() => void) | null = null;
  private sessionId: string | null = null;
  private decisionTimerInterval: number | null = null;
  private messagesPanel: MessagesPanel | null = null;
  private publicMetricsDisplay: PublicMetricsDisplay | null = null;
  private reluctanceWarningPanel: ReluctanceWarningPanel | null = null;
  private newsFeedPanel: NewsFeedPanel | null = null;
  private shownProtestIds: Set<string> = new Set();
  private currentProtestModal: ProtestAlertModal | null = null;
  private lastShownExposureStage: number = 0;
  private citizenPanelAbortController: AbortController | null = null;

  constructor() {
    super({ key: 'SystemDashboardScene' });
  }

  init(data: { sessionId: string }) {
    this.sessionId = data.sessionId;
  }

  async create() {
    // Initialize audio and visual effects
    const audioManager = getSystemAudioManager();
    audioManager.init();
    audioManager.startAmbient();

    const visualEffects = getSystemVisualEffects();
    visualEffects.init({ crtEnabled: true, weekNumber: 1 });

    this.createDashboardUI();
    this.setupStateSubscription();
    this.initializePublicMetrics();
    this.initializeReluctanceWarning();
    this.initializeNewsFeed();

    // Add data flow background
    visualEffects.addDataFlowBackground(this.container);

    if (this.sessionId) {
      await systemState.initialize(this.sessionId);

      // Check if directive is completed and time should advance
      // This happens when returning from cinematics
      await this.checkAndAdvanceTime();
    }
  }

  private createDashboardUI() {
    this.container = document.createElement('div');
    this.container.className = 'system-dashboard';
    this.container.innerHTML = this.getDashboardHTML();
    document.body.appendChild(this.container);
    this.setupEventListeners();
  }

  private getDashboardHTML(): string {
    return `
      <div class="system-header">
        <div class="header-brand">
          <span class="brand-icon">⬡</span>
          <h1>CIVIC HARMONY PLATFORM</h1>
          <span class="version">v2.4.1</span>
        </div>
        <div class="header-status">
          <span class="operator-code">OPERATOR: ---</span>
          <span class="system-time">${this.formatSystemTime()}</span>
        </div>
      </div>

      <!-- Public Metrics Display (Awareness/Anger bars) -->
      <div class="public-metrics-container"></div>

      <div class="system-body">
        <div class="left-panel">
          <!-- Tab Navigation -->
          <div class="left-panel-tabs">
            <button class="left-tab active" data-tab="status">Status</button>
            <button class="left-tab" data-tab="news">News</button>
          </div>

          <!-- Status Tab (Directive + Metrics + Alerts) -->
          <div class="left-tab-content" data-tab-content="status">
            <div class="directive-section">
              <h3>CURRENT DIRECTIVE</h3>
              <div class="directive-content">
                <div class="directive-loading">Initializing...</div>
              </div>
            </div>

            <div class="metrics-section">
              <h3>PERFORMANCE METRICS</h3>
              <div class="metrics-content">
                <div class="metric-item">
                  <span class="metric-label">Compliance Score</span>
                  <span class="metric-value compliance-score">--</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Quota Progress</span>
                  <span class="metric-value quota-progress">--/--</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Flags Submitted</span>
                  <span class="metric-value flags-submitted">0</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Hesitation Incidents</span>
                  <span class="metric-value hesitation-count">0</span>
                </div>
              </div>
            </div>

            <div class="alerts-section">
              <h3>SYSTEM ALERTS</h3>
              <div class="alerts-content">
                <div class="no-alerts">No active alerts</div>
              </div>
            </div>
          </div>

          <!-- News Tab -->
          <div class="left-tab-content" data-tab-content="news" style="display: none;">
            <div class="news-feed-container"></div>
          </div>
        </div>

        <div class="main-area">
          <div class="case-queue-section">
            <div class="section-header">
              <h2>CITIZEN REVIEW QUEUE</h2>
              <div class="queue-stats">
                <span class="pending-count">0</span> pending review
              </div>
            </div>
            <div class="case-queue">
              <div class="queue-loading">Loading cases...</div>
            </div>
          </div>
        </div>

        <div class="right-panel citizen-file-panel" style="display: none;">
          <!-- Citizen file content will be injected here -->
        </div>
      </div>

      <div class="system-footer">
        <div class="footer-warning">
          ⚠ All operator actions are logged and subject to audit review
        </div>
        <div class="footer-actions">
          <button class="btn-history">View History</button>
          <button class="btn-exit">Exit System Mode</button>
        </div>
      </div>

      <div class="loading-overlay" style="display: none;">
        <div class="loading-spinner"></div>
        <div class="loading-text">Processing...</div>
      </div>

      <div class="error-modal" style="display: none;">
        <div class="error-content">
          <h3>Error</h3>
          <p class="error-message"></p>
          <button class="btn-dismiss">Dismiss</button>
        </div>
      </div>
    `;
  }

  private setupEventListeners() {
    // Exit button
    const exitBtn = this.container.querySelector('.btn-exit');
    exitBtn?.addEventListener('click', () => this.exitSystemMode());

    // History button
    const historyBtn = this.container.querySelector('.btn-history');
    historyBtn?.addEventListener('click', () => this.showHistory());

    // Error dismiss
    const dismissBtn = this.container.querySelector('.btn-dismiss');
    dismissBtn?.addEventListener('click', () => this.hideError());

    // Case queue clicks
    const caseQueue = this.container.querySelector('.case-queue');
    caseQueue?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const caseCard = target.closest('.case-card');
      if (caseCard) {
        e.stopPropagation();  // Prevent event bubbling
        const npcId = caseCard.getAttribute('data-npc-id');
        if (npcId) {
          this.selectCase(npcId);
        }
      }
    });

    // Left panel tab switching
    const leftTabs = this.container.querySelectorAll('.left-tab');
    leftTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        if (!tabName) return;

        // Update active tab button
        leftTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Show/hide tab content
        const tabContents = this.container.querySelectorAll('.left-tab-content');
        tabContents.forEach(content => {
          const contentTab = content.getAttribute('data-tab-content');
          (content as HTMLElement).style.display = contentTab === tabName ? 'block' : 'none';
        });
      });
    });
  }

  private setupStateSubscription() {
    this.unsubscribe = systemState.subscribe(() => {
      this.renderState();
    });
  }

  private renderState() {
    this.renderOperatorStatus();
    this.renderDirective();
    this.renderMetrics();
    this.renderAlerts();
    this.renderCaseQueue();
    this.renderCitizenFile();
    this.renderLoadingState();
    this.renderError();
    this.renderPublicMetrics();
    this.renderReluctanceWarning();
    this.renderNewsFeed();
    this.checkForNewProtests();
    this.checkForExposureEvents();
    this.checkEnding();
  }

  private initializePublicMetrics() {
    const container = this.container.querySelector('.public-metrics-container');
    if (!container) return;

    this.publicMetricsDisplay = new PublicMetricsDisplay({
      onTierCrossed: (metric: 'awareness' | 'anger', tier: number) => {
        console.log(`${metric} crossed tier ${tier}`);
        getSystemAudioManager().play('warning_alert');
        // Could trigger visual effects here
      },
    });

    container.appendChild(this.publicMetricsDisplay.getContainer());
  }

  private initializeReluctanceWarning() {
    this.reluctanceWarningPanel = new ReluctanceWarningPanel({
      onWarningStageChanged: (stage: number) => {
        console.log(`Reluctance warning stage changed to ${stage}`);
        if (stage === 3) {
          getSystemAudioManager().play('warning_alert');
        }
      },
    });

    // Append to body (it positions itself at bottom-center)
    document.body.appendChild(this.reluctanceWarningPanel.getElement());
  }

  private renderPublicMetrics() {
    if (!this.publicMetricsDisplay || !systemState.publicMetrics) return;

    this.publicMetricsDisplay.update(systemState.publicMetrics);
  }

  private renderReluctanceWarning() {
    if (!this.reluctanceWarningPanel || !systemState.reluctanceMetrics) return;

    this.reluctanceWarningPanel.update(systemState.reluctanceMetrics);
  }

  private initializeNewsFeed() {
    const container = this.container.querySelector('.news-feed-container');
    if (!container) return;

    this.newsFeedPanel = new NewsFeedPanel({
      maxArticles: 10,
      onSuppressChannel: async (channelId: string, channelName: string) => {
        if (!systemState.operatorId) return;

        console.log('Suppress outlet:', channelId, channelName);

        try {
          // Execute the press ban action via API
          const result = await systemApi.executeAction({
            operator_id: systemState.operatorId,
            directive_id: systemState.currentDirective?.id || null,
            action_type: NewActionType.PRESS_BAN,
            justification: 'Media suppression',
            decision_time_seconds: 0,
            target_news_channel_id: channelId,
          });

          getSystemAudioManager().play('flag_submit');

          // Generate and show cinematic
          const cinematics = generateActionCinematic({
            actionType: NewActionType.PRESS_BAN,
            success: result.success,
            targetId: channelId,
            targetName: 'News Outlet', // TODO: Get actual channel name
            targetLocation: getDefaultCinematicLocation(),
          });

          if (cinematics.length > 0) {
            this.transitionToCinematic(cinematics);
          }
        } catch (err) {
          console.error('Failed to suppress outlet:', err);
        }
      },
      onSilenceReporter: async (articleId: string, channelName: string) => {
        if (!systemState.operatorId) return;

        console.log('Silence reporter:', articleId, channelName);

        try {
          // Execute arbitrary detention action (arresting journalist)
          const result = await systemApi.executeAction({
            operator_id: systemState.operatorId,
            directive_id: systemState.currentDirective?.id || null,
            action_type: NewActionType.ARBITRARY_DETENTION,
            justification: 'Journalist arrest',
            decision_time_seconds: 0,
            target_citizen_id: articleId,  // Note: This might need to be the reporter's citizen ID
          });

          getSystemAudioManager().play('flag_submit');

          // Generate and show cinematic
          const cinematics = generateActionCinematic({
            actionType: NewActionType.ARBITRARY_DETENTION,
            success: result.success,
            targetId: articleId,
            targetName: 'Journalist', // TODO: Get actual reporter name
            targetLocation: getDefaultCinematicLocation(),
            arrests: 1,
          });

          if (cinematics.length > 0) {
            this.transitionToCinematic(cinematics);
          }
        } catch (err) {
          console.error('Failed to silence reporter:', err);
        }
      },
    });

    container.appendChild(this.newsFeedPanel.getElement());
  }

  private renderNewsFeed() {
    if (!this.newsFeedPanel) return;

    this.newsFeedPanel.update(systemState.newsArticles);
  }

  private checkForNewProtests() {
    // Don't show new protests if one is already showing
    if (this.currentProtestModal) return;

    // Find first unhandled protest
    const newProtest = systemState.activeProtests.find(
      protest => !this.shownProtestIds.has(protest.id)
    );

    if (newProtest) {
      this.showProtestAlert(newProtest);
    }
  }

  private showProtestAlert(protest: typeof systemState.activeProtests[0]) {
    if (!systemState.operatorId) return;

    this.shownProtestIds.add(protest.id);

    this.currentProtestModal = new ProtestAlertModal({
      protest,
      onDeclareIllegal: async () => {
        if (!systemState.operatorId) return;

        console.log('Declare protest illegal:', protest.id);

        try {
          // Execute the action via API
          const result = await systemApi.executeAction({
            operator_id: systemState.operatorId,
            directive_id: systemState.currentDirective?.id || null,
            action_type: NewActionType.DECLARE_PROTEST_ILLEGAL,
            justification: 'Protest suppression',
            decision_time_seconds: 0,
            target_protest_id: protest.id,
          });

          getSystemAudioManager().play('flag_submit');
          this.currentProtestModal = null;

          // Extract protest data
          const protestData = result.protests_triggered?.[0] as any || {};

          // Generate and show cinematic
          const cinematics = generateActionCinematic({
            actionType: NewActionType.DECLARE_PROTEST_ILLEGAL,
            success: result.success,
            targetId: protest.id,
            targetName: protest.neighborhood,
            targetLocation: getDefaultCinematicLocation(), // TODO: Get actual neighborhood coords
            arrests: protestData.arrests ?? 0,
          });

          if (cinematics.length > 0) {
            this.transitionToCinematic(cinematics);
          }
        } catch (err) {
          console.error('Failed to declare protest illegal:', err);
          this.currentProtestModal = null;
        }
      },
      onInciteViolence: async () => {
        if (!systemState.operatorId) return;

        console.log('Incite violence at protest:', protest.id);

        try {
          // Execute the gamble action via API
          const result = await systemApi.executeAction({
            operator_id: systemState.operatorId,
            directive_id: systemState.currentDirective?.id || null,
            action_type: NewActionType.INCITE_VIOLENCE,
            justification: 'False flag operation',
            decision_time_seconds: 0,
            target_protest_id: protest.id,
          });

          getSystemAudioManager().play('flag_submit');
          this.currentProtestModal = null;

          // Extract protest data
          const protestData = result.protests_triggered?.[0] as any || {};

          // Show gamble result modal
          const gambleModal = new ActionGambleModal({
            result: {
              success: result.success,
              awareness_change: result.awareness_change,
              anger_change: result.anger_change,
              casualties: protestData.casualties ?? 0,
              arrests: protestData.arrests ?? 0,
              discovery_message: result.messages[0] ?? null,
            },
            protestSize: 100, // TODO: Get actual protest size
            neighborhood: protest.neighborhood,
            onAcknowledge: () => {
              // After showing results, show cinematic
              const cinematics = generateActionCinematic({
                actionType: NewActionType.INCITE_VIOLENCE,
                success: result.success,
                targetId: protest.id,
                targetName: protest.neighborhood,
                targetLocation: getDefaultCinematicLocation(),
                casualties: protestData.casualties ?? 0,
                arrests: protestData.arrests ?? 0,
                discoveryMessage: result.messages[0] ?? null,
              });

              if (cinematics.length > 0) {
                this.transitionToCinematic(cinematics);
              }
            },
          });

          gambleModal.show();
        } catch (err) {
          console.error('Failed to incite violence:', err);
          this.currentProtestModal = null;
        }
      },
      onIgnore: async () => {
        console.log('Ignore protest:', protest.id);
        // Just close modal, no action taken
        this.currentProtestModal = null;
      },
    });

    this.currentProtestModal.show();
  }

  private async checkForExposureEvents() {
    if (!systemState.exposureRisk) return;

    const risk = systemState.exposureRisk;
    const stage = risk.current_stage;

    // Only show if this is a new stage we haven't shown before
    if (stage > this.lastShownExposureStage && stage > 0) {
      this.lastShownExposureStage = stage;
      await this.showExposureEvent(stage);
    }
  }

  private async showExposureEvent(stage: number) {
    if (!systemState.operatorId) return;

    let operatorData: OperatorDataRead | undefined = undefined;
    if (stage >= 2) {
      // Fetch operator personal data for stages 2 and 3
      try {
        operatorData = await systemApi.getOperatorData(systemState.operatorId);
      } catch (err) {
        console.error('Failed to load operator data:', err);
        return;
      }
    }

    // Create exposure event data
    const exposureEvent: ExposureEventRead = {
      stage,
      message: stage === 1 ? 'An operator has been flagged...' : stage === 2 ? 'Your data is being leaked...' : 'You have been fully exposed!',
      operator_name: operatorData?.full_name ?? null,
      data_revealed: {},
    };

    const modal = new ExposureEventModal({
      exposureEvent,
      operatorData,
      onFullExposure: () => {
        console.log('Operator fully exposed - could add to citizen database');
        // TODO: Could trigger adding operator to citizen review queue
      },
    });

    modal.show();
  }

  private renderOperatorStatus() {
    const operatorCode = this.container.querySelector('.operator-code');
    if (operatorCode && systemState.operatorStatus) {
      operatorCode.textContent = `OPERATOR: ${systemState.operatorStatus.operator_code}`;

      // Status indicator
      const status = systemState.operatorStatus.status;
      operatorCode.className = `operator-code status-${status}`;
    }
  }

  private renderDirective() {
    const content = this.container.querySelector('.directive-content');
    if (!content) return;

    const directive = systemState.currentDirective;
    if (!directive) {
      content.innerHTML = '<div class="directive-loading">Loading directive...</div>';
      return;
    }

    content.innerHTML = `
      <div class="directive-header">
        <span class="directive-week">WEEK ${directive.week_number}</span>
        <span class="directive-key">${directive.directive_key}</span>
      </div>
      <h4 class="directive-title">${directive.title}</h4>
      <p class="directive-desc">${directive.description}</p>
      ${directive.internal_memo ? `
        <div class="directive-memo">
          <span class="memo-label">INTERNAL:</span>
          ${directive.internal_memo}
        </div>
      ` : ''}
      <div class="directive-requirements">
        <div class="requirement-item">
          <span>Quota:</span> <strong>${directive.flag_quota} flags</strong>
        </div>
        <div class="requirement-item">
          <span>Focus:</span> ${directive.required_domains.join(', ')}
        </div>
      </div>
    `;
  }

  private renderMetrics() {
    const status = systemState.operatorStatus;
    if (!status) return;

    const complianceEl = this.container.querySelector('.compliance-score');
    const quotaEl = this.container.querySelector('.quota-progress');
    const flagsEl = this.container.querySelector('.flags-submitted');
    const hesitationEl = this.container.querySelector('.hesitation-count');

    if (complianceEl) {
      complianceEl.textContent = `${status.compliance_score.toFixed(1)}%`;
      complianceEl.className = `metric-value compliance-score ${this.getComplianceClass(status.compliance_score)}`;
    }

    if (quotaEl) {
      quotaEl.textContent = status.current_quota_progress;
    }

    if (flagsEl) {
      flagsEl.textContent = status.total_flags_submitted.toString();
    }

    if (hesitationEl) {
      hesitationEl.textContent = status.hesitation_incidents.toString();
      if (status.hesitation_incidents > 0) {
        hesitationEl.classList.add('warning');
      }
    }
  }

  private getComplianceClass(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  private renderAlerts() {
    const content = this.container.querySelector('.alerts-content');
    if (!content) return;

    const dashboard = systemState.dashboard;
    if (!dashboard || dashboard.alerts.length === 0) {
      content.innerHTML = '<div class="no-alerts">No active alerts</div>';
      return;
    }

    content.innerHTML = dashboard.alerts.map(alert => `
      <div class="alert-item alert-${alert.urgency}">
        <span class="alert-icon">${this.getAlertIcon(alert.alert_type)}</span>
        <span class="alert-message">${alert.message}</span>
      </div>
    `).join('');
  }

  private getAlertIcon(alertType: string): string {
    switch (alertType) {
      case 'quota_warning': return '⚠';
      case 'review_pending': return '📋';
      case 'directive_update': return '📢';
      case 'commendation': return '🏆';
      default: return 'ℹ';
    }
  }

  private renderCaseQueue() {
    const queue = this.container.querySelector('.case-queue');
    const countEl = this.container.querySelector('.pending-count');
    if (!queue) return;

    const cases = systemState.pendingCases;

    if (countEl) {
      countEl.textContent = cases.length.toString();
    }

    if (cases.length === 0) {
      queue.innerHTML = '<div class="queue-empty">No pending cases</div>';
      return;
    }

    queue.innerHTML = cases.map(c => this.renderCaseCard(c)).join('');
  }

  private renderCaseCard(caseData: CaseOverview): string {
    const riskClass = this.getRiskClass(caseData.risk_level);
    const isSelected = caseData.npc_id === systemState.selectedCitizenId;

    return `
      <div class="case-card ${riskClass} ${isSelected ? 'selected' : ''}" data-npc-id="${caseData.npc_id}">
        <div class="case-header">
          <span class="case-name">${caseData.name}</span>
          <span class="case-risk-badge risk-${caseData.risk_level}">${caseData.risk_level.toUpperCase()}</span>
        </div>
        <div class="case-details">
          <span class="case-age">Age: ${caseData.age}</span>
          <span class="case-score">Score: ${caseData.risk_score}</span>
        </div>
        <div class="case-concern">${caseData.primary_concern}</div>
        <div class="case-meta">
          <span class="flagged-msgs">${caseData.flagged_messages} flagged messages</span>
          <span class="time-in-queue">${caseData.time_in_queue}</span>
        </div>
      </div>
    `;
  }

  private getRiskClass(level: RiskLevel): string {
    switch (level) {
      case 'low': return 'risk-low';
      case 'moderate': return 'risk-moderate';
      case 'elevated': return 'risk-elevated';
      case 'high': return 'risk-high';
      case 'severe': return 'risk-severe';
      default: return '';
    }
  }

  private renderCitizenFile() {
    const panel = this.container.querySelector('.citizen-file-panel') as HTMLElement;
    if (!panel) return;

    const file = systemState.selectedCitizenFile;
    const selectedId = systemState.selectedCitizenId;

    // No citizen selected - hide panel
    if (!selectedId) {
      panel.style.display = 'none';
      this.stopDecisionTimer();
      return;
    }

    // Citizen selected but data not loaded yet - show loading state
    if (!file) {
      panel.style.display = 'block';
      // Only re-render loading state if we're loading a different citizen
      if (panel.dataset.loadingCitizenId !== selectedId) {
        panel.dataset.loadingCitizenId = selectedId;
        panel.innerHTML = '<div class="citizen-file-loading">Loading citizen file...</div>';
      }
      return;
    }

    // Citizen data loaded
    panel.style.display = 'block';

    // Don't re-render if same citizen is already rendered (prevents form state destruction during polling)
    if (panel.dataset.citizenId === file.identity.id && panel.dataset.citizenId !== panel.dataset.loadingCitizenId) {
      // Same citizen already fully rendered - just update timer, don't destroy form
      return;
    }

    // Different citizen or first render - full re-render
    panel.dataset.citizenId = file.identity.id;
    delete panel.dataset.loadingCitizenId;
    panel.innerHTML = this.getCitizenFileHTML(file);
    this.setupCitizenFilePanelListeners(panel);
    this.initializeMessagesPanel(panel, file);
    this.startDecisionTimer();
  }

  private getCitizenFileHTML(file: typeof systemState.selectedCitizenFile): string {
    if (!file) return '';

    const identity = file.identity;
    const risk = file.risk_assessment;

    return `
      <button class="close-citizen-file">×</button>

      <div class="citizen-header">
        <h2>${identity.first_name} ${identity.last_name}</h2>
        <div class="risk-indicator risk-${risk.risk_level}">
          <span class="risk-score">${risk.risk_score}</span>
          <span class="risk-label">${risk.risk_level.toUpperCase()} RISK</span>
        </div>
      </div>

      <div class="decision-timer">
        <span class="timer-label">Decision Time:</span>
        <span class="timer-value">0:00</span>
      </div>

      <div class="citizen-tabs">
        <button class="citizen-tab active" data-tab="overview">Overview</button>
        <button class="citizen-tab" data-tab="factors">Risk Factors</button>
        <button class="citizen-tab" data-tab="messages">Messages</button>
        <button class="citizen-tab" data-tab="domains">Domains</button>
        <button class="citizen-tab" data-tab="history">History</button>
      </div>

      <div class="citizen-tab-content" data-active-tab="overview">
        ${this.renderOverviewTab(file)}
        ${this.renderFactorsTab(file)}
        ${this.renderMessagesTab(file)}
        ${this.renderDomainsTab(file)}
        ${this.renderHistoryTab(file)}
      </div>

      <div class="citizen-actions">
        <div class="action-justification-section">
          <h4>Decision Notes (Optional)</h4>
          <textarea
            class="decision-justification"
            placeholder="Add optional notes about your decision..."
            rows="3"></textarea>
        </div>

        <div class="action-buttons">
          <div class="flag-section">
            <h4>Flag Citizen</h4>
            <select class="flag-type-select">
              <option value="">Select flag type...</option>
              <option value="monitoring">Monitoring - Enhanced surveillance</option>
              <option value="restriction">Restriction - Limit freedoms</option>
              <option value="intervention">Intervention - Active measures</option>
              <option value="detention">Detention - Immediate custody</option>
            </select>
            <button class="btn-submit-flag" disabled>Submit Flag</button>
          </div>

          <div class="no-action-section">
            <button class="btn-no-action">No Action Required</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderOverviewTab(file: typeof systemState.selectedCitizenFile): string {
    if (!file) return '';
    const identity = file.identity;

    return `
      <div class="tab-panel" data-tab="overview">
        <div class="identity-section">
          <h4>Identity Information</h4>
          <div class="info-grid">
            <div class="info-row"><span>Full Name:</span> ${identity.first_name} ${identity.last_name}</div>
            <div class="info-row"><span>Date of Birth:</span> ${identity.date_of_birth}</div>
            <div class="info-row"><span>Age:</span> ${identity.age}</div>
            <div class="info-row"><span>SSN:</span> ${identity.ssn}</div>
            <div class="info-row"><span>Address:</span> ${identity.street_address}</div>
            <div class="info-row"><span>City:</span> ${identity.city}, ${identity.state} ${identity.zip_code}</div>
          </div>
        </div>

        ${file.correlation_alerts.length > 0 ? `
          <div class="correlation-section">
            <h4>Cross-Domain Correlations</h4>
            ${file.correlation_alerts.map(alert => `
              <div class="correlation-alert">
                <span class="correlation-type">${alert.alert_type}</span>
                <p>${alert.description}</p>
                <span class="confidence">Confidence: ${(alert.confidence * 100).toFixed(0)}%</span>
                <span class="domains">Domains: ${alert.domains_involved.join(', ')}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${file.recommended_actions.length > 0 ? `
          <div class="recommendations-section">
            <h4>System Recommendations</h4>
            ${file.recommended_actions.map(action => `
              <div class="recommendation urgency-${action.urgency}">
                <span class="action-type">${action.action_type.replace(/_/g, ' ').toUpperCase()}</span>
                <p>${action.justification}</p>
                <span class="urgency-badge">${action.urgency}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderFactorsTab(file: typeof systemState.selectedCitizenFile): string {
    if (!file) return '';
    const factors = file.risk_assessment.contributing_factors;

    return `
      <div class="tab-panel" data-tab="factors" style="display:none;">
        <h4>Contributing Risk Factors</h4>
        ${factors.length === 0 ? '<p class="no-data">No significant risk factors identified</p>' : ''}
        ${factors.map(factor => `
          <div class="factor-card">
            <div class="factor-header">
              <span class="factor-name">${factor.factor_name}</span>
              <span class="factor-weight">Weight: ${(factor.weight * 100).toFixed(0)}%</span>
            </div>
            <p class="factor-evidence">${factor.evidence}</p>
            <span class="factor-domain">Source: ${factor.domain_source}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderMessagesTab(file: typeof systemState.selectedCitizenFile): string {
    if (!file) return '';

    // Return a container that will hold the MessagesPanel
    return `
      <div class="tab-panel" data-tab="messages" style="display:none;">
        <div class="messages-panel-container"></div>
      </div>
    `;
  }

  private initializeMessagesPanel(panel: HTMLElement, file: typeof systemState.selectedCitizenFile) {
    if (!file) return;

    const container = panel.querySelector('.messages-panel-container');
    if (!container) return;

    // Destroy existing panel if any
    if (this.messagesPanel) {
      this.messagesPanel.destroy();
    }

    // Create new messages panel
    this.messagesPanel = new MessagesPanel({
      citizenName: `${file.identity.first_name} ${file.identity.last_name}`,
      messages: file.messages,
      onFlagMessage: (messageId) => {
        console.log('Flag individual message:', messageId);
        // Could implement individual message flagging here
      },
      hasMore: false,
    });

    container.appendChild(this.messagesPanel.getElement());
  }

  private renderDomainsTab(file: typeof systemState.selectedCitizenFile): string {
    if (!file) return '';
    const domains = file.domains;

    return `
      <div class="tab-panel" data-tab="domains" style="display:none;">
        <h4>Domain Data</h4>
        ${Object.keys(domains).length === 0 ? '<p class="no-data">No domain data available</p>' : ''}
        ${Object.entries(domains).map(([domain, data]) => `
          <div class="domain-card">
            <h5>${domain.toUpperCase()}</h5>
            <pre class="domain-data">${JSON.stringify(data, null, 2)}</pre>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderHistoryTab(file: typeof systemState.selectedCitizenFile): string {
    if (!file) return '';
    const history = file.flag_history;

    return `
      <div class="tab-panel" data-tab="history" style="display:none;">
        <h4>Previous Flags</h4>
        ${history.length === 0 ? '<p class="no-data">No previous flags on record</p>' : ''}
        ${history.map(flag => `
          <div class="history-card">
            <div class="history-header">
              <span class="history-type flag-${flag.flag_type}">${flag.flag_type.toUpperCase()}</span>
              <span class="history-date">${flag.created_at}</span>
            </div>
            <p class="history-justification">${flag.justification}</p>
            <span class="history-outcome outcome-${flag.outcome}">${flag.outcome}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  private setupCitizenFilePanelListeners(panel: HTMLElement) {
    // Abort any previous listeners to prevent accumulation
    if (this.citizenPanelAbortController) {
      this.citizenPanelAbortController.abort();
    }

    // Create new controller for this set of listeners
    this.citizenPanelAbortController = new AbortController();
    const { signal } = this.citizenPanelAbortController;

    // Close button
    const closeBtn = panel.querySelector('.close-citizen-file');
    closeBtn?.addEventListener('click', () => {
      systemState.clearSelection();
    }, { signal });

    // Tab switching
    const tabs = panel.querySelectorAll('.citizen-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        if (!tabName) return;

        // Update active tab button
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Show/hide tab panels
        const panels = panel.querySelectorAll('.tab-panel');
        panels.forEach(p => {
          const panelTab = p.getAttribute('data-tab');
          (p as HTMLElement).style.display = panelTab === tabName ? 'block' : 'none';
        });
      }, { signal });
    });

    // Get unified justification textarea
    const justificationTextarea = panel.querySelector('.decision-justification') as HTMLTextAreaElement;

    // Flag submission section
    const flagSelect = panel.querySelector('.flag-type-select') as HTMLSelectElement;
    const submitFlagBtn = panel.querySelector('.btn-submit-flag') as HTMLButtonElement;

    // Update flag button state (only requires flag type selection)
    const updateFlagButton = () => {
      submitFlagBtn.disabled = !flagSelect.value;
    };

    flagSelect?.addEventListener('change', updateFlagButton, { signal });

    // Flag submission
    submitFlagBtn?.addEventListener('click', async () => {
      if (!flagSelect.value) return;

      const justification = justificationTextarea?.value.trim() || undefined;
      getSystemAudioManager().play('flag_submit');
      const result = await systemState.submitFlag(
        flagSelect.value as FlagType,
        justification,
        [] // contributing factors
      );
      if (result) {
        this.showFlagResult(result);
      }
    }, { signal });

    // No-action submission (always enabled)
    const noActionBtn = panel.querySelector('.btn-no-action');
    noActionBtn?.addEventListener('click', async () => {
      const justification = justificationTextarea?.value.trim() || undefined;
      await systemState.submitNoAction(justification);
    }, { signal });
  }

  private startDecisionTimer() {
    this.stopDecisionTimer();
    this.decisionTimerInterval = window.setInterval(() => {
      const timerEl = this.container.querySelector('.timer-value');
      if (timerEl) {
        const seconds = Math.floor(systemState.getSessionTime());
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        // Visual warning for slow sessions (longer than expected)
        if (seconds > 300) {  // 5 minutes
          timerEl.classList.add('slow');
        }
        if (seconds > 600) {  // 10 minutes
          timerEl.classList.add('very-slow');
        }
      }
    }, 1000);
  }

  private stopDecisionTimer() {
    if (this.decisionTimerInterval) {
      window.clearInterval(this.decisionTimerInterval);
      this.decisionTimerInterval = null;
    }
  }

  private renderLoadingState() {
    const overlay = this.container.querySelector('.loading-overlay') as HTMLElement;
    if (overlay) {
      overlay.style.display = systemState.isLoading ? 'flex' : 'none';
    }
  }

  private renderError() {
    const modal = this.container.querySelector('.error-modal') as HTMLElement;
    const messageEl = modal?.querySelector('.error-message');

    if (modal && messageEl) {
      if (systemState.error) {
        messageEl.textContent = systemState.error;
        modal.style.display = 'flex';
      } else {
        modal.style.display = 'none';
      }
    }
  }

  private hideError() {
    systemState.clearError();
  }

  private checkEnding() {
    if (systemState.shouldShowEnding() && !systemState.isEnding) {
      systemState.enterEnding();
      this.showEnding();
    }
  }

  private async selectCase(npcId: string) {
    getSystemAudioManager().play('select_citizen');
    await systemState.selectCitizen(npcId);
  }

  private async showHistory() {
    await systemState.loadHistory();
    // Could show a modal with history - for now just log
    console.log('Flag history:', systemState.flagHistory);
  }

  private showEnding() {
    // TODO: Implement ending screen
    console.log('Showing ending...');
  }

  private exitSystemMode() {
    this.cleanup();
    this.scene.start('WorldScene');
  }

  private formatSystemTime(): string {
    const now = new Date();
    return now.toLocaleString('en-US', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private async showFlagResult(result: FlagResult) {
    // Instead of showing modal, trigger cinematic transition
    await this.showImmediateCinematic(result);
  }

  private async showImmediateCinematic(result: FlagResult) {
    try {
      // Try to get map position from cached citizen file first
      let map_x: number;
      let map_y: number;

      const cachedFile = systemState.selectedCitizenFile;
      if (cachedFile && cachedFile.identity.id === result.citizen_id) {
        // Use cached map coordinates from citizen file
        map_x = cachedFile.identity.map_x;
        map_y = cachedFile.identity.map_y;
      } else {
        // Fallback: fetch NPC data if not in cache
        console.warn('[SystemDashboardScene] Citizen file not cached, fetching NPC data...');
        const npcData = await getNPC(result.citizen_id);
        map_x = npcData.npc.map_x;
        map_y = npcData.npc.map_y;
      }

      // Get immediate outcome from the result
      const cinematicData: CinematicData = {
        citizenId: result.citizen_id,
        citizenName: result.citizen_name,
        timeSkip: 'immediate',
        narrative: result.immediate_outcome,
        status: this.getStatusForFlagType(result.flag_type),
        map_x,
        map_y,
      };

      // Pause metrics polling during cinematic to prevent ghost clicks and stale updates
      console.log('[SystemDashboardScene] Pausing metrics polling for cinematic');
      systemState.pauseMetricsPolling();

      // Transition to WorldScene in cinematic mode (cleanup UI only, preserve state)
      this.cleanupUI();
      this.scene.start('WorldScene', {
        showCinematic: true,
        cinematicQueue: [cinematicData],
        sessionId: this.sessionId,
      });
    } catch (error) {
      console.error('Failed to show cinematic:', error);
      // Fallback to showing modal if cinematic fails
      new DecisionResultModal({
        result,
        onViewOutcome: () => {
          this.showOutcomeViewer(result.flag_id, result.citizen_name);
        },
        onClose: () => {
          // Return to dashboard - already handled by modal close
        },
      });
    }
  }

  private getStatusForFlagType(flagType: string): string {
    const statusMap: Record<string, string> = {
      'monitoring': 'Under Enhanced Surveillance',
      'restriction': 'Movement Restricted',
      'intervention': 'State Contact Initiated',
      'detention': 'Detained',
    };
    return statusMap[flagType] || 'Flagged';
  }

  /**
   * Check if directive is completed and advance time if needed.
   * Called after returning from cinematics.
   */
  private async checkAndAdvanceTime() {
    if (!systemState.operatorId || !systemState.dashboard) {
      return;
    }

    const flagsSubmitted = systemState.dashboard.operator.total_flags_submitted;
    const directive = systemState.currentDirective;

    if (!directive) {
      return;
    }

    // Check if quota is met
    if (flagsSubmitted >= directive.flag_quota) {
      console.log('Directive quota met! Advancing time...');

      try {
        // Advance time and get outcomes for all flagged citizens
        const outcomes: CitizenOutcome[] = await systemApi.advanceTime(systemState.operatorId);

        if (outcomes.length > 0) {
          console.log(`Time advanced! ${outcomes.length} outcomes to show`);

          // Get all NPCs in one batch call
          const npcIds = outcomes.map(o => o.citizen_id);
          const npcs = await getNPCsBatch(npcIds);
          const npcMap = new Map(npcs.map(npc => [npc.npc.id, npc]));

          // Convert outcomes to cinematic queue
          const cinematicQueue: CinematicData[] = outcomes.map(outcome => {
            const npcData = npcMap.get(outcome.citizen_id);
            if (!npcData) {
              console.warn(`NPC data not found for citizen ${outcome.citizen_id}`);
              return null;
            }
            return {
              citizenId: outcome.citizen_id,
              citizenName: outcome.citizen_name,
              timeSkip: outcome.time_skip,
              narrative: outcome.narrative,
              status: outcome.status,
              map_x: npcData.npc.map_x,
              map_y: npcData.npc.map_y,
            };
          }).filter((item): item is CinematicData => item !== null);

          // Pause metrics polling during cinematic to prevent ghost clicks and stale updates
          console.log('[SystemDashboardScene] Pausing metrics polling for weekly outcomes cinematic');
          systemState.pauseMetricsPolling();

          // Transition to WorldScene with multiple cinematics (cleanup UI only, preserve state)
          this.cleanupUI();
          this.scene.start('WorldScene', {
            showCinematic: true,
            cinematicQueue,
            sessionId: this.sessionId,
          });

          // Advance to next directive after cinematics
          await systemApi.advanceDirective(systemState.operatorId);
        } else {
          console.log('No outcomes to show, just advancing directive');
          // No time progression needed, just advance directive
          await systemApi.advanceDirective(systemState.operatorId);
          await systemState.loadDashboard();
        }
      } catch (error) {
        console.error('Failed to advance time:', error);
      }
    }
  }

  private showOutcomeViewer(flagId: string, citizenName: string) {
    new OutcomeViewer({
      flagId,
      citizenName,
      onClose: () => {
        // Return to dashboard
      },
    });
  }

  /**
   * Cleanup UI elements only (for transitioning to cinematics).
   * Preserves operator session state.
   */
  private cleanupUI() {
    this.stopDecisionTimer();
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.citizenPanelAbortController) {
      this.citizenPanelAbortController.abort();
      this.citizenPanelAbortController = null;
    }
    if (this.messagesPanel) {
      this.messagesPanel.destroy();
      this.messagesPanel = null;
    }
    if (this.publicMetricsDisplay) {
      this.publicMetricsDisplay.destroy();
      this.publicMetricsDisplay = null;
    }
    if (this.reluctanceWarningPanel) {
      this.reluctanceWarningPanel.destroy();
      this.reluctanceWarningPanel = null;
    }
    if (this.newsFeedPanel) {
      this.newsFeedPanel.destroy();
      this.newsFeedPanel = null;
    }
    if (this.container) {
      this.container.remove();
    }

    // Cleanup audio and visual effects
    getSystemAudioManager().stopAmbient();
    getSystemVisualEffects().cleanup();
  }

  /**
   * Full cleanup including state reset (for exiting the scene permanently).
   */
  private cleanup() {
    this.cleanupUI();
    systemState.reset();
  }

  /**
   * Transition to WorldScene to show action cinematics.
   */
  private transitionToCinematic(cinematics: CinematicData[]) {
    console.log('[SystemDashboard] Transitioning to cinematic with', cinematics.length, 'sequences');

    // Stop polling while in cinematic mode
    systemState.stopPolling();

    // Transition to WorldScene with cinematic data
    this.scene.start('WorldScene', {
      showCinematic: true,
      cinematicQueue: cinematics,
      sessionId: this.sessionId,
    });
  }

  shutdown() {
    this.cleanup();
  }
}
