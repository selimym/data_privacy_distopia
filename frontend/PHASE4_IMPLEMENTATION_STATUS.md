# Phase 4: Game Services Implementation Status

## Overview
Phase 4 involves porting all business logic services from Python (backend) to TypeScript (frontend) for system mode. This creates a "fat client" architecture where game logic runs entirely in the browser.

## Completed Components

### 1. GameStore (Singleton Data Store) ✅
**File**: `frontend/src/state/GameStore.ts`

Replaces PostgreSQL/SQLite database with in-memory storage:
- **Core Entities**: NPCs, HealthRecords, FinanceRecords, JudicialRecords, LocationRecords, SocialMediaRecords, Messages
- **System Mode Entities**: Operator, Directives, Flags, FlagOutcomes, OperatorMetrics
- **Phase 7-8 Entities**: PublicMetrics, ReluctanceMetrics, NewsChannels, NewsArticles, Protests, OperatorData, Neighborhoods, BookEvents, SystemActions
- **Indexing**: Fast lookups by ID, NPC name, domain relationships
- **Persistence**: Save/load to localStorage (can upgrade to IndexedDB)
- **CRUD Operations**: Full Create, Read, Update, Delete for all entities

**Lines**: ~850 lines

### 2. Tier 1 Services ✅

#### a) inference-rules.ts
**File**: `frontend/src/services/inference-rules.ts`

Defines cross-domain inference rules:
- 11 inference rules (sample of 3 shown, structure for all 11)
- RuleCategory enum (8 categories)
- Helper functions: `getInferenceRule()`, `getRulesForDomains()`, `getRulesByCategory()`, `getRulesByScaryLevel()`

**Lines**: ~170 lines

#### b) severity-scoring.ts
**File**: `frontend/src/services/severity-scoring.ts`

Severity scores for 12 action types:
- SEVERITY_SCORES constant (1-10 scale)
- `getSeverityScore()` - Get score for action
- `isHarshAction()` - Determine if action is harsh (severity 7+)
- `getActionDescription()` - Human-readable descriptions
- `getActionCategory()` - UI grouping (citizen, press, protest, etc.)
- `calculateMoralWeight()` - For ending calculation

**Lines**: ~120 lines

#### c) scenario-engine.ts
**Status**: SKIPPED (Rogue Employee Mode only)

### 3. Tier 2 Services ✅

#### a) content-filter.ts
**File**: `frontend/src/services/content-filter.ts`

Content rating filter:
- ContentFilter class with rating hierarchy (SAFE to DYSTOPIAN)
- `filterByRating()` - Filter items by content rating
- `censorText()` - Censor text above rating
- `shouldShowWarning()` - Determine if warning needed
- `getWarningMessage()` - Get appropriate warning text

**Lines**: ~110 lines

#### b) content-loader.ts
**File**: `frontend/src/services/content-loader.ts`

JSON content loading (stub for now):
- `loadInferenceRules()` - Load inference rules
- `loadDirectives()` - Load directives
- `loadCorrelationAlerts()` - Load alerts config
- `loadKeywords()` - Load keywords
- `loadRiskFactorWeights()` - Load risk weights

**Lines**: ~70 lines

#### c) inference-engine.ts
**Status**: NOT YET IMPLEMENTED
**Complexity**: MEDIUM (347 lines in Python)

Port required:
- InferenceEngine class
- Rule evaluation functions (3 hardcoded rules shown in Python)
- `evaluate()` - Evaluate NPC against rules
- `getUnlockable()` - Get rules unlockable by enabling domains
- Rule evaluation: `_evaluateSensitiveHealth()`, `_evaluateMentalHealth()`, `_evaluateStalking Risk()`

## Remaining Services

### Tier 3 Services (4 services) 🔴

#### 1. risk-scoring.ts
**Python**: `backend/src/datafusion/services/risk_scoring.py` (706 lines)
**Complexity**: HIGH
**Priority**: CRITICAL (core surveillance logic)

Key functions to port:
- `calculate_risk_score()` - Main risk calculation engine
- `get_risk_factors()` - Extract contributing factors
- `detect_keyword_matches()` - Keyword detection in messages
- `generate_correlation_alerts()` - Cross-domain correlations
- `get_recommended_actions()` - Action recommendations
- Requires: keyword config, risk factor weights config

#### 2. public-metrics.ts
**Python**: `backend/src/datafusion/services/public_metrics.py` (220 lines)
**Complexity**: MEDIUM
**Priority**: HIGH (Phase 7-8 mechanics)

Key functions:
- `update_awareness()` - Update international awareness
- `update_anger()` - Update public anger
- `check_tier_crossings()` - Detect tier changes (1-5)
- `get_tier_description()` - Tier descriptions
- `should_trigger_event()` - Event trigger logic

#### 3. reluctance-tracking.ts
**Python**: `backend/src/datafusion/services/reluctance_tracking.py` (222 lines)
**Complexity**: MEDIUM
**Priority**: HIGH (Phase 7-8 mechanics)

Key functions:
- `update_reluctance()` - Update operator reluctance
- `apply_no_action()` - Increase reluctance for inaction
- `apply_harsh_action()` - Decrease reluctance for harsh actions
- `check_review_threshold()` - Check if operator under review
- `get_reluctance_stage()` - Get current stage (0-3)

#### 4. time-progression.ts
**Python**: `backend/src/datafusion/services/time_progression.py` (115 lines)
**Complexity**: LOW
**Priority**: MEDIUM

Key functions:
- `advance_time_period()` - Progress game time
- `get_next_directive()` - Get next week's directive
- Time periods: immediate → 1_month → 6_months → 1_year

### Tier 4 Services (5 services) 🔴

#### 1. citizen-outcomes.ts
**Python**: `backend/src/datafusion/services/citizen_outcomes.py` (360 lines)
**Complexity**: MEDIUM
**Priority**: HIGH (narrative generation)

Key functions:
- `generate_immediate_outcome()` - Immediate consequences
- `generate_long_term_outcome()` - 1 month/6 months/1 year outcomes
- `select_outcome_template()` - Template selection
- `fill_outcome_template()` - Template population
- Outcome templates for 4 flag types × 4 time periods

#### 2. operator-tracker.ts
**Python**: `backend/src/datafusion/services/operator_tracker.py` (510 lines)
**Complexity**: HIGH
**Priority**: CRITICAL (decision tracking)

Key functions:
- `track_decision()` - Track operator decision
- `update_compliance()` - Update compliance score
- `check_hesitation()` - Detect hesitation
- `apply_warnings()` - Apply compliance warnings
- `update_metrics()` - Update daily metrics
- `check_termination()` - Check if operator should be terminated

#### 3. news-system.ts
**Python**: `backend/src/datafusion/services/news_system.py` (410 lines)
**Complexity**: HIGH
**Priority**: HIGH (Phase 7-8)

Key functions:
- `generate_random_article()` - Generate random news
- `generate_triggered_article()` - Action-triggered news
- `generate_exposure_article()` - Operator exposure news
- `select_channel()` - Select news channel
- `calculate_impact()` - Calculate awareness/anger impact
- Channel types: critical, independent, state_friendly

#### 4. protest-system.ts
**Python**: `backend/src/datafusion/services/protest_system.py` (267 lines)
**Complexity**: MEDIUM
**Priority**: HIGH (Phase 7-8)

Key functions:
- `check_protest_formation()` - Check if protest should form
- `simulate_protest_gamble()` - Handle incite_violence gamble
- `update_protest_status()` - Update protest state
- `calculate_casualties()` - Calculate casualties
- Protest states: forming → active → violent/dispersed/suppressed

#### 5. event-generation.ts
**Python**: `backend/src/datafusion/services/event_generation.py` (267 lines)
**Complexity**: MEDIUM
**Priority**: MEDIUM

Key functions:
- `check_book_publication()` - Check for controversial book
- `check_reporter_targeting()` - Check if reporter should be targeted
- `generate_exposure_event()` - Generate operator exposure event
- Exposure stages: 0 (none) → 1 (hints) → 2 (partial) → 3 (full)

### Tier 5 Services (2 services) 🔴

#### 1. action-execution.ts
**Python**: `backend/src/datafusion/services/action_execution.py` (460 lines)
**Complexity**: HIGH
**Priority**: CRITICAL (action handling)

Key functions:
- `execute_action()` - Main action execution
- `execute_citizen_action()` - Citizen-targeted actions
- `execute_press_action()` - Press-targeted actions
- `execute_protest_action()` - Protest-targeted actions
- `execute_hospital_action()` - Hospital arrest
- `calculate_backlash()` - Calculate backlash probability
- `apply_action_effects()` - Apply awareness/anger/reluctance changes

#### 2. ending-calculator.ts
**Python**: `backend/src/datafusion/services/ending_calculator.py` (932 lines)
**Complexity**: VERY HIGH
**Priority**: CRITICAL (game ending logic)

Key functions:
- `calculate_ending()` - Main ending calculation
- `determine_ending_type()` - Determine which of 9 endings
- `generate_ending_narrative()` - Generate ending text
- `calculate_statistics()` - Calculate ending statistics
- `select_real_world_content()` - Select educational content
- 9 ending types:
  - compliant_operator
  - reluctant_operator
  - suspended_operator
  - resistance_path
  - fired_early
  - imprisoned_dissent
  - international_pariah
  - revolutionary_catalyst
  - reluctant_survivor

## Total Service Count

- **Total Services**: 16 services
- **Completed**: 4 services (GameStore + 3 Tier 1-2)
- **Remaining**: 12 services (1 Tier 2 + 4 Tier 3 + 5 Tier 4 + 2 Tier 5)
- **Total Lines**: ~5,200 lines to port (excluding GameStore)

## Implementation Order

### Priority 1 (CRITICAL for basic gameplay)
1. ✅ GameStore (data layer)
2. ✅ severity-scoring.ts
3. 🔴 risk-scoring.ts (706 lines)
4. 🔴 operator-tracker.ts (510 lines)
5. 🔴 action-execution.ts (460 lines)
6. 🔴 ending-calculator.ts (932 lines)

### Priority 2 (HIGH for full system mode)
7. 🔴 citizen-outcomes.ts (360 lines)
8. 🔴 public-metrics.ts (220 lines)
9. 🔴 reluctance-tracking.ts (222 lines)
10. 🔴 news-system.ts (410 lines)
11. 🔴 protest-system.ts (267 lines)

### Priority 3 (MEDIUM for polish)
12. ✅ content-filter.ts
13. 🔴 inference-engine.ts (347 lines)
14. 🔴 time-progression.ts (115 lines)
15. 🔴 event-generation.ts (267 lines)

### Priority 4 (LOW for rogue mode - SKIPPED)
16. ~~scenario-engine.ts~~ (SKIPPED - rogue employee mode)

## Conversion Guidelines

### Database → GameStore
```python
# Python (backend)
async def get_citizen(session: AsyncSession, npc_id: UUID):
    result = await session.execute(
        select(NPC).where(NPC.id == npc_id)
    )
    return result.scalar_one_or_none()
```

```typescript
// TypeScript (frontend)
function getCitizen(npcId: string): NPCRead | undefined {
  return gameStore.getNPC(npcId);
}
```

### Async → Sync (for non-I/O functions)
```python
# Python
async def calculate_score(data: dict) -> int:
    # Pure calculation, no database access
    return sum(data.values())
```

```typescript
// TypeScript
function calculateScore(data: Record<string, number>): number {
  return Object.values(data).reduce((sum, val) => sum + val, 0);
}
```

### SQLAlchemy Queries → Array Operations
```python
# Python
result = await session.execute(
    select(Flag).where(Flag.npc_id == npc_id).order_by(Flag.created_at.desc())
)
flags = list(result.scalars().all())
```

```typescript
// TypeScript
const flags = gameStore.getFlagsByNpcId(npcId)
  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
```

### JSON Loading
```python
# Python
from datafusion.services.content_loader import load_keywords
keywords = load_keywords()
```

```typescript
// TypeScript
import { loadKeywords } from './content-loader';
const keywords = await loadKeywords();
```

## Testing Strategy

For each ported service:
1. Create test file: `frontend/src/services/__tests__/{service}.test.ts`
2. Generate test data using Phase 3 generators
3. Test against known Python outputs
4. Verify edge cases and error handling

## Next Steps

1. **Tier 2**: Complete inference-engine.ts (347 lines)
2. **Tier 3**: Port risk-scoring.ts (706 lines) - CRITICAL
3. **Tier 3**: Port public-metrics.ts, reluctance-tracking.ts, time-progression.ts
4. **Tier 4**: Port citizen-outcomes.ts, operator-tracker.ts, news-system.ts, protest-system.ts, event-generation.ts
5. **Tier 5**: Port action-execution.ts, ending-calculator.ts
6. **Integration**: Wire services together, test full gameplay loop
7. **Generators**: Integrate Phase 3 generators to populate GameStore on game start

## Files Created

1. ✅ `frontend/src/state/GameStore.ts` (850 lines)
2. ✅ `frontend/src/services/content-loader.ts` (70 lines)
3. ✅ `frontend/src/services/inference-rules.ts` (170 lines)
4. ✅ `frontend/src/services/severity-scoring.ts` (120 lines)
5. ✅ `frontend/src/services/content-filter.ts` (110 lines)
6. 🔴 `frontend/src/services/inference-engine.ts` (TODO)
7. 🔴 `frontend/src/services/risk-scoring.ts` (TODO)
8. 🔴 `frontend/src/services/public-metrics.ts` (TODO)
9. 🔴 `frontend/src/services/reluctance-tracking.ts` (TODO)
10. 🔴 `frontend/src/services/time-progression.ts` (TODO)
11. 🔴 `frontend/src/services/citizen-outcomes.ts` (TODO)
12. 🔴 `frontend/src/services/operator-tracker.ts` (TODO)
13. 🔴 `frontend/src/services/news-system.ts` (TODO)
14. 🔴 `frontend/src/services/protest-system.ts` (TODO)
15. 🔴 `frontend/src/services/event-generation.ts` (TODO)
16. 🔴 `frontend/src/services/action-execution.ts` (TODO)
17. 🔴 `frontend/src/services/ending-calculator.ts` (TODO)

## Estimated Work

- **Completed**: ~1,320 lines (GameStore + 4 services)
- **Remaining**: ~4,800 lines (12 services)
- **Total**: ~6,120 lines

**Time Estimate**:
- Tier 2 completion: 2-3 hours
- Tier 3 (4 services): 6-8 hours
- Tier 4 (5 services): 10-12 hours
- Tier 5 (2 services): 8-10 hours
- Testing & Integration: 4-6 hours
- **Total**: 30-40 hours of development time
