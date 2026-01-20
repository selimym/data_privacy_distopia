/**
 * System Mode State Management.
 * Simple state container for the surveillance operator interface.
 */

import * as api from '../api/system';
import type {
  CaseOverview,
  DirectiveRead,
  FlagResult,
  FlagSummary,
  FlagType,
  FullCitizenFile,
  NoActionResult,
  OperatorStatus,
  SystemDashboard,
  PublicMetricsRead,
  ReluctanceMetricsRead,
  NewsArticleRead,
  ProtestRead,
  ExposureRiskRead,
} from '../types/system';

export type SystemStateListener = () => void;

/**
 * System Mode state container.
 * Manages all state for the surveillance operator interface.
 */
export class SystemState {
  // Core state
  public operatorId: string | null = null;
  public operatorStatus: OperatorStatus | null = null;
  public currentDirective: DirectiveRead | null = null;
  public currentTimePeriod: string = 'immediate';  // Track current time period

  // Case selection
  public selectedCitizenId: string | null = null;
  public selectedCitizenFile: FullCitizenFile | null = null;
  public decisionStartTime: number | null = null;

  // Lists
  public pendingCases: CaseOverview[] = [];
  public flagHistory: FlagSummary[] = [];

  // UI state
  public isLoading: boolean = false;
  public isEnding: boolean = false;
  public error: string | null = null;

  // Dashboard data
  public dashboard: SystemDashboard | null = null;

  // New metrics (Phase 7-8)
  public publicMetrics: PublicMetricsRead | null = null;
  public reluctanceMetrics: ReluctanceMetricsRead | null = null;
  public newsArticles: NewsArticleRead[] = [];
  public activeProtests: ProtestRead[] = [];
  public exposureRisk: ExposureRiskRead | null = null;
  public lastAwarenessTier: number = 0;
  public lastAngerTier: number = 0;
  public lastReluctanceStage: number = 0;

  // Polling intervals
  private metricsPollingInterval: number | null = null;
  private protestPollingInterval: number | null = null;
  private newsPollingInterval: number | null = null;

  // Listeners for state changes
  private listeners: Set<SystemStateListener> = new Set();

  /**
   * Subscribe to state changes.
   */
  public subscribe(listener: SystemStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change.
   */
  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Initialize System Mode with a session ID.
   */
  public async initialize(sessionId: string): Promise<void> {
    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      const response = await api.startSystemMode(sessionId);

      this.operatorId = response.operator_id;
      this.operatorStatus = {
        operator_id: response.operator_id,
        operator_code: response.operator_code,
        status: response.status,
        compliance_score: response.compliance_score,
        current_quota_progress: '0/0',
        total_flags_submitted: 0,
        total_reviews_completed: 0,
        hesitation_incidents: 0,
        warnings: [],
      };
      this.currentDirective = response.first_directive;

      // Load initial data (optimized: single API call)
      await this.loadDashboardWithCases();

      // Start polling for metrics, protests, and news
      this.startMetricsPolling();
      this.startProtestPolling();
      this.startNewsPolling();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to initialize';
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Load/refresh dashboard data.
   */
  public async loadDashboard(): Promise<void> {
    if (!this.operatorId) return;

    try {
      this.dashboard = await api.getDashboard(this.operatorId);
      this.operatorStatus = this.dashboard.operator;
      this.currentDirective = this.dashboard.directive;
      this.notify();
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  }

  /**
   * Load pending cases.
   */
  public async loadCases(): Promise<void> {
    if (!this.operatorId) return;

    try {
      this.pendingCases = await api.getCases(this.operatorId, 50);
      this.notify();
    } catch (err) {
      console.error('Failed to load cases:', err);
    }
  }

  /**
   * Load dashboard and cases in a single optimized request.
   * Reduces API calls by 50% compared to calling loadDashboard() + loadCases().
   */
  public async loadDashboardWithCases(): Promise<void> {
    if (!this.operatorId) return;

    try {
      console.log('[SystemState] Loading dashboard and cases for operator:', this.operatorId);
      const result = await api.getDashboardWithCases(this.operatorId, 50);
      console.log('[SystemState] Received dashboard with', result.cases.length, 'cases');
      console.log('[SystemState] Cases:', result.cases);
      this.dashboard = result.dashboard;
      this.operatorStatus = result.dashboard.operator;
      this.currentDirective = result.dashboard.directive;
      this.pendingCases = result.cases;
      this.notify();
    } catch (err) {
      console.error('Failed to load dashboard and cases:', err);
    }
  }

  /**
   * Load flag history.
   */
  public async loadHistory(): Promise<void> {
    if (!this.operatorId) return;

    try {
      this.flagHistory = await api.getOperatorHistory(this.operatorId);
      this.notify();
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }

  /**
   * Select a citizen and load their file.
   * Starts the decision timer.
   */
  public async selectCitizen(npcId: string): Promise<void> {
    if (!this.operatorId) return;

    this.isLoading = true;
    this.selectedCitizenId = npcId;
    this.decisionStartTime = Date.now();
    this.notify();

    try {
      this.selectedCitizenFile = await api.getCitizenFile(this.operatorId, npcId);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load citizen file';
      this.selectedCitizenId = null;
      this.selectedCitizenFile = null;
      this.decisionStartTime = null;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Clear the selected citizen.
   */
  public clearSelection(): void {
    this.selectedCitizenId = null;
    this.selectedCitizenFile = null;
    this.decisionStartTime = null;
    this.notify();
  }

  /**
   * Get the time elapsed since citizen was selected (in seconds).
   */
  public getDecisionTime(): number {
    if (!this.decisionStartTime) return 0;
    return (Date.now() - this.decisionStartTime) / 1000;
  }

  /**
   * Submit a flag against the selected citizen.
   */
  public async submitFlag(
    flagType: FlagType,
    justification: string,
    contributingFactors: string[] = []
  ): Promise<FlagResult | null> {
    if (!this.operatorId || !this.selectedCitizenId) return null;

    this.isLoading = true;
    this.notify();

    try {
      const result = await api.submitFlag({
        operator_id: this.operatorId,
        citizen_id: this.selectedCitizenId,
        flag_type: flagType,
        contributing_factors: contributingFactors,
        justification,
        decision_time_seconds: this.getDecisionTime(),
      });

      // Update local state with new metrics
      if (this.operatorStatus) {
        this.operatorStatus.compliance_score = result.compliance_score;
        this.operatorStatus.current_quota_progress = result.quota_progress;
        this.operatorStatus.total_flags_submitted += 1;
      }

      // Clear selection
      this.clearSelection();

      // Refresh dashboard and cases (optimized: single API call)
      await this.loadDashboardWithCases();

      return result;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to submit flag';
      return null;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Submit a no-action decision for the selected citizen.
   */
  public async submitNoAction(justification: string): Promise<NoActionResult | null> {
    if (!this.operatorId || !this.selectedCitizenId) return null;

    this.isLoading = true;
    this.notify();

    try {
      const result = await api.submitNoAction({
        operator_id: this.operatorId,
        citizen_id: this.selectedCitizenId,
        justification,
        decision_time_seconds: this.getDecisionTime(),
      });

      // Update local compliance
      if (this.operatorStatus) {
        this.operatorStatus.compliance_score += result.compliance_impact;
      }

      // Clear selection
      this.clearSelection();

      // Refresh dashboard and cases (optimized: single API call)
      await this.loadDashboardWithCases();

      return result;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to submit no-action';
      return null;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Advance to the next directive.
   */
  public async advanceDirective(): Promise<boolean> {
    if (!this.operatorId) return false;

    this.isLoading = true;
    this.notify();

    try {
      this.currentDirective = await api.advanceDirective(this.operatorId);
      await this.loadDashboard();
      return true;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Cannot advance directive';
      return false;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Check if should show ending (all directives complete or suspended).
   */
  public shouldShowEnding(): boolean {
    if (!this.operatorStatus) return false;

    // Show ending if suspended or terminated
    if (
      this.operatorStatus.status === 'suspended' ||
      this.operatorStatus.status === 'terminated'
    ) {
      return true;
    }

    // Show ending if directive is week 6 and quota met
    if (this.currentDirective?.week_number === 6) {
      const [current, required] = this.operatorStatus.current_quota_progress
        .split('/')
        .map(Number);
      if (current >= required) {
        return true;
      }
    }

    return false;
  }

  /**
   * Enter ending state.
   */
  public enterEnding(): void {
    this.isEnding = true;
    this.notify();
  }

  /**
   * Load public metrics (awareness, anger).
   */
  public async loadPublicMetrics(): Promise<void> {
    if (!this.operatorId) return;

    try {
      const newMetrics = await api.getPublicMetrics(this.operatorId);

      // Check for tier crossings
      if (this.publicMetrics) {
        if (newMetrics.awareness_tier > this.lastAwarenessTier) {
          this.lastAwarenessTier = newMetrics.awareness_tier;
        }
        if (newMetrics.anger_tier > this.lastAngerTier) {
          this.lastAngerTier = newMetrics.anger_tier;
        }
      } else {
        this.lastAwarenessTier = newMetrics.awareness_tier;
        this.lastAngerTier = newMetrics.anger_tier;
      }

      this.publicMetrics = newMetrics;
      this.notify();
    } catch (err) {
      console.error('Failed to load public metrics:', err);
    }
  }

  /**
   * Load reluctance metrics.
   */
  public async loadReluctanceMetrics(): Promise<void> {
    if (!this.operatorId) return;

    try {
      const newMetrics = await api.getReluctanceMetrics(this.operatorId);

      // Check for reluctance stage change
      const newStage = this.getReluctanceStage(newMetrics.reluctance_score);
      if (newStage > this.lastReluctanceStage) {
        this.lastReluctanceStage = newStage;
      }

      this.reluctanceMetrics = newMetrics;
      this.notify();
    } catch (err) {
      console.error('Failed to load reluctance metrics:', err);
    }
  }

  /**
   * Load news articles.
   */
  public async loadNews(): Promise<void> {
    if (!this.operatorId) return;

    try {
      this.newsArticles = await api.getRecentNews(this.operatorId, 10);
      this.notify();
    } catch (err) {
      console.error('Failed to load news:', err);
    }
  }

  /**
   * Load active protests.
   */
  public async loadActiveProtests(): Promise<void> {
    if (!this.operatorId) return;

    try {
      const protests = await api.getActiveProtests(this.operatorId);

      // Only update if protests changed (to avoid unnecessary re-renders)
      const protestsChanged = JSON.stringify(this.activeProtests) !== JSON.stringify(protests);
      if (protestsChanged) {
        this.activeProtests = protests;
        this.notify();
      }
    } catch (err) {
      console.error('Failed to load protests:', err);
    }
  }

  /**
   * Load exposure risk status.
   */
  public async loadExposureRisk(): Promise<void> {
    if (!this.operatorId) return;

    try {
      this.exposureRisk = await api.getExposureRisk(this.operatorId);
      this.notify();
    } catch (err) {
      console.error('Failed to load exposure risk:', err);
    }
  }

  /**
   * Start polling for metrics updates.
   */
  public startMetricsPolling(): void {
    if (this.metricsPollingInterval) return;

    // Initial load
    this.loadPublicMetrics();
    this.loadReluctanceMetrics();
    this.loadExposureRisk();

    // Poll every 5 seconds
    this.metricsPollingInterval = window.setInterval(() => {
      this.loadPublicMetrics();
      this.loadReluctanceMetrics();
      this.loadExposureRisk();
    }, 5000);
  }

  /**
   * Start polling for protests.
   */
  public startProtestPolling(): void {
    if (this.protestPollingInterval) return;

    // Initial load
    this.loadActiveProtests();

    // Poll every 10 seconds
    this.protestPollingInterval = window.setInterval(() => {
      this.loadActiveProtests();
    }, 10000);
  }

  /**
   * Start polling for news.
   */
  public startNewsPolling(): void {
    if (this.newsPollingInterval) return;

    // Initial load
    this.loadNews();

    // Poll every 15 seconds
    this.newsPollingInterval = window.setInterval(() => {
      this.loadNews();
    }, 15000);
  }

  /**
   * Stop all polling.
   */
  public stopPolling(): void {
    if (this.metricsPollingInterval) {
      window.clearInterval(this.metricsPollingInterval);
      this.metricsPollingInterval = null;
    }
    if (this.protestPollingInterval) {
      window.clearInterval(this.protestPollingInterval);
      this.protestPollingInterval = null;
    }
    if (this.newsPollingInterval) {
      window.clearInterval(this.newsPollingInterval);
      this.newsPollingInterval = null;
    }
  }

  /**
   * Get reluctance stage (1, 2, or 3) from score.
   */
  private getReluctanceStage(score: number): number {
    if (score >= 90) return 3;
    if (score >= 80) return 2;
    if (score >= 70) return 1;
    return 0;
  }

  /**
   * Reset all state.
   */
  public reset(): void {
    this.stopPolling();
    this.operatorId = null;
    this.operatorStatus = null;
    this.currentDirective = null;
    this.selectedCitizenId = null;
    this.selectedCitizenFile = null;
    this.decisionStartTime = null;
    this.pendingCases = [];
    this.flagHistory = [];
    this.isLoading = false;
    this.isEnding = false;
    this.error = null;
    this.dashboard = null;
    this.publicMetrics = null;
    this.reluctanceMetrics = null;
    this.newsArticles = [];
    this.activeProtests = [];
    this.exposureRisk = null;
    this.lastAwarenessTier = 0;
    this.lastAngerTier = 0;
    this.lastReluctanceStage = 0;
    this.notify();
  }

  /**
   * Clear error state.
   */
  public clearError(): void {
    this.error = null;
    this.notify();
  }
}

// Singleton instance
export const systemState = new SystemState();
