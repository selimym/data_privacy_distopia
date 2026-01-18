# System Mode Expansion - Implementation Progress

**Status**: Phase 2 Complete - Core Services Implemented
**Date**: 2026-01-18

## ✅ Completed (Phases 1-2)

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

## 🚧 In Progress / To Do (Phases 3-8)

### Phase 3: Event and Action Services
**Next step: Implement these services**

- [ ] **EventGenerationService** - Unified event generation
  - Roll for triggered events after actions
  - Generate random events (news, book publications)
  - Check detention injuries (30% chance)

- [ ] **NewsSystemService** - News article generation and suppression
  - Generate triggered articles (probability-based by channel stance)
  - Generate background articles (15% per directive advance)
  - Handle suppression (PRESS_BAN, PRESSURE_FIRING)
  - Calculate Streisand effect (failed suppression = huge backlash)

- [ ] **ProtestSystemService** - Protest triggers and suppression
  - Trigger protests based on anger + severity
  - Handle suppression (DECLARE_ILLEGAL, INCITE_VIOLENCE)
  - Inciting agent gamble (60% success, 40% discovered = catastrophe)

- [ ] **OperatorDataTracker** - Progressive exposure system
  - Generate fake operator profile at session start
  - Track behavioral patterns (searches, hesitations, decisions)
  - Trigger 3-stage exposure events (hints → partial → full)

### Phase 4: Unified Action Execution
- [ ] **ActionExecutionService** - Replace flag submission
  - Validate action availability (check prerequisites)
  - Execute all 12 action types
  - Calculate outcomes
  - Trigger cascading events
  - Update all metrics (public, reluctance)
  - Return comprehensive result

### Phase 5: Pydantic Schemas
- [ ] Create schemas for all new models:
  - SystemActionRead, SystemActionCreate
  - PublicMetricsRead
  - ReluctanceMetricsRead
  - NewsChannelRead, NewsArticleRead
  - ProtestRead
  - OperatorDataRead
  - NeighborhoodRead
  - BookPublicationEventRead

### Phase 6: API Endpoints
- [ ] Update `backend/src/datafusion/api/system.py`:
  - POST `/actions/execute` - Execute any action type
  - POST `/actions/no-action` - Submit no-action decision
  - GET `/actions/available` - Get currently available actions
  - GET `/metrics/public` - Get public metrics
  - GET `/metrics/reluctance` - Get reluctance metrics
  - GET `/news/recent` - Get recent articles
  - GET `/protests/active` - Get active protests
  - GET `/neighborhoods` - Get all neighborhoods
  - GET `/operator/exposure-risk` - Get exposure stage

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
