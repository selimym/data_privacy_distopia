/**
 * Barrel export file for all TypeScript types.
 * Provides centralized exports for all domain models and enums.
 */

// === NPC Types ===
export {
  Role,
  Severity,
  DomainType,
  ContentRating,
  type NPCBase,
  type NPCRead,
  type NPCBasic,
  type NPCListResponse,
  type HealthCondition,
  type HealthMedication,
  type HealthVisit,
  type HealthRecord,
  type BankAccount,
  type Debt,
  type Transaction,
  type FinanceRecord,
  type CriminalRecord,
  type CivilCase,
  type TrafficViolation,
  type JudicialRecord,
  type InferredLocation,
  type LocationRecord,
  type PublicInference,
  type PrivateInference,
  type SocialMediaRecord,
  type DomainData,
  type NPCWithDomains,
  type InferenceResult,
  type UnlockableInference,
  type InferencesResponse,
} from './npc';

// === Health Types ===
export {
  Severity as HealthSeverity,
  type HealthRecord as HealthRecordDomain,
  type HealthCondition as HealthConditionDomain,
  type HealthMedication as HealthMedicationDomain,
  type HealthVisit as HealthVisitDomain,
} from './health';

// === Finance Types ===
export {
  EmploymentStatus,
  AccountType,
  DebtType,
  TransactionCategory,
  type FinanceRecord as FinanceRecordDomain,
  type BankAccount as BankAccountDomain,
  type Debt as DebtDomain,
  type Transaction as TransactionDomain,
} from './finance';

// === Judicial Types ===
export {
  CaseDisposition,
  CrimeCategory,
  CivilCaseType,
  ViolationType,
  type JudicialRecord as JudicialRecordDomain,
  type CriminalRecord as CriminalRecordDomain,
  type CivilCase as CivilCaseDomain,
  type TrafficViolation as TrafficViolationDomain,
} from './judicial';

// === Location Types ===
export {
  LocationType,
  DayOfWeek,
  type LocationRecord as LocationRecordDomain,
  type InferredLocation as InferredLocationDomain,
} from './location';

// === Social Types ===
export {
  Platform,
  InferenceCategory,
  type SocialMediaRecord as SocialMediaRecordDomain,
  type PublicInference as PublicInferenceDomain,
  type PrivateInference as PrivateInferenceDomain,
} from './social';

// === System Mode Types ===
export {
  type OperatorStatusType,
  type FlagType,
  type FlagOutcome,
  type RiskLevel,
  type AlertType,
  type AlertUrgency,
  type ComplianceTrend,
  type ActionType,
  NewActionType,
  type ActionUrgency,
  type EndingType,
  type ArticleType,
  type ProtestStatusType,
  type OperatorStatus,
  type DirectiveRead,
  type DailyMetrics,
  type SystemAlert,
  type SystemDashboard,
  type SystemDashboardWithCases,
  type ContributingFactor,
  type CorrelationAlert,
  type RecommendedAction,
  type RiskAssessment,
  type CaseOverview,
  type MessageRead,
  type CitizenFlagRead,
  type IdentityRead,
  type FullCitizenFile,
  type FlagSubmission,
  type MetricsDelta,
  type FlagResult,
  type NoActionSubmission,
  type NoActionResult,
  type FlagSummary,
  type CitizenOutcome,
  type CitizenOutcomeSummary,
  type OperatorContributingFactor,
  type OperatorRiskAssessment,
  type RealWorldExample,
  type RealWorldParallel,
  type EducationalLink,
  type EndingStatistics,
  type EndingResult,
  type SystemStartResponse,
  type CinematicData,
  type TierEventRead,
  type PublicMetricsRead,
  type ReluctanceMetricsRead,
  type NewsReporterRead,
  type NewsChannelRead,
  type NewsArticleRead,
  type ProtestRead,
  type GambleResultRead,
  type FamilyMemberRead,
  type ExposureEventRead,
  type ExposureRiskRead,
  type OperatorDataRead,
  type NeighborhoodRead,
  type BookPublicationEventRead,
  type SystemActionRequest,
  type SystemActionRead,
  type ActionAvailabilityRead,
  type TriggeredEventRead,
  type TerminationDecisionRead,
  type ActionResultRead,
  type NoActionResultReadNew,
  type AvailableActionsRead,
} from './system';

// === Abuse/Rogue Employee Types (not part of system mode) ===
export {
  TargetType,
  ConsequenceSeverity,
  TimeSkip,
  type AbuseRole,
  type AbuseAction,
  type AbuseExecuteRequest,
  type AbuseExecuteResponse,
  type RealWorldParallel as AbuseRealWorldParallel,
  type ConsequenceChain,
  type ContentWarning,
  type ScenarioWarnings,
} from './abuse';

// === Scenario Types (not part of system mode) ===
export type {
  ScenarioState,
  ScenarioPrompt,
} from './scenario';
