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
  private isInitialized: boolean = false;  // Track initialization state

  // Session timing
  public sessionStartTime: number | null = null;  // Track total session time

  // Case selection
  public selectedCitizenId: string | null = null;
  public selectedCitizenFile: FullCitizenFile | null = null;
  public decisionStartTime: number | null = null;  // Track per-citizen decision time (for hesitation tracking)

  // Lists
  public pendingCases: CaseOverview[] = [];
  public flagHistory: FlagSummary[] = [];

  // Citizen file cache with LRU eviction
  private readonly MAX_CACHE_SIZE = 50;
  private citizenFileCache: Map<string, FullCitizenFile> = new Map();
  private cacheAccessOrder: string[] = [];

  // Request deduplication
  private inFlightRequests: Map<string, Promise<any>> = new Map();

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
   * If already initialized, resumes the session instead of re-initializing.
   */
  public async initialize(sessionId: string): Promise<void> {
    // If already initialized with an operator, resume instead
    if (this.isInitialized && this.operatorId) {
      console.log('[SystemState] Already initialized, resuming session...');
      await this.resumeSession();
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      console.log('[SystemState] Initializing new session...');
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

      // Start session timer
      this.sessionStartTime = Date.now();

      // Load initial data (optimized: single API call)
      await this.loadDashboardWithCases();

      // Start polling for metrics, protests, and news
      this.startMetricsPolling();
      this.startProtestPolling();
      this.startNewsPolling();

      this.isInitialized = true;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to initialize';
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Resume an existing session (called when returning from cinematics).
   * Only refreshes dashboard data and ensures polling is active.
   */
  public async resumeSession(): Promise<void> {
    console.log('[SystemState] Resuming session for operator:', this.operatorId);

    // Refresh dashboard and cases
    await this.loadDashboardWithCases();

    // Ensure polling is active (in case it was stopped)
    this.startMetricsPolling();
    this.startProtestPolling();
    this.startNewsPolling();

    this.notify();
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
   * Preload citizen files for faster selection.
   * Prioritizes high/elevated risk citizens first.
   */
  private async preloadCitizenFiles(): Promise<void> {
    if (!this.operatorId || this.pendingCases.length === 0) return;

    // Sort cases by priority (high/elevated risk first)
    const priorityCases = this.pendingCases
      .filter(c => c.risk_level === 'high' || c.risk_level === 'elevated' || c.risk_level === 'severe')
      .slice(0, 5);  // Top 5 priority cases

    const otherCases = this.pendingCases
      .filter(c => c.risk_level !== 'high' && c.risk_level !== 'elevated' && c.risk_level !== 'severe')
      .slice(0, 10);  // Next 10 lower priority cases

    // Load priority cases first (in parallel)
    console.log('[SystemState] Preloading', priorityCases.length, 'high-priority citizen files...');
    await Promise.all(
      priorityCases.map(async (caseData) => {
        if (!this.citizenFileCache.has(caseData.npc_id)) {
          try {
            const file = await api.getCitizenFile(this.operatorId!, caseData.npc_id);
            this.setCachedFile(caseData.npc_id, file);  // Use LRU-aware cache
          } catch (err) {
            console.error(`Failed to preload citizen ${caseData.npc_id}:`, err);
          }
        }
      })
    );

    console.log('[SystemState] Priority citizens cached. Loading remaining citizens in background...');

    // Load other cases in background (don't await)
    Promise.all(
      otherCases.map(async (caseData) => {
        if (!this.citizenFileCache.has(caseData.npc_id)) {
          try {
            const file = await api.getCitizenFile(this.operatorId!, caseData.npc_id);
            this.setCachedFile(caseData.npc_id, file);  // Use LRU-aware cache
          } catch (err) {
            console.error(`Failed to preload citizen ${caseData.npc_id}:`, err);
          }
        }
      })
    ).then(() => {
      console.log('[SystemState] All citizen files cached');
    });
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
   * Includes request deduplication to prevent concurrent duplicate calls.
   */
  public async loadDashboardWithCases(): Promise<void> {
    if (!this.operatorId) return;

    const requestKey = `dashboard-${this.operatorId}`;

    // Check if request is already in flight
    const existingRequest = this.inFlightRequests.get(requestKey);
    if (existingRequest) {
      console.log('[SystemState] Dashboard request already in flight, reusing...');
      return existingRequest;
    }

    // Create new request
    const request = (async () => {
      try {
        console.log('[SystemState] Loading dashboard and cases for operator:', this.operatorId);
        const result = await api.getDashboardWithCases(this.operatorId!, 50);
        console.log('[SystemState] Received dashboard with', result.cases.length, 'cases');
        console.log('[SystemState] Cases:', result.cases);
        this.dashboard = result.dashboard;
        this.operatorStatus = result.dashboard.operator;
        this.currentDirective = result.dashboard.directive;
        this.pendingCases = result.cases;
        this.notify();

        // Start preloading citizen files in background
        this.preloadCitizenFiles();
      } catch (err) {
        console.error('Failed to load dashboard and cases:', err);
        throw err;
      } finally {
        this.inFlightRequests.delete(requestKey);
      }
    })();

    this.inFlightRequests.set(requestKey, request);
    return request;
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
   * Update LRU cache access order and evict if needed.
   */
  private updateCacheAccess(npcId: string): void {
    // Move to end of access order (most recently used)
    this.cacheAccessOrder = this.cacheAccessOrder.filter(id => id !== npcId);
    this.cacheAccessOrder.push(npcId);

    // Evict if over limit
    if (this.cacheAccessOrder.length > this.MAX_CACHE_SIZE) {
      const evictId = this.cacheAccessOrder.shift()!;
      this.citizenFileCache.delete(evictId);
      console.log(`[SystemState] Evicted citizen ${evictId} from cache (LRU)`);
    }
  }

  /**
   * Add citizen file to cache with LRU tracking.
   */
  private setCachedFile(npcId: string, file: FullCitizenFile): void {
    this.citizenFileCache.set(npcId, file);
    this.updateCacheAccess(npcId);
  }

  /**
   * Get citizen file from cache and update LRU access order.
   */
  private getCachedFile(npcId: string): FullCitizenFile | undefined {
    const file = this.citizenFileCache.get(npcId);
    if (file) {
      this.updateCacheAccess(npcId);
    }
    return file;
  }

  /**
   * Select a citizen and load their file.
   * Starts the decision timer.
   */
  public async selectCitizen(npcId: string): Promise<void> {
    if (!this.operatorId) return;

    // Clear previous selection immediately to avoid stale data
    this.selectedCitizenId = npcId;
    this.selectedCitizenFile = null;
    this.decisionStartTime = Date.now();
    this.notify();  // Shows selection state, clears old data

    try {
      // Check cache first (with LRU tracking)
      const cached = this.getCachedFile(npcId);
      if (cached) {
        this.selectedCitizenFile = cached;
        this.notify();  // Update with cached data
      } else {
        // Fetch from API
        const file = await api.getCitizenFile(this.operatorId, npcId);
        this.setCachedFile(npcId, file);  // Cache it with LRU tracking
        this.selectedCitizenFile = file;
        this.notify();  // Update with loaded data
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load citizen file';
      this.selectedCitizenId = null;
      this.selectedCitizenFile = null;
      this.decisionStartTime = null;
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
   * Used for tracking hesitation incidents (>30s per citizen).
   */
  public getDecisionTime(): number {
    if (!this.decisionStartTime) return 0;
    return (Date.now() - this.decisionStartTime) / 1000;
  }

  /**
   * Get the total session time elapsed (in seconds).
   * This is the time shown in the dashboard timer.
   */
  public getSessionTime(): number {
    if (!this.sessionStartTime) return 0;
    return (Date.now() - this.sessionStartTime) / 1000;
  }

  /**
   * Submit a flag against the selected citizen.
   */
  public async submitFlag(
    flagType: FlagType,
    justification?: string,
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
        justification: justification || "",
        decision_time_seconds: this.getDecisionTime(),
      });

      // Update local state with new metrics
      if (this.operatorStatus) {
        this.operatorStatus.compliance_score = result.compliance_score;
        this.operatorStatus.current_quota_progress = result.quota_progress;
        this.operatorStatus.total_flags_submitted += 1;
      }

      // Invalidate cache for this citizen (data has changed)
      this.citizenFileCache.delete(this.selectedCitizenId);

      // Clear selection
      this.clearSelection();

      // Refresh dashboard to update case queue and metrics
      // This ensures flagged citizens are removed from queue and stats are current
      await this.loadDashboardWithCases();

      // Reload reluctance metrics after flagging (they've been updated)
      await this.loadReluctanceMetrics();

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
  public async submitNoAction(justification?: string): Promise<NoActionResult | null> {
    if (!this.operatorId || !this.selectedCitizenId) return null;

    this.isLoading = true;
    this.notify();

    try {
      const result = await api.submitNoAction({
        operator_id: this.operatorId,
        citizen_id: this.selectedCitizenId,
        justification: justification || "",
        decision_time_seconds: this.getDecisionTime(),
      });

      // Update local compliance
      if (this.operatorStatus) {
        this.operatorStatus.compliance_score += result.compliance_impact;
      }

      // Invalidate cache for this citizen (data has changed)
      this.citizenFileCache.delete(this.selectedCitizenId);

      // Clear selection
      this.clearSelection();

      // Refresh dashboard to update case queue and metrics
      // This ensures reviewed citizens are handled properly and stats are current
      await this.loadDashboardWithCases();

      // Reload reluctance metrics after no-action (they've been updated)
      await this.loadReluctanceMetrics();

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

      // Reload reluctance metrics at the beginning of new week
      await this.loadReluctanceMetrics();

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

      // Only log if metrics have actually changed (reduce log spam)
      const hasChanged = !this.publicMetrics ||
        this.publicMetrics.international_awareness !== newMetrics.international_awareness ||
        this.publicMetrics.public_anger !== newMetrics.public_anger;

      if (hasChanged) {
        console.log('[SystemState] Public metrics updated:', {
          awareness: newMetrics.international_awareness,
          anger: newMetrics.public_anger,
          awareness_tier: newMetrics.awareness_tier,
          anger_tier: newMetrics.anger_tier,
        });
      }

      // Check for tier crossings
      if (this.publicMetrics) {
        if (newMetrics.awareness_tier > this.lastAwarenessTier) {
          console.log('[SystemState] Awareness tier increased:', this.lastAwarenessTier, '->', newMetrics.awareness_tier);
          this.lastAwarenessTier = newMetrics.awareness_tier;
        }
        if (newMetrics.anger_tier > this.lastAngerTier) {
          console.log('[SystemState] Anger tier increased:', this.lastAngerTier, '->', newMetrics.anger_tier);
          this.lastAngerTier = newMetrics.anger_tier;
        }
      } else {
        this.lastAwarenessTier = newMetrics.awareness_tier;
        this.lastAngerTier = newMetrics.anger_tier;
      }

      this.publicMetrics = newMetrics;
      if (hasChanged) {
        this.notify();
      }
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

      // Only log if metrics have actually changed (reduce log spam)
      const hasChanged = !this.reluctanceMetrics ||
        this.reluctanceMetrics.reluctance_score !== newMetrics.reluctance_score;

      if (hasChanged) {
        console.log('[SystemState] Reluctance metrics updated:', {
          score: newMetrics.reluctance_score,
          stage: this.getReluctanceStage(newMetrics.reluctance_score),
        });
      }

      // Check for reluctance stage change
      const newStage = this.getReluctanceStage(newMetrics.reluctance_score);
      if (newStage > this.lastReluctanceStage) {
        console.log('[SystemState] Reluctance stage increased:', this.lastReluctanceStage, '->', newStage);
        this.lastReluctanceStage = newStage;
      }

      this.reluctanceMetrics = newMetrics;
      if (hasChanged) {
        this.notify();
      }
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
   * Note: Reluctance metrics are NOT polled - they only update after actions.
   */
  public startMetricsPolling(): void {
    if (this.metricsPollingInterval) return;

    // Initial load
    this.loadPublicMetrics();
    this.loadReluctanceMetrics();
    this.loadExposureRisk();

    // Poll public metrics and exposure risk every 10 seconds (reduced from 5s to minimize log spam)
    // Reluctance metrics are NOT polled - they only update after flag/no-action
    this.metricsPollingInterval = window.setInterval(() => {
      this.loadPublicMetrics();
      this.loadExposureRisk();
    }, 10000);
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
   * Pause public metrics polling temporarily (e.g., during cinematics or user interaction).
   * Use resumeMetricsPolling() to restart.
   */
  public pauseMetricsPolling(): void {
    if (this.metricsPollingInterval) {
      console.log('[SystemState] Pausing metrics polling');
      window.clearInterval(this.metricsPollingInterval);
      this.metricsPollingInterval = null;
    }
  }

  /**
   * Resume public metrics polling after being paused.
   */
  public resumeMetricsPolling(): void {
    if (!this.metricsPollingInterval) {
      console.log('[SystemState] Resuming metrics polling');
      this.startMetricsPolling();
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
    this.sessionStartTime = null;
    this.selectedCitizenId = null;
    this.selectedCitizenFile = null;
    this.decisionStartTime = null;
    this.pendingCases = [];
    this.flagHistory = [];
    this.citizenFileCache.clear();
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
    this.isInitialized = false;
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
