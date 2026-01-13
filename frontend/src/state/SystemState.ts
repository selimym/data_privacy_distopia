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
      const result = await api.getDashboardWithCases(this.operatorId, 50);
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
   * Reset all state.
   */
  public reset(): void {
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
