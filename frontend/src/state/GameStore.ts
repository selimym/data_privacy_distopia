/**
 * GameStore - In-memory data store for fat client architecture.
 * Replaces database for all game data in system mode.
 *
 * This is a singleton that stores all game entities in Maps for fast lookups.
 * Provides CRUD operations and persistence to localStorage/IndexedDB.
 */

import type {
  NPCRead,
  HealthRecord,
  FinanceRecord,
  JudicialRecord,
  LocationRecord,
  SocialMediaRecord,
  DirectiveRead,
  CitizenFlagRead,
  PublicMetricsRead,
  ReluctanceMetricsRead,
  NewsArticleRead,
  NewsChannelRead,
  ProtestRead,
  OperatorDataRead,
  NeighborhoodRead,
  BookPublicationEventRead,
  SystemActionRead,
} from '../types';

// Message type for social media messages
export interface MessageRecord {
  id: string;
  npc_id: string;
  timestamp: string;
  recipient_name: string;
  recipient_relationship: string | null;
  content: string;
  is_flagged: boolean;
  flag_reasons: string[];
  sentiment: number;
  detected_keywords: string[];
}

// Operator entity (system mode player)
export interface Operator {
  id: string;
  session_id: string;
  operator_code: string;
  shift_start: string;
  total_flags_submitted: number;
  total_reviews_completed: number;
  compliance_score: number;
  hesitation_incidents: number;
  current_directive_id: string | null;
  status: 'active' | 'under_review' | 'suspended' | 'terminated';
  current_time_period: string;
  created_at: string;
  updated_at: string;
}

// Operator metrics (daily performance snapshots)
export interface OperatorMetrics {
  id: string;
  operator_id: string;
  date: string;
  flags_submitted: number;
  average_decision_time: number;
  hesitation_count: number;
  quota_met: boolean;
  compliance_trend: 'improving' | 'stable' | 'declining';
  created_at: string;
}

// Flag outcome entity
export interface FlagOutcomeRecord {
  id: string;
  flag_id: string;
  time_skip: string; // 'immediate', '1_month', '6_months', '1_year'
  status: string;
  narrative: string;
  statistics: Record<string, unknown>;
  created_at: string;
}

/**
 * GameStore - Singleton class managing all game data
 */
class GameStore {
  // === Core Entities ===
  private npcs: Map<string, NPCRead> = new Map();
  private healthRecords: Map<string, HealthRecord> = new Map();
  private financeRecords: Map<string, FinanceRecord> = new Map();
  private judicialRecords: Map<string, JudicialRecord> = new Map();
  private locationRecords: Map<string, LocationRecord> = new Map();
  private socialRecords: Map<string, SocialMediaRecord> = new Map();
  private messages: Map<string, MessageRecord> = new Map();

  // === System Mode Entities ===
  private operator: Operator | null = null;
  private directives: Map<string, DirectiveRead> = new Map();
  private flags: Map<string, CitizenFlagRead> = new Map();
  private flagOutcomes: Map<string, FlagOutcomeRecord> = new Map();
  private operatorMetrics: Map<string, OperatorMetrics> = new Map();

  // === Phase 7-8 Entities ===
  private publicMetrics: PublicMetricsRead | null = null;
  private reluctanceMetrics: ReluctanceMetricsRead | null = null;
  private newsChannels: Map<string, NewsChannelRead> = new Map();
  private newsArticles: Map<string, NewsArticleRead> = new Map();
  private protests: Map<string, ProtestRead> = new Map();
  private operatorData: OperatorDataRead | null = null;
  private neighborhoods: Map<string, NeighborhoodRead> = new Map();
  private bookEvents: Map<string, BookPublicationEventRead> = new Map();
  private systemActions: Map<string, SystemActionRead> = new Map();

  // === Indexing (for fast lookups) ===
  private npcsByName: Map<string, string> = new Map(); // fullName -> npcId
  private healthRecordsByNpcId: Map<string, string> = new Map(); // npcId -> recordId
  private financeRecordsByNpcId: Map<string, string> = new Map();
  private judicialRecordsByNpcId: Map<string, string> = new Map();
  private locationRecordsByNpcId: Map<string, string> = new Map();
  private socialRecordsByNpcId: Map<string, string> = new Map();
  private messagesByNpcId: Map<string, string[]> = new Map(); // npcId -> messageIds[]
  private flagsByNpcId: Map<string, string[]> = new Map(); // npcId -> flagIds[]

  // === Game Time ===
  private currentWeek: number = 1;
  private currentTimePeriod: string = 'immediate'; // 'immediate', '1_month', '6_months', '1_year'

  // === Persistence ===
  private readonly STORAGE_KEY = 'datafusion_gamestore';
  private readonly VERSION = 1;

  // =============================================================================
  // NPC Operations
  // =============================================================================

  addNPC(npc: NPCRead): void {
    this.npcs.set(npc.id, npc);
    const fullName = `${npc.first_name} ${npc.last_name}`.toLowerCase();
    this.npcsByName.set(fullName, npc.id);
  }

  getNPC(id: string): NPCRead | undefined {
    return this.npcs.get(id);
  }

  getAllNPCs(): NPCRead[] {
    return Array.from(this.npcs.values());
  }

  getNPCByName(firstName: string, lastName: string): NPCRead | undefined {
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    const npcId = this.npcsByName.get(fullName);
    return npcId ? this.npcs.get(npcId) : undefined;
  }

  updateNPC(id: string, updates: Partial<NPCRead>): void {
    const npc = this.npcs.get(id);
    if (npc) {
      const updated = { ...npc, ...updates };
      this.npcs.set(id, updated);

      // Update name index if name changed
      if (updates.first_name || updates.last_name) {
        const oldFullName = `${npc.first_name} ${npc.last_name}`.toLowerCase();
        const newFullName = `${updated.first_name} ${updated.last_name}`.toLowerCase();
        this.npcsByName.delete(oldFullName);
        this.npcsByName.set(newFullName, id);
      }
    }
  }

  deleteNPC(id: string): void {
    const npc = this.npcs.get(id);
    if (npc) {
      const fullName = `${npc.first_name} ${npc.last_name}`.toLowerCase();
      this.npcsByName.delete(fullName);
      this.npcs.delete(id);

      // Delete related records
      const healthId = this.healthRecordsByNpcId.get(id);
      if (healthId) {
        this.healthRecords.delete(healthId);
        this.healthRecordsByNpcId.delete(id);
      }

      const financeId = this.financeRecordsByNpcId.get(id);
      if (financeId) {
        this.financeRecords.delete(financeId);
        this.financeRecordsByNpcId.delete(id);
      }

      const judicialId = this.judicialRecordsByNpcId.get(id);
      if (judicialId) {
        this.judicialRecords.delete(judicialId);
        this.judicialRecordsByNpcId.delete(id);
      }

      const locationId = this.locationRecordsByNpcId.get(id);
      if (locationId) {
        this.locationRecords.delete(locationId);
        this.locationRecordsByNpcId.delete(id);
      }

      const socialId = this.socialRecordsByNpcId.get(id);
      if (socialId) {
        this.socialRecords.delete(socialId);
        this.socialRecordsByNpcId.delete(id);
      }

      const messageIds = this.messagesByNpcId.get(id);
      if (messageIds) {
        messageIds.forEach(msgId => this.messages.delete(msgId));
        this.messagesByNpcId.delete(id);
      }

      const flagIds = this.flagsByNpcId.get(id);
      if (flagIds) {
        flagIds.forEach(flagId => this.flags.delete(flagId));
        this.flagsByNpcId.delete(id);
      }
    }
  }

  // =============================================================================
  // Health Records
  // =============================================================================

  addHealthRecord(record: HealthRecord): void {
    this.healthRecords.set(record.id, record);
    this.healthRecordsByNpcId.set(record.npc_id, record.id);
  }

  getHealthRecord(id: string): HealthRecord | undefined {
    return this.healthRecords.get(id);
  }

  getHealthRecordByNpcId(npcId: string): HealthRecord | undefined {
    const recordId = this.healthRecordsByNpcId.get(npcId);
    return recordId ? this.healthRecords.get(recordId) : undefined;
  }

  getAllHealthRecords(): HealthRecord[] {
    return Array.from(this.healthRecords.values());
  }

  updateHealthRecord(id: string, updates: Partial<HealthRecord>): void {
    const record = this.healthRecords.get(id);
    if (record) {
      this.healthRecords.set(id, { ...record, ...updates });
    }
  }

  // =============================================================================
  // Finance Records
  // =============================================================================

  addFinanceRecord(record: FinanceRecord): void {
    this.financeRecords.set(record.id, record);
    this.financeRecordsByNpcId.set(record.npc_id, record.id);
  }

  getFinanceRecord(id: string): FinanceRecord | undefined {
    return this.financeRecords.get(id);
  }

  getFinanceRecordByNpcId(npcId: string): FinanceRecord | undefined {
    const recordId = this.financeRecordsByNpcId.get(npcId);
    return recordId ? this.financeRecords.get(recordId) : undefined;
  }

  getAllFinanceRecords(): FinanceRecord[] {
    return Array.from(this.financeRecords.values());
  }

  updateFinanceRecord(id: string, updates: Partial<FinanceRecord>): void {
    const record = this.financeRecords.get(id);
    if (record) {
      this.financeRecords.set(id, { ...record, ...updates });
    }
  }

  // =============================================================================
  // Judicial Records
  // =============================================================================

  addJudicialRecord(record: JudicialRecord): void {
    this.judicialRecords.set(record.id, record);
    this.judicialRecordsByNpcId.set(record.npc_id, record.id);
  }

  getJudicialRecord(id: string): JudicialRecord | undefined {
    return this.judicialRecords.get(id);
  }

  getJudicialRecordByNpcId(npcId: string): JudicialRecord | undefined {
    const recordId = this.judicialRecordsByNpcId.get(npcId);
    return recordId ? this.judicialRecords.get(recordId) : undefined;
  }

  getAllJudicialRecords(): JudicialRecord[] {
    return Array.from(this.judicialRecords.values());
  }

  updateJudicialRecord(id: string, updates: Partial<JudicialRecord>): void {
    const record = this.judicialRecords.get(id);
    if (record) {
      this.judicialRecords.set(id, { ...record, ...updates });
    }
  }

  // =============================================================================
  // Location Records
  // =============================================================================

  addLocationRecord(record: LocationRecord): void {
    this.locationRecords.set(record.id, record);
    this.locationRecordsByNpcId.set(record.npc_id, record.id);
  }

  getLocationRecord(id: string): LocationRecord | undefined {
    return this.locationRecords.get(id);
  }

  getLocationRecordByNpcId(npcId: string): LocationRecord | undefined {
    const recordId = this.locationRecordsByNpcId.get(npcId);
    return recordId ? this.locationRecords.get(recordId) : undefined;
  }

  getAllLocationRecords(): LocationRecord[] {
    return Array.from(this.locationRecords.values());
  }

  updateLocationRecord(id: string, updates: Partial<LocationRecord>): void {
    const record = this.locationRecords.get(id);
    if (record) {
      this.locationRecords.set(id, { ...record, ...updates });
    }
  }

  // =============================================================================
  // Social Media Records
  // =============================================================================

  addSocialRecord(record: SocialMediaRecord): void {
    this.socialRecords.set(record.id, record);
    this.socialRecordsByNpcId.set(record.npc_id, record.id);
  }

  getSocialRecord(id: string): SocialMediaRecord | undefined {
    return this.socialRecords.get(id);
  }

  getSocialRecordByNpcId(npcId: string): SocialMediaRecord | undefined {
    const recordId = this.socialRecordsByNpcId.get(npcId);
    return recordId ? this.socialRecords.get(recordId) : undefined;
  }

  getAllSocialRecords(): SocialMediaRecord[] {
    return Array.from(this.socialRecords.values());
  }

  updateSocialRecord(id: string, updates: Partial<SocialMediaRecord>): void {
    const record = this.socialRecords.get(id);
    if (record) {
      this.socialRecords.set(id, { ...record, ...updates });
    }
  }

  // =============================================================================
  // Messages
  // =============================================================================

  addMessage(message: MessageRecord): void {
    this.messages.set(message.id, message);

    // Update index
    const messages = this.messagesByNpcId.get(message.npc_id) || [];
    messages.push(message.id);
    this.messagesByNpcId.set(message.npc_id, messages);
  }

  getMessage(id: string): MessageRecord | undefined {
    return this.messages.get(id);
  }

  getMessagesByNpcId(npcId: string): MessageRecord[] {
    const messageIds = this.messagesByNpcId.get(npcId) || [];
    return messageIds
      .map(id => this.messages.get(id))
      .filter(msg => msg !== undefined) as MessageRecord[];
  }

  getAllMessages(): MessageRecord[] {
    return Array.from(this.messages.values());
  }

  updateMessage(id: string, updates: Partial<MessageRecord>): void {
    const message = this.messages.get(id);
    if (message) {
      this.messages.set(id, { ...message, ...updates });
    }
  }

  // =============================================================================
  // Operator (System Mode Player)
  // =============================================================================

  setOperator(operator: Operator): void {
    this.operator = operator;
  }

  getOperator(): Operator | null {
    return this.operator;
  }

  updateOperator(updates: Partial<Operator>): void {
    if (this.operator) {
      this.operator = { ...this.operator, ...updates };
    }
  }

  // =============================================================================
  // Directives
  // =============================================================================

  addDirective(directive: DirectiveRead): void {
    this.directives.set(directive.id, directive);
  }

  getDirective(id: string): DirectiveRead | undefined {
    return this.directives.get(id);
  }

  getDirectiveByWeek(week: number): DirectiveRead | undefined {
    return Array.from(this.directives.values()).find(d => d.week_number === week);
  }

  getAllDirectives(): DirectiveRead[] {
    return Array.from(this.directives.values());
  }

  // =============================================================================
  // Citizen Flags
  // =============================================================================

  addFlag(flag: CitizenFlagRead): void {
    this.flags.set(flag.id, flag);

    // Update index - note: CitizenFlagRead doesn't have npc_id directly
    // We'll need to track this separately when creating flags
  }

  getFlag(id: string): CitizenFlagRead | undefined {
    return this.flags.get(id);
  }

  getFlagsByNpcId(npcId: string): CitizenFlagRead[] {
    const flagIds = this.flagsByNpcId.get(npcId) || [];
    return flagIds
      .map(id => this.flags.get(id))
      .filter(flag => flag !== undefined) as CitizenFlagRead[];
  }

  getAllFlags(): CitizenFlagRead[] {
    return Array.from(this.flags.values());
  }

  updateFlag(id: string, updates: Partial<CitizenFlagRead>): void {
    const flag = this.flags.get(id);
    if (flag) {
      this.flags.set(id, { ...flag, ...updates });
    }
  }

  // Link a flag to an NPC (for indexing)
  linkFlagToNpc(flagId: string, npcId: string): void {
    const flags = this.flagsByNpcId.get(npcId) || [];
    if (!flags.includes(flagId)) {
      flags.push(flagId);
      this.flagsByNpcId.set(npcId, flags);
    }
  }

  // =============================================================================
  // Flag Outcomes
  // =============================================================================

  addFlagOutcome(outcome: FlagOutcomeRecord): void {
    this.flagOutcomes.set(outcome.id, outcome);
  }

  getFlagOutcome(id: string): FlagOutcomeRecord | undefined {
    return this.flagOutcomes.get(id);
  }

  getFlagOutcomesByFlagId(flagId: string): FlagOutcomeRecord[] {
    return Array.from(this.flagOutcomes.values())
      .filter(outcome => outcome.flag_id === flagId);
  }

  getAllFlagOutcomes(): FlagOutcomeRecord[] {
    return Array.from(this.flagOutcomes.values());
  }

  // =============================================================================
  // Operator Metrics
  // =============================================================================

  addOperatorMetrics(metrics: OperatorMetrics): void {
    this.operatorMetrics.set(metrics.id, metrics);
  }

  getOperatorMetrics(id: string): OperatorMetrics | undefined {
    return this.operatorMetrics.get(id);
  }

  getOperatorMetricsByDate(date: string): OperatorMetrics | undefined {
    return Array.from(this.operatorMetrics.values())
      .find(m => m.date === date);
  }

  getAllOperatorMetrics(): OperatorMetrics[] {
    return Array.from(this.operatorMetrics.values());
  }

  // =============================================================================
  // Public Metrics (Phase 7-8)
  // =============================================================================

  setPublicMetrics(metrics: PublicMetricsRead): void {
    this.publicMetrics = metrics;
  }

  getPublicMetrics(): PublicMetricsRead | null {
    return this.publicMetrics;
  }

  // =============================================================================
  // Reluctance Metrics (Phase 7-8)
  // =============================================================================

  setReluctanceMetrics(metrics: ReluctanceMetricsRead): void {
    this.reluctanceMetrics = metrics;
  }

  getReluctanceMetrics(): ReluctanceMetricsRead | null {
    return this.reluctanceMetrics;
  }

  // =============================================================================
  // News Channels (Phase 7-8)
  // =============================================================================

  addNewsChannel(channel: NewsChannelRead): void {
    this.newsChannels.set(channel.id, channel);
  }

  getNewsChannel(id: string): NewsChannelRead | undefined {
    return this.newsChannels.get(id);
  }

  getAllNewsChannels(): NewsChannelRead[] {
    return Array.from(this.newsChannels.values());
  }

  updateNewsChannel(id: string, updates: Partial<NewsChannelRead>): void {
    const channel = this.newsChannels.get(id);
    if (channel) {
      this.newsChannels.set(id, { ...channel, ...updates });
    }
  }

  // =============================================================================
  // News Articles (Phase 7-8)
  // =============================================================================

  addNewsArticle(article: NewsArticleRead): void {
    this.newsArticles.set(article.id, article);
  }

  getNewsArticle(id: string): NewsArticleRead | undefined {
    return this.newsArticles.get(id);
  }

  getAllNewsArticles(): NewsArticleRead[] {
    return Array.from(this.newsArticles.values());
  }

  // =============================================================================
  // Protests (Phase 7-8)
  // =============================================================================

  addProtest(protest: ProtestRead): void {
    this.protests.set(protest.id, protest);
  }

  getProtest(id: string): ProtestRead | undefined {
    return this.protests.get(id);
  }

  getAllProtests(): ProtestRead[] {
    return Array.from(this.protests.values());
  }

  getActiveProtests(): ProtestRead[] {
    return Array.from(this.protests.values())
      .filter(p => p.status === 'active' || p.status === 'forming');
  }

  updateProtest(id: string, updates: Partial<ProtestRead>): void {
    const protest = this.protests.get(id);
    if (protest) {
      this.protests.set(id, { ...protest, ...updates });
    }
  }

  // =============================================================================
  // Operator Data (Phase 7-8)
  // =============================================================================

  setOperatorData(data: OperatorDataRead): void {
    this.operatorData = data;
  }

  getOperatorData(): OperatorDataRead | null {
    return this.operatorData;
  }

  // =============================================================================
  // Neighborhoods (Phase 7-8)
  // =============================================================================

  addNeighborhood(neighborhood: NeighborhoodRead): void {
    this.neighborhoods.set(neighborhood.id, neighborhood);
  }

  getNeighborhood(id: string): NeighborhoodRead | undefined {
    return this.neighborhoods.get(id);
  }

  getNeighborhoodByName(name: string): NeighborhoodRead | undefined {
    return Array.from(this.neighborhoods.values())
      .find(n => n.name.toLowerCase() === name.toLowerCase());
  }

  getAllNeighborhoods(): NeighborhoodRead[] {
    return Array.from(this.neighborhoods.values());
  }

  // =============================================================================
  // Book Events (Phase 7-8)
  // =============================================================================

  addBookEvent(event: BookPublicationEventRead): void {
    this.bookEvents.set(event.id, event);
  }

  getBookEvent(id: string): BookPublicationEventRead | undefined {
    return this.bookEvents.get(id);
  }

  getAllBookEvents(): BookPublicationEventRead[] {
    return Array.from(this.bookEvents.values());
  }

  // =============================================================================
  // System Actions (Phase 7-8)
  // =============================================================================

  addSystemAction(action: SystemActionRead): void {
    this.systemActions.set(action.id, action);
  }

  getSystemAction(id: string): SystemActionRead | undefined {
    return this.systemActions.get(id);
  }

  getAllSystemActions(): SystemActionRead[] {
    return Array.from(this.systemActions.values());
  }

  getSystemActionsByOperatorId(operatorId: string): SystemActionRead[] {
    return Array.from(this.systemActions.values())
      .filter(a => a.operator_id === operatorId);
  }

  // =============================================================================
  // Game Time Management
  // =============================================================================

  getCurrentWeek(): number {
    return this.currentWeek;
  }

  setCurrentWeek(week: number): void {
    this.currentWeek = week;
  }

  advanceWeek(): void {
    this.currentWeek++;
  }

  getCurrentTimePeriod(): string {
    return this.currentTimePeriod;
  }

  setCurrentTimePeriod(period: string): void {
    this.currentTimePeriod = period;
  }

  // =============================================================================
  // Persistence (Save/Load)
  // =============================================================================

  /**
   * Save entire game state to localStorage.
   * For larger datasets, consider using IndexedDB instead.
   */
  save(): void {
    const state = {
      version: this.VERSION,
      timestamp: new Date().toISOString(),
      npcs: Array.from(this.npcs.entries()),
      healthRecords: Array.from(this.healthRecords.entries()),
      financeRecords: Array.from(this.financeRecords.entries()),
      judicialRecords: Array.from(this.judicialRecords.entries()),
      locationRecords: Array.from(this.locationRecords.entries()),
      socialRecords: Array.from(this.socialRecords.entries()),
      messages: Array.from(this.messages.entries()),
      operator: this.operator,
      directives: Array.from(this.directives.entries()),
      flags: Array.from(this.flags.entries()),
      flagOutcomes: Array.from(this.flagOutcomes.entries()),
      operatorMetrics: Array.from(this.operatorMetrics.entries()),
      publicMetrics: this.publicMetrics,
      reluctanceMetrics: this.reluctanceMetrics,
      newsChannels: Array.from(this.newsChannels.entries()),
      newsArticles: Array.from(this.newsArticles.entries()),
      protests: Array.from(this.protests.entries()),
      operatorData: this.operatorData,
      neighborhoods: Array.from(this.neighborhoods.entries()),
      bookEvents: Array.from(this.bookEvents.entries()),
      systemActions: Array.from(this.systemActions.entries()),
      currentWeek: this.currentWeek,
      currentTimePeriod: this.currentTimePeriod,
    };

    try {
      const json = JSON.stringify(state);
      localStorage.setItem(this.STORAGE_KEY, json);
      console.log('[GameStore] State saved to localStorage');
    } catch (error) {
      console.error('[GameStore] Failed to save state:', error);
      // If localStorage is full, could fall back to IndexedDB
    }
  }

  /**
   * Load game state from localStorage.
   */
  load(): boolean {
    try {
      const json = localStorage.getItem(this.STORAGE_KEY);
      if (!json) {
        console.log('[GameStore] No saved state found');
        return false;
      }

      const state = JSON.parse(json);

      // Version check
      if (state.version !== this.VERSION) {
        console.warn(`[GameStore] Version mismatch: ${state.version} vs ${this.VERSION}`);
        // Could implement migration logic here
        return false;
      }

      // Restore all data
      this.npcs = new Map(state.npcs);
      this.healthRecords = new Map(state.healthRecords);
      this.financeRecords = new Map(state.financeRecords);
      this.judicialRecords = new Map(state.judicialRecords);
      this.locationRecords = new Map(state.locationRecords);
      this.socialRecords = new Map(state.socialRecords);
      this.messages = new Map(state.messages);
      this.operator = state.operator;
      this.directives = new Map(state.directives);
      this.flags = new Map(state.flags);
      this.flagOutcomes = new Map(state.flagOutcomes);
      this.operatorMetrics = new Map(state.operatorMetrics);
      this.publicMetrics = state.publicMetrics;
      this.reluctanceMetrics = state.reluctanceMetrics;
      this.newsChannels = new Map(state.newsChannels);
      this.newsArticles = new Map(state.newsArticles);
      this.protests = new Map(state.protests);
      this.operatorData = state.operatorData;
      this.neighborhoods = new Map(state.neighborhoods);
      this.bookEvents = new Map(state.bookEvents);
      this.systemActions = new Map(state.systemActions);
      this.currentWeek = state.currentWeek;
      this.currentTimePeriod = state.currentTimePeriod;

      // Rebuild indexes
      this.rebuildIndexes();

      console.log(`[GameStore] State loaded from ${state.timestamp}`);
      return true;
    } catch (error) {
      console.error('[GameStore] Failed to load state:', error);
      return false;
    }
  }

  /**
   * Clear all game data.
   */
  clear(): void {
    this.npcs.clear();
    this.healthRecords.clear();
    this.financeRecords.clear();
    this.judicialRecords.clear();
    this.locationRecords.clear();
    this.socialRecords.clear();
    this.messages.clear();
    this.operator = null;
    this.directives.clear();
    this.flags.clear();
    this.flagOutcomes.clear();
    this.operatorMetrics.clear();
    this.publicMetrics = null;
    this.reluctanceMetrics = null;
    this.newsChannels.clear();
    this.newsArticles.clear();
    this.protests.clear();
    this.operatorData = null;
    this.neighborhoods.clear();
    this.bookEvents.clear();
    this.systemActions.clear();
    this.currentWeek = 1;
    this.currentTimePeriod = 'immediate';

    this.clearIndexes();

    localStorage.removeItem(this.STORAGE_KEY);
    console.log('[GameStore] All data cleared');
  }

  /**
   * Rebuild all indexes from scratch.
   */
  private rebuildIndexes(): void {
    this.clearIndexes();

    // NPC name index
    for (const [id, npc] of this.npcs) {
      const fullName = `${npc.first_name} ${npc.last_name}`.toLowerCase();
      this.npcsByName.set(fullName, id);
    }

    // Health records by NPC
    for (const [id, record] of this.healthRecords) {
      this.healthRecordsByNpcId.set(record.npc_id, id);
    }

    // Finance records by NPC
    for (const [id, record] of this.financeRecords) {
      this.financeRecordsByNpcId.set(record.npc_id, id);
    }

    // Judicial records by NPC
    for (const [id, record] of this.judicialRecords) {
      this.judicialRecordsByNpcId.set(record.npc_id, id);
    }

    // Location records by NPC
    for (const [id, record] of this.locationRecords) {
      this.locationRecordsByNpcId.set(record.npc_id, id);
    }

    // Social records by NPC
    for (const [id, record] of this.socialRecords) {
      this.socialRecordsByNpcId.set(record.npc_id, id);
    }

    // Messages by NPC
    for (const [id, message] of this.messages) {
      const messages = this.messagesByNpcId.get(message.npc_id) || [];
      messages.push(id);
      this.messagesByNpcId.set(message.npc_id, messages);
    }

    console.log('[GameStore] Indexes rebuilt');
  }

  /**
   * Clear all indexes.
   */
  private clearIndexes(): void {
    this.npcsByName.clear();
    this.healthRecordsByNpcId.clear();
    this.financeRecordsByNpcId.clear();
    this.judicialRecordsByNpcId.clear();
    this.locationRecordsByNpcId.clear();
    this.socialRecordsByNpcId.clear();
    this.messagesByNpcId.clear();
    this.flagsByNpcId.clear();
  }

  /**
   * Get statistics about the game store.
   */
  getStats(): Record<string, number> {
    return {
      npcs: this.npcs.size,
      healthRecords: this.healthRecords.size,
      financeRecords: this.financeRecords.size,
      judicialRecords: this.judicialRecords.size,
      locationRecords: this.locationRecords.size,
      socialRecords: this.socialRecords.size,
      messages: this.messages.size,
      directives: this.directives.size,
      flags: this.flags.size,
      flagOutcomes: this.flagOutcomes.size,
      operatorMetrics: this.operatorMetrics.size,
      newsChannels: this.newsChannels.size,
      newsArticles: this.newsArticles.size,
      protests: this.protests.size,
      neighborhoods: this.neighborhoods.size,
      bookEvents: this.bookEvents.size,
      systemActions: this.systemActions.size,
      currentWeek: this.currentWeek,
    };
  }
}

// Export singleton instance
export const gameStore = new GameStore();
