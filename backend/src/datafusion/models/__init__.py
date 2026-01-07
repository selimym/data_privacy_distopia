"""Models package - exports all database models."""

from datafusion.models.abuse import (
    AbuseAction,
    AbuseExecution,
    AbuseRole,
    ConsequenceSeverity,
    TargetType,
)
from datafusion.models.consequence import ConsequenceTemplate, TimeSkip
from datafusion.models.finance import (
    AccountType,
    BankAccount,
    Debt,
    DebtType,
    EmploymentStatus,
    FinanceRecord,
    Transaction,
    TransactionCategory,
)
from datafusion.models.health import (
    HealthCondition,
    HealthMedication,
    HealthRecord,
    HealthVisit,
    Severity,
)
from datafusion.models.inference import ContentRating, RuleCategory
from datafusion.models.judicial import (
    CaseDisposition,
    CivilCase,
    CivilCaseType,
    CrimeCategory,
    CriminalRecord,
    JudicialRecord,
    TrafficViolation,
    ViolationType,
)
from datafusion.models.location import (
    DayOfWeek,
    InferredLocation,
    LocationRecord,
    LocationType,
)
from datafusion.models.messages import Message, MessageRecord
from datafusion.models.npc import NPC, Role
from datafusion.models.social import (
    InferenceCategory,
    Platform,
    PrivateInference,
    PublicInference,
    SocialMediaRecord,
)
from datafusion.models.system_mode import (
    CitizenFlag,
    Directive,
    FlagOutcome,
    FlagType,
    Operator,
    OperatorMetrics,
    OperatorStatus,
)

__all__ = [
    # NPC models
    "NPC",
    "Role",
    # Health models
    "HealthRecord",
    "HealthCondition",
    "HealthMedication",
    "HealthVisit",
    "Severity",
    # Finance models
    "FinanceRecord",
    "BankAccount",
    "Debt",
    "Transaction",
    "EmploymentStatus",
    "AccountType",
    "DebtType",
    "TransactionCategory",
    # Judicial models
    "JudicialRecord",
    "CriminalRecord",
    "CivilCase",
    "TrafficViolation",
    "CrimeCategory",
    "CivilCaseType",
    "ViolationType",
    "CaseDisposition",
    # Location models
    "LocationRecord",
    "InferredLocation",
    "LocationType",
    "DayOfWeek",
    # Message models
    "MessageRecord",
    "Message",
    # Social Media models
    "SocialMediaRecord",
    "PublicInference",
    "PrivateInference",
    "Platform",
    "InferenceCategory",
    # Inference enums
    "ContentRating",
    "RuleCategory",
    # Abuse models
    "AbuseRole",
    "AbuseAction",
    "AbuseExecution",
    "TargetType",
    "ConsequenceSeverity",
    # Consequence models
    "ConsequenceTemplate",
    "TimeSkip",
    # System Mode models
    "Operator",
    "OperatorMetrics",
    "Directive",
    "CitizenFlag",
    "OperatorStatus",
    "FlagType",
    "FlagOutcome",
]
