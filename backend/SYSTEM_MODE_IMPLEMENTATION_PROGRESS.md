# System Mode Expansion - Implementation Progress

**Status**: Phase 6 Complete - All Backend + API Complete!
**Date**: 2026-01-18

## ✅ Completed (Phases 1-6)

### Phase 1: Database Foundation
- **All new database models created** (`backend/src/datafusion/models/system_mode.py`):
  - `SystemAction` - Unified action system (replaces/extends CitizenFlag)
  - `PublicMetrics` - International awareness and public anger tracking
  - `ReluctanceMetrics` - Operator reluctance/dissent tracking
  - `NewsChannel` - News organizations with reporters
  - `NewsArticle` - Published articles that increase metrics
  - `Protest` - Protest events triggered by high anger
  - `OperatorData` - Operator's personal data for progressive exposure
  - `Neighborhood` - Map neighborhoods for ICE raids/protests
  - `BookPublicationEvent` - Random book publications that can be banned

- **Database tables created** via direct SQLAlchemy model creation
  - All 9 new tables exist in database
  - Foreign key relationships configured properly
  - NPC model updated with hospitalization tracking

- **Seed data created and populated**:
  - **8 neighborhoods** with map coordinates (Medical Quarter, Riverside District, Downtown Core, etc.)
  - **5 news channels** with different stances (critical, independent, state_friendly)
  - Each channel has reporters with specialties

- **Model exports updated** in `backend/src/datafusion/models/__init__.py`

### Phase 2: Core Services
- **ReluctanceTrackingService** (`backend/src/datafusion/services/reluctance_tracking.py`):
  - Tracks operator's unwillingness to comply (0-100 score)
  - Updates based on no-action (+10), hesitation (+3), quota shortfall (+5)
  - Decreases for harsh actions (-5) and meeting quota (-2)
  - Termination threshold checks (fired at 80+ early weeks, imprisoned later)
  - Warning generation (3 escalating stages)
  - Functions: `update_reluctance_score()`, `check_termination_threshold()`, `generate_reluctance_warning()`

- **PublicMetricsService** (`backend/src/datafusion/services/public_metrics.py`):
  - Tracks international awareness and public anger (0-100 each)
  - 5-tier threshold system for both metrics
  - Awareness tiers: Local reports (20) → Global sanctions (95)
  - Anger tiers: Murmurs (20) → Revolutionary conditions (95)
  - Probability calculators for protests, news, backlash
  - Functions: `update_public_metrics()`, `calculate_protest_probability()`, `calculate_news_probability()`

- **SeverityScoringService** (`backend/src/datafusion/services/severity_scoring.py`):
  - Defines severity scores (1-10) for all 12 action types
  - MONITORING (1) → INCITE_VIOLENCE (9)
  - Functions: `get_severity_score()`, `is_harsh_action()`, `get_action_description()`

### Phase 3: Event Services
- **EventGenerationService** (`backend/src/datafusion/services/event_generation.py`):
  - Orchestrates all triggered and random events
  - Checks news article triggers (multiple channels can cover same event)
  - Checks protest triggers (probability-based on severity + anger)
  - Checks detention injuries (30% chance → enables HOSPITAL_ARREST)
  - Generates random events (background news 15%, book publications 20%)
  - Select protest neighborhoods (citizen location or ICE raid target)
  - Calculate protest size (50-5000, scales with anger + severity)
  - Functions: `check_triggered_events()`, `generate_random_events()`, `check_detention_injury()`

- **NewsSystemService** (`backend/src/datafusion/services/news_system.py`):
  - Article generation with templates for each action type
  - Stance-specific headlines (critical/independent/state-friendly)
  - Triggered articles (action-specific) vs background articles (general coverage)
  - Exposure articles (3 stages: hints → partial → full)
  - Suppression with Streisand effect: 60% success, 40% backfire (huge attention)
  - Functions: `generate_triggered_article()`, `generate_background_article()`, `suppress_news_channel()`

- **ProtestSystemService** (`backend/src/datafusion/services/protest_system.py`):
  - Protest triggers based on anger + severity formula
  - 30% chance state plants inciting agent (automatic, sets up gamble)
  - Legal suppression (DECLARE_ILLEGAL): Always succeeds, high awareness cost
  - Violence suppression (INCITE_VIOLENCE): 60% success, 40% agent discovered = catastrophe
  - Gamble failure: +25 awareness, +30 anger - revolutionary conditions
  - Functions: `trigger_protest()`, `suppress_protest_legal()`, `suppress_protest_violence()`

- **OperatorDataTracker** (`backend/src/datafusion/services/operator_data_tracker.py`):
  - Generates fake operator profile (name, address, family) at session start
  - Tracks behavioral patterns (search queries, hesitation, decision types)
  - Progressive exposure triggers (awareness 30 → 60 → 80 OR reluctance 70)
  - Stage 1 (hints): Vague references in articles
  - Stage 2 (partial): Search queries, hesitation patterns, family names revealed
  - Stage 3 (full): Complete profile exposed - name, address, all behavioral data
  - Creates visceral discomfort by showing player their own surveillance
  - Functions: `generate_operator_profile()`, `track_decision()`, `trigger_exposure_event()`

### Phase 4: Unified Action Execution
- **ActionExecutionService** (`backend/src/datafusion/services/action_execution.py`):
  - Central orchestrator that ties all services together
  - 10-step execution pipeline:
    1. Validate action availability (check prerequisites)
    2. Calculate severity and backlash probability
    3. Create action record
    4. Execute action-specific logic (detention injury, press suppression, protest suppression)
    5. Update public metrics (awareness + anger)
    6. Roll for triggered events (news, protests)
    7. Update reluctance metrics
    8. Check termination threshold
    9. Track operator behavior
    10. Check exposure trigger
  - Returns comprehensive ActionResult with all changes and events
  - Handles "no action" submission (increases reluctance)
  - Modular design: each action type has its own handler
  - Functions: `execute_action()`, `check_action_availability()`, `submit_no_action()`

### Phase 5: Pydantic Schemas ✅
- **All schemas created** (`backend/src/datafusion/schemas/system.py`):
  - **Enums**: ActionType, ArticleType, ProtestStatus
  - **Metrics**: PublicMetricsRead, ReluctanceMetricsRead, TierEventRead
  - **News**: NewsChannelRead, NewsArticleRead, NewsReporterRead
  - **Protests**: ProtestRead, GambleResultRead
  - **Operator Data**: OperatorDataRead, ExposureEventRead, ExposureRiskRead, FamilyMemberRead
  - **Geography**: NeighborhoodRead
  - **Books**: BookPublicationEventRead
  - **Actions**: SystemActionRequest, SystemActionRead, ActionAvailabilityRead, ActionResultRead, NoActionResultRead, AvailableActionsRead, TerminationDecisionRead, TriggeredEventRead

- **Schema exports updated** in `backend/src/datafusion/schemas/__init__.py`
  - All 23 new schemas exported for API use

### Phase 6: API Endpoints ✅
- **12 new endpoints added** (`backend/src/datafusion/api/system.py`):
  - POST `/system/actions/execute` - Execute any action type (unified action system)
  - POST `/system/actions/no-action-new` - Submit no-action decision (reluctance tracking)
  - GET `/system/actions/available` - Get currently available actions (dynamic based on game state)
  - GET `/system/metrics/public` - Get public backlash metrics
  - GET `/system/metrics/reluctance` - Get operator reluctance metrics
  - GET `/system/news/recent` - Get recent news articles (with limit query param)
  - GET `/system/news/channels` - Get all news channels and reporters
  - GET `/system/protests/active` - Get active protests
  - GET `/system/books/pending` - Get pending book publications
  - GET `/system/operator/exposure-risk` - Get exposure stage and risk level
  - GET `/system/operator/data` - Get operator's tracked personal data
  - GET `/system/neighborhoods` - Get all map neighborhoods

- **Full request/response cycle** with FastAPI
- **Schema validation** using Pydantic models
- **Database integration** with async SQLAlchemy queries

## 🚧 To Do (Phases 7-8)

**Next Steps**: Frontend → Content

### Phase 7: Frontend Components
- [ ] **PublicMetricsDisplay** - Two horizontal progress bars (awareness + anger)
- [ ] **ReluctanceWarningPanel** - Show warnings when reluctance > 60
- [ ] **NewsFeedPanel** - Scrollable article list with action buttons
- [ ] **ProtestAlertModal** - Alert when new protest forms
- [ ] **ActionGambleModal** - Warning for high-risk actions
- [ ] **ExposureEventModal** - 3 visual stages (hints/partial/full)
- [ ] **NeighborhoodOverlay** - Shows neighborhood during cinematics
- [ ] Update **SystemDashboardScene** - Integrate all new panels
- [ ] Update **WorldScene** - Add neighborhood cinematics (ICE raids, protests)

### Phase 8: Content and Balance
- [ ] Add new directives (weeks 7-9):
  - Week 7: Media Control (ban outlets or silence reporters)
  - Week 8: Civil Order Restoration (suppress protests)
  - Week 9: Total Information Awareness (5 high-severity actions)
- [ ] Update ending calculator with new ending types:
  - FIRED_EARLY, IMPRISONED_DISSENT, INTERNATIONAL_PARIAH, REVOLUTIONARY_CATALYST, RELUCTANT_SURVIVOR
- [ ] Balance tuning:
  - Test probability formulas
  - Adjust tier thresholds
  - Tune severity scores
  - Playtest full game flow

## File Structure

### Backend (Completed)
```
backend/src/datafusion/
├── models/
│   ├── system_mode.py (✅ updated with 9 new models)
│   └── npc.py (✅ updated with hospitalization tracking)
├── services/
│   ├── reluctance_tracking.py (✅ NEW)
│   ├── public_metrics.py (✅ NEW)
│   └── severity_scoring.py (✅ NEW)
└── generators/
    └── system_seed_data.py (✅ NEW)
```

### Backend (To Do)
```
backend/src/datafusion/
├── services/
│   ├── event_generation.py (🚧 TODO)
│   ├── news_system.py (🚧 TODO)
│   ├── protest_system.py (🚧 TODO)
│   ├── operator_data_tracker.py (🚧 TODO)
│   └── action_execution.py (🚧 TODO)
├── schemas/
│   └── system_mode.py (🚧 TODO - add new schemas)
└── api/
    └── system.py (🚧 TODO - add new endpoints)
```

### Frontend (To Do)
```
frontend/src/
├── ui/system/
│   ├── PublicMetricsDisplay.ts (🚧 TODO)
│   ├── ReluctanceWarningPanel.ts (🚧 TODO)
│   ├── NewsFeedPanel.ts (🚧 TODO)
│   ├── ProtestAlertModal.ts (🚧 TODO)
│   ├── ActionGambleModal.ts (🚧 TODO)
│   ├── ExposureEventModal.ts (🚧 TODO)
│   └── NeighborhoodOverlay.ts (🚧 TODO)
├── scenes/
│   ├── SystemDashboardScene.ts (🚧 TODO - integrate new UI)
│   └── WorldScene.ts (🚧 TODO - add cinematics)
└── state/
    └── SystemState.ts (🚧 TODO - add new state fields)
```

## Next Steps

1. **Implement EventGenerationService** - This is the orchestrator for all triggered events
2. **Implement NewsSystemService** - Article generation and Streisand effect
3. **Implement ProtestSystemService** - Protest triggers and inciting agent gamble
4. **Implement OperatorDataTracker** - Progressive exposure mechanics
5. **Implement ActionExecutionService** - Ties everything together

Once services are complete, we can move to schemas → endpoints → frontend.

## Design Highlights

### Moral Dilemma System
- **Complicity Path**: Take actions → Low reluctance → Continue playing → Public backlash grows → Bad ending with external consequences
- **Resistance Path**: Refuse actions → High reluctance → Fired/imprisoned → Personal consequences → "Good" ending but you suffer

### Cascading Consequences
- Action → Public metrics update → Tier events → Protests/news triggered → More pressure to suppress → Higher severity actions → More backlash → Escalation spiral

### Progressive Exposure
- Stage 1 (awareness 30+): Vague hints in articles
- Stage 2 (awareness 60+): Partial leak (search queries, hesitation patterns)
- Stage 3 (awareness 80+ OR reluctance 70+): Full exposure (name, address, family) - deeply unsettling

### Gambles
- **Incite Violence**: 60% success (protest turns violent, blame protesters), 40% failure (agent discovered, massive backlash)
- **Press Suppression**: 60% success (outlet silenced), 40% failure (Streisand effect, huge awareness spike)

## Educational Goals Achieved

1. **Real-world parallels**: ICE raids (Palantir), press bans (authoritarian regimes), inciting agents (COINTELPRO)
2. **Impossible position**: No "good" outcome - complicity or resistance both have severe consequences
3. **Escalation demonstration**: Show how surveillance states spiral into increasing violence
4. **Personal stakes**: Operator exposure makes surveillance visceral ("How does it feel?")
5. **Multiple perspectives**: Player experiences being both surveiller and surveilled
