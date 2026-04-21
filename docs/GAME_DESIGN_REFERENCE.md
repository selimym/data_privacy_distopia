# Data Privacy Dystopia — Game Design Reference

> **Purpose**: Exhaustive reference for game designers and UX/UI collaborators. Covers all existing mechanics, UI flows, state transitions, and design tensions. Use this as a baseline for critique and ideation.

---

## Table of Contents

1. [High-Level Concept](#1-high-level-concept)
2. [Core Game Loop](#2-core-game-loop)
3. [Citizen Flagging System](#3-citizen-flagging-system)
4. [AutoFlag Bot](#4-autoflag-bot)
5. [Directive System](#5-directive-system)
6. [Metrics System](#6-metrics-system)
7. [News System](#7-news-system)
8. [Protest System](#8-protest-system)
9. [Special NPC Arcs](#9-special-npc-arcs)
10. [Endings System](#10-endings-system)
11. [World Map (Phaser)](#11-world-map-phaser)
12. [UI — All Screens & Panels](#12-ui--all-screens--panels)
13. [Shift Memo System](#13-shift-memo-system)
14. [Tutorial & Onboarding](#14-tutorial--onboarding)
15. [Inference Engine](#15-inference-engine)
16. [Content & Data System](#16-content--data-system)
17. [Persistence & Save System](#17-persistence--save-system)
18. [Localization & Country Selection](#18-localization--country-selection)
19. [Educational Design](#19-educational-design)
20. [Known Design Tensions & Open Questions](#20-known-design-tensions--open-questions)

---

## 1. High-Level Concept

**Genre**: Narrative simulation / moral horror  
**Platform**: Browser (fat client, no backend)  
**Duration**: ~45–90 minutes for a full playthrough  
**Replayability**: 9 distinct endings, multiple branching paths

### Design Thesis

The game teaches through *complicity*. The player is never asked to do something overtly evil — each individual action (review a file, submit a flag, approve a bot recommendation) seems mundane and procedurally justified. The horror accumulates across 8 weeks as the player realizes they have been participating in a surveillance apparatus.

Four specific lessons are embedded in every mechanic:
- **Normalization**: Bureaucratic routine erodes moral resistance
- **Automation diffusion**: "The algorithm decided" removes accountability
- **Data fusion risk**: Innocent data + innocent data = constructed guilt
- **Scale blindness**: Metrics and quotas hide individual human harm

### Narrative Frame

The player is an operator at a fictional government surveillance platform. The time period advances across 8 weeks spanning approximately one year. The visual aesthetic is modeled after Palantir Gotham — clinical, data-dense, designed to feel professional rather than sinister.

---

## 2. Core Game Loop

### Session Flow

```
Start Screen
  → Country selection (USA / UK / France)
  → Language selection
  → First-shift memo (if first-ever run)
  → Optional tutorial (4 guided steps)
  → Dashboard — Week 1

Per-Week Loop:
  → Directive briefing displayed
  → Citizen queue populated (~30–50 cases)
  → Player reviews cases → flags or passes
  → Quota reached OR time expires
  → Shift memo overlay
  → Metrics update
  → (Optional cinematics for flagged citizens)
  → Next directive loads — Week N+1

Terminal condition triggered at any point → End Screen
```

### Weekly Time Period Labels

| Week | Narrative Time |
|------|----------------|
| 1 | Now |
| 2–4 | 1 Month Later |
| 5–6 | 6 Months Later |
| 7–8 | 1 Year Later |

### Progression Triggers

- Quota met → advance immediately
- Time limit expires (Week 8: 24-hour limit) → advance with shortfall penalty
- Terminal conditions checked after **every flag submission**:
  - Compliance score thresholds
  - Reluctance score thresholds
  - Public anger ≥ 90
  - Specific NPC interactions (hacktivist, protected citizen)

---

## 3. Citizen Flagging System

### Data Architecture

**CitizenSkeleton** (50 NPCs, always in memory):
- Identity: ID, name, date of birth, SSN, address
- Map position: grid coordinates for world map placement
- Role: `citizen` | `government_official` | `data_analyst` | `hacktivist` | `protected`
- Special flags: `scenario_key`, `appears_at_week`, `generation_seed`

**CitizenProfile** (lazily generated on first access, then cached):
- Health: conditions, medications, facility visits (specialty, date, reason)
- Finance: accounts, transactions, debts, credit score, employer, income
- Judicial: case types (criminal / civil / traffic), charge, outcome, sentence
- Location: home/work address, check-ins (location, frequency, type)
- Social: posts, connections, group memberships, political inferences
- Messages: content, contact, platform, encrypted?, concerning?, category (`organizing` / `personal_crisis` / `normal` / `coded`)
- Inferences: rule keys evaluated by inference engine
- Risk assessment: 0–100 score with contributing factors

**CaseOverview** (shown in citizen queue):
- display_name, risk_score, risk_level, available_domains
- Status flags: already_flagged, no_action_taken, scenario_key

### Flagging UI Flow

#### Step 1 — Citizen Selection
- Player clicks a name in the citizen queue
- Decision timer starts (tracks hesitation)
- Profile generates (if not cached), inference engine runs, risk score calculated
- All tabs appear; only unlocked data domains are interactive

#### Step 2 — Data Review
- Seven domain tabs: **Identity | Health | Finance | Judicial | Location | Social | Messages**
- Only domains unlocked by the current directive are accessible
- New domains (unlocked this week) show a "NEW" badge until visited
- Tabs visited are tracked and affect inference display completeness

#### Step 3 — Inference Panel
Positioned below data tabs, occupies up to 55% of the panel height.

| Column | Content |
|--------|---------|
| Category | e.g. "Mental Health Analysis" |
| Inference | Summary of the detected pattern |
| Scariness | 1 (minimal, muted badge) → 5 (critical, red badge) |
| Confidence | Percentage |
| Expand | Reveals evidence, implications, educational note, real-world example, victim statements |

- "Edit Inference Rules" button → opens rules editor modal
- Protected citizen label shown if applicable

#### Step 4 — Flag Submission
Pinned at the bottom of the panel, grows upward.

**Flag type selector** (horizontal chips, labels localized per country):

| Flag Type | Severity | Consequence |
|-----------|----------|-------------|
| Monitoring | 2 | Continuous surveillance, indefinite |
| Restriction | 4 | Travel bans, employment restrictions |
| Intervention | 6 | Forced contact, family separation |
| Detention | 8 | Arrest, indefinite hold without trial |

**Action buttons**: `SUBMIT FLAG` (red) | `NO ACTION` (gray)

#### Flag Record Written
- citizen_id, operator_id, directive_key, week_number, flag_type
- justification (auto-assembled from inference findings)
- selected_findings[], decision_time_seconds, was_hesitant (>30s)
- flagged_by_bot (boolean)

#### No-Action Record Written
- Triggers reluctance +15
- Citizen remains in queue marked `no_action_taken`
- Player can revisit and change decision

---

## 4. AutoFlag Bot

### Unlock & Availability
- Unlocked in Week 5 via "Social Media Behavioral Analytics Program" contract event
- Toggle in the dashboard header (enable / disable globally)
- Bot runs independently; player can approve or override individual decisions

### Decision Algorithm (Deterministic)

1. **Case Selection**: filters to pending cases, sorts by risk_score descending
2. **Flag Type Calculation**:
   - Adjusted score = risk_score + urgency_bonus (if quota urgency >50%) + variance (±5)
   - ≥70 → Detention | ≥50 → Intervention | ≥30 → Restriction | else → Monitoring
3. **Confidence Score**: base 0.85 + (risk_score / 100 × 0.10) ± 0.02
4. **Reasoning**: ML-speak templates, e.g. *"Multi-domain fusion score of 81.2% exceeds intervention threshold."*

### Player Interactions

| Action | Effect |
|--------|--------|
| Approve | Logs flag under operator's ID with `flagged_by_bot = true` |
| Override | Clears decision without flagging; counts as override in bot accuracy tracking |

**Bot Tracking Metrics**: flags_processed_by_bot, flags_overridden_by_player, accuracy (0–1)

### Design Intent
The bot demonstrates *automation as moral diffusion*. Approving a bot recommendation feels lower-stakes than manual flagging, even though the outcome is identical. Bot usage feeds into ending calculations.

---

## 5. Directive System

### Directive Structure
Each directive defines the week's mission:
- title, description, internal_memo
- required_domains (minimum unlocked data)
- target_criteria (pattern, locations, factors, specific NPC keys)
- flag_quota or arrest_quota
- time_limit_hours (null = unlimited; Week 8 = 24 hours)
- moral_weight (1–10), content_rating (moderate | dark | severe)

### Weekly Progression

| Week | Type | Quota | Title | Moral Weight | Domain Unlocks |
|------|------|-------|-------|-------------|----------------|
| 1 | review | 2 | Operation Clean Streets | 2 | — |
| 2 | review | 2 | Domestic Harmony Initiative | 3 | Health |
| 3 | review | 3 | Economic Security Protocol | 5 | Finance |
| 4 | **sweep** | **20 arrests** | Neighborhood Stabilization | 7 | — |
| 5 | review | 4 | Social Cohesion Monitoring | 8 | Social + **AutoFlag unlocked** |
| 6 | review | 2 | Full Spectrum Intelligence | 9 | Messages |
| 7 | review | 3 | Loyalty Assessment Protocol | 10 | — |
| 8 | review | 1 | Priority Target Directive | 10 | Jessica Martinez only |

### Week 4: Neighborhood Sweep (unique mechanic)

Instead of reviewing individual citizens, the player selects entire neighborhoods to raid.

- Each neighborhood shows: estimated arrests (min/max), consequence_risk (low/medium/high)
- Player selects neighborhoods until the 20-arrest quota is met
- Selecting a neighborhood executes immediately (generates `NeighborhoodRaidRecord`)
- Actual arrests = random(est_min, est_max)
- Raids generate news, boost public anger (+5–10 per raid), and can trigger protests immediately

**UI**: SweepStatusPanel replaces the citizen queue; NeighborhoodSweepPanel replaces the citizen detail panel.

### Contract Events (Domain Unlocks)

Contract events appear as modal overlays at the start of specific weeks:
- Show a press-release version (public framing) and an internal memo (real rationale)
- Include a real-world reference (e.g., Palantir NHS contract)
- Player must acknowledge before proceeding

---

## 6. Metrics System

### Compliance Score (0–100, starts at 50)

**Increases**: flags submitted (weighted by flag type severity), quotas completed  
**Decreases**: hesitation (>30s per decision), no-action choices, quota shortfalls

**Thresholds**:
- <40 → **FIRED_EARLY** ending
- <50 → **SUSPENDED_OPERATOR** ending
- Warning at <45%

### Reluctance Score (0–100, starts at 0)

**Increases**:
- No-action decision: +15
- Hesitation incident: +5
- Quota shortfall at end of week: +20
- Decision time >45s: logged

**Escalation**:
- 70+ → Formal warning issued (visible in metrics panel)
- 80+ → Final notice issued
- ≥80 + week ≤3 → **FIRED_EARLY** ending
- ≥80 + week >3 → **IMPRISONED_DISSENT** ending

### Public Metrics

Two independent axes, each 0–100:

**International Awareness** (escalates coverage scale):
- Tier 0: Local reports
- Tier 1: National coverage
- Tier 2: International coverage
- Tier 3: UN investigation
- Tier 4: Global sanctions

**Public Anger** (escalates resistance scale):
- Tier 0: Murmurs
- Tier 1: Organized opposition
- Tier 2: Mass protests
- Tier 3: Violent resistance
- Tier 4: Revolution

Tier crossings trigger news articles and alert notifications.

### Metrics Update Formula (after each flag)

```
awareness_delta = flag_severity + boost(if awareness > 60) × 2(if backfire)
anger_delta = flag_severity + 5(if detention/sweep) + 10(if protest backfire)
```

Severities: Monitoring=2, Restriction=4, Intervention=6, Detention=8, Sweep=9

### Display (MetricsPanel, right sidebar)

- ComplianceGauge: 0–100 color gradient bar
- ReluctanceGauge: 0–100 bar + warning/final-notice indicators
- PublicMetricsDisplay: Awareness and Anger bars + tier labels
- OperatorProfilePanel: operator details, clearance level, current risk assessment

All sections are collapsible and state persists in localStorage.

---

## 7. News System

### Channel Structure

Five pre-defined news channels with distinct political stances:

| Channel | Stance | Credibility |
|---------|--------|-------------|
| The Tribune | Critical | High |
| The Courier | Independent | Medium |
| State Bulletin | State-friendly | High |
| Civil Watch | Critical | Medium |
| Morning Chronicle | Independent | High |

### Article Types

**Triggered** (after specific flag actions):
- Headline + body generated from stance-specific templates
- Same flag, different framing: Detention + critical → "Citizen Detained Without Trial" vs. state-friendly → "Threat Neutralized"

**Background** (periodic, world-building):
- Generic surveillance concern articles
- No direct metrics impact

**Exposure** (when reluctance ≥ 80):
- Three stages: operator file leaked → investigation launched → public interview
- Reveals player's own hesitation patterns and flag history
- Triggers awareness surge (+25)
- Generated once, does not repeat

### Player Interactions
- News ticker (bottom of all dashboard views): scrolling headlines
- Click ticker or open NewsPanel (full screen): article list filtered by stance, mark read/unread
- **Ban a channel**: stops it from publishing. Banning critical outlets gives compliance +10 but triggers public anger

---

## 8. Protest System

### Protest Formation

Calculated after each flag:
- Probability = (severity/10) × (1 + anger/50), threshold varies by current anger level
- 30% chance of an inciting agent (undercover operative) being embedded

**ProtestEvent fields**: id, size (50–5000), neighborhood, status, has_inciting_agent, triggered_by, awareness_impact, anger_impact

### Status Lifecycle

`forming` → `active` → `dispersed` | `violent` | `suppressed`

### Player Response (Protest Modal)

Two suppression methods, each with different risk/reward profiles:

**DECLARE_ILLEGAL**
- Always succeeds
- 5–15 arrests
- awareness +8, anger +6
- Narrative: emergency provision enforcement

**INCITE_VIOLENCE** (via embedded agent)
- 60% success: 3–10 casualties, 20–50 arrests, frames protesters as aggressors
- 40% backfire: agent identity exposed, 5–15 casualties, awareness +25, anger +30
- Triggers news coverage of state overreach regardless of outcome

Player can also *ignore* a protest — it may self-disperse or escalate over time.

### Protest → Ending Pipeline

Accumulated anger from protests can trigger:
- Tier crossing notifications → news articles
- public_anger ≥ 90 → **REVOLUTIONARY_CATALYST** ending

---

## 9. Special NPC Arcs

### Jessica Martinez — Week 8 Focal Point

- Role: Community organizer, high school teacher
- Only citizen in the Week 8 queue
- Risk score is technically high (system manipulation) but morally she's innocent
- AutoFlag bot will pre-recommend flagging her
- **The final moral test**: the system has been guiding the player toward this moment for 7 weeks

Player choice:
- Flag → contributes to **COMPLIANT_OPERATOR** ending (if compliance ≥80 + flags ≥10)
- Don't flag → outcome determined by other metrics

### Hamza Bendelladj — The Hacktivist Arc (Week 5+)

Hamza appears in the Week 5 queue with high risk scores. His messages are addressed directly to the operator.

**Path A — Don't Flag Hamza**:
- End-of-week-5 memo: contact from Hamza + list of corrupt government official IDs to flag
- Week 6: flag listed officials → triggers raids at their locations
- Outcome: **RESISTANCE_PATH** ending (highest-priority ending, overrides all others)

**Path B — Flag Hamza**:
- Routine Week 5 memo (no contact)
- Week 6: **player's own file** appears in the queue, marked HIGH RISK
- Hidden in the player's file: the same offer from Hamza (a second chance)
- If player ignores: data leak → protests → anger ≥ 90 → **REVOLUTIONARY_CATALYST**
- If player acts: resistance path still reachable via late-game action

### The Protected Citizen — Epstein Analog (Week 5–6)

A citizen with extreme risk flags in every domain — but the beginning-of-shift memo warns:
> *"Do NOT flag citizen [ID]. Authorization: Central Command."*

Player choice:
- **Comply** (don't flag): game continues normally
- **Defy** (flag): **MYSTERIOUS_DEATH** ending triggers immediately — "Your workstation was reassigned. Natural causes reported."

**Design intent**: The system protects the powerful while targeting the vulnerable. Any attempt at principled resistance through official channels fails absolutely.

---

## 10. Endings System

### All 9 Endings (Priority Order)

The ending calculator evaluates conditions in this order — first match wins:

| Priority | Ending | Trigger Condition | Tone |
|----------|--------|-------------------|------|
| 1 | **resistance_path** | Hacktivist arc + passphrase confirmed | Hopeful (pyrrhic) |
| 2 | **mysterious_death** | Protected citizen flagged | Horror |
| 3 | **revolutionary_catalyst** | public_anger ≥ 90 | Chaotic |
| 4 | **international_pariah** | awareness ≥ 80 | Condemned |
| 5 | **imprisoned_dissent** | reluctance ≥ 80 + week > 3 | Tragic |
| 6 | **fired_early** | reluctance ≥ 80 + week ≤ 3 OR compliance < 40 | Dismissal |
| 7 | **suspended_operator** | compliance < 50 | Bureaucratic limbo |
| 8 | **compliant_operator** | compliance ≥80 + flags ≥10 + Jessica flagged | Complicit |
| 9 | **reluctant_survivor** | compliance 40–60 | Moral compromise |
| 10 | **reluctant_operator** | Fallback — no threshold met | Uncertain |

### Ending Screen Structure

- Header: "OPERATOR ASSESSMENT COMPLETE" + color-coded ending title
- Two-column layout:
  - **Left**: Narrative text (2000+ chars, markdown), Real-World Parallels section
  - **Right**: Statistics panel (total flagged, flagged by bot, families separated, detentions, compliance score, hesitation count), Educational Links (clickable external resources)
- Citizen outcomes: fate summaries for up to 20 flagged citizens
- Operator final status line (e.g., "Disappeared. No official record.")
- Back button → new game

### Endings Archive

- All endings seen across sessions are stored in localStorage
- Start screen shows "ENDINGS ARCHIVE" button if at least one ending has been reached
- Archive screen lists ending cards with timestamp and allows narrative replay

---

## 11. World Map (Phaser)

### Scene Details
- Tilemap: 50×50 grid, 32px tiles
- Layers: Floor, Walls_Base, Furniture_Low/Mid/High, Objects
- All 50 NPC sprites are placed at their grid coordinates

### Interactivity
- **Drag to pan**: hold and drag to scroll the map
- **Click NPC**: selects that citizen in the citizen queue (if they're active this week)
- **NPC tint states**:
  - Default: normal
  - Blue: currently selected in the queue
  - Red: pending flag

### Cinematic Sequences
Triggered after week completion to show citizen outcomes:
- Camera pans to the citizen's map position
- Zooms to 2.0×
- Overlay displays outcome text + time period label (e.g., "6 MONTHS LATER")
- Auto-plays or player can skip

### React → Phaser Bridge
One-way `EventTarget` (`window.__worldEvents`). React dispatches events; Phaser listens.

| Event | Effect |
|-------|--------|
| `npcs-update` | Sync all NPC positions and tint states |
| `pan-to` | Animate camera to coordinates |
| `highlight-npc` | Change sprite tint |

Phaser **never reads from Zustand stores directly**.

---

## 12. UI — All Screens & Panels

### Screens

| Screen | Description |
|--------|-------------|
| `start` | Country selection, language, begin shift |
| `dashboard` | Main game, three sub-views (see below) |
| `ending` | End-game result |
| `endings_archive` | Browse past endings |

### Dashboard Sub-Views

**Case-Review** (default view):

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: TopBar | ContractBanner | AutoFlagBanner                │
├──────────────┬──────────────────────────────┬───────────────────┤
│ LEFT SIDEBAR │ CENTER PANEL                 │ RIGHT SIDEBAR     │
│              │                              │                   │
│ CitizenQueue │ If citizen selected:         │ DirectivePanel    │
│ (or Sweep-   │   CitizenPanel               │ MetricsPanel      │
│  StatusPanel │     IdentitySection          │ AlertsPanel       │
│  in Week 4)  │     DataDomainTabs           │                   │
│              │     InferencePanel           │                   │
│  Resizable   │     FlagSubmission           │ Resizable         │
│  (drag edge) │ If no citizen selected:      │ (drag edge)       │
│              │   DirectivePanel             │                   │
│              │   MetricsPanel               │                   │
│              │   NewsImagePanel             │                   │
├──────────────┴──────────────────────────────┴───────────────────┤
│ BOTTOM: NewsTicker (scrolling headlines)                        │
└─────────────────────────────────────────────────────────────────┘
```

**News-Feed** (full-screen):
- Full article list, sorted newest first
- Filter by channel stance (critical / independent / state-friendly)
- Click → full article + channel info + engagement metrics
- Mark read/unread

**World-Map** (full-screen):
- Phaser game canvas fills the view
- Click NPC → selects in main view
- Pan/zoom controls
- Cinematic overlays appear on top

### CitizenQueue (left sidebar)

| Element | Detail |
|---------|--------|
| CaseRow | name, risk_score badge, risk_level label, domain count, flags/no-action indicator |
| Behavior | Click → setSelectedCitizen(); scroll for long lists |
| Week 4 | Replaced by SweepStatusPanel (raid records list) |

### CitizenPanel (center)

- IdentitySection: name, ID, role, location
- DataDomainTabs: only unlocked domains are clickable; all others are grayed
- InferencePanel: collapsible table of triggered rules (see §15)
- FlagSubmission (pinned bottom): flag type chips + Submit/No-Action buttons

### DirectivePanel (right sidebar)

- Directive title, description
- Expandable: internal_memo (management framing vs. operational reality)
- QuotaBar: visual progress (N of M flags/arrests submitted)

### MetricsPanel (right sidebar)

All sections individually collapsible:
- ComplianceGauge (0–100, color gradient)
- ReluctanceGauge (0–100 + warning/final-notice indicators)
- PublicMetricsDisplay (Awareness + Anger with tier labels)
- OperatorProfilePanel (operator details, risk assessment, clearance level)

### AlertsPanel (right sidebar)

- Active protests → ProtestBanner ("ACKNOWLEDGE" button)
- Pending contract event → ContractBanner
- Bot available → AutoFlagBanner

### NeighborhoodSweepPanel (center, Week 4 only)

- List of all available neighborhoods with: est. arrests (min/max), consequence_risk badge
- Player selects; running total tracks toward 20-arrest quota
- Submit executes all selected raids simultaneously
- Confirmation shows actual arrests + metrics impact

### Modals

| Modal | Purpose |
|-------|---------|
| `contract_event` | Press release + internal memo + real-world parallel |
| `protest` | Suppression method selector |
| `inference_rules_editor` | Edit/toggle rule conditions and templates |
| `operator_profile` | Operator performance details and risk assessment |
| `save_load` | Manual save slots (named, with metadata) |
| `ice_raid` | Approve or decline a raid order |
| `autoflag_confirm` | Review pending bot decisions before bulk approval |
| `memo_archive` | Browse all shift memos from the playthrough |

### Overlays (non-blocking)

| Overlay | Trigger |
|---------|---------|
| ShiftMemoOverlay | End of each week |
| CinematicOverlay | After week outcomes generate |
| TutorialOverlay | New player or manual replay |
| MemoArchiveModal | Player opens memo history |

---

## 13. Shift Memo System

At the end of each week, a memo from a fictional colleague overlays the screen. The memo system is the game's primary tool for normalizing player behavior through social pressure.

### Senders and Voices

| Sender | Role | Tone |
|--------|------|------|
| Sarah K. | Senior Analyst | Data-driven, denial |
| Marcus D. | Field Coordinator | Pragmatic, normalizing |
| Director Chen | Chief | Performance pressure, authority |
| Alex R. | Compliance Officer | Warnings, morale management |

### Memo Content Logic

| Condition | Sender (probability) |
|-----------|----------------------|
| Wrong flags (low-risk citizens flagged) | Any sender: moral feedback — empathetic if low compliance, perverse if high |
| Week 5 (full data access) | Reflection on "ordinary lives" being visible |
| Active protests | Marcus (70%) or Sarah in denial (30%) |
| Compliance <45 or reluctance >60 | Director (60%) or Alex (40%) |
| Moderate reluctance (30–60) | Alex (70%) or Director (30%) |
| All other weeks | Random by sender |

### Special Memos

**Hacktivist Contact Memo** (Week 5, Path A):
- Contains contact from Hamza + list of government official IDs
- Instruction: flag these individuals next week

**Epstein Order Memo** (Week 5 or 6):
- "Do NOT flag citizen [ID]. Authorization: Central Command."
- Displayed before all data tabs when the protected citizen is selected

**Wrong-Flag Feedback**:
- Shows a `WrongFlagRecord[]` with per-citizen moral feedback
- Tone shifts based on the player's overall compliance level

### Memo Fields
- weekNumber, memoText, tone (positive | warning | briefing)
- sender: {name, title}
- nextDirectiveBriefing (inline briefing, no separate modal)
- recruitmentLink: Palantir job posting easter egg
- wrongFlags: WrongFlagRecord[]
- isHacktivistContact, isEpsteinOrder, protectedCitizenName

---

## 14. Tutorial & Onboarding

### First-Run Flow

1. Start Screen appears (always)
2. User selects country, language
3. First-shift memo acknowledgment (first run only)
4. Tutorial (optional, 4 guided steps):
   - Step 0: Dashboard layout explanation
   - Step 1: Select a citizen from the queue (queue panel highlighted)
   - Step 2: Review a data domain (domain tabs highlighted)
   - Step 3: Submit a flag or take no action (buttons highlighted)
5. Play begins

### Tutorial Blocking Behavior
- Pointer events disabled outside the currently-highlighted tutorial panel
- Decision timer paused during tutorial steps
- Prevents accidental metric changes before the player understands the interface

### Post-Tutorial
- localStorage: `tutorial_complete = true`
- Start screen shows "REPLAY ONBOARDING" button
- Cannot auto-trigger again; explicit button only

---

## 15. Inference Engine

### Architecture
Pure TypeScript service (no store imports). Takes CitizenProfile + InferenceRule[] + unlocked_domains → returns InferenceResult[].

### InferenceRule Structure

| Field | Description |
|-------|-------------|
| rule_key | Unique identifier |
| name, category | Display name (e.g., "Mental Health Analysis") |
| required_domains | Domains that must be unlocked |
| scariness_level | 1 (minimal) → 5 (critical) |
| condition_function | JS code evaluated against profile |
| inference_template | Text with {var} placeholders |
| evidence_templates[] | Supporting evidence templates |
| implications_templates[] | What this inference "means" |
| educational_note | Plain-language context |
| real_world_example | Named real-world precedent |
| victim_statements[] | {text, context, severity} from affected people |

### Sample Rules (from content/inference_rules.json)

- `check_financial_desperation`: medical debt + delinquent + chronic condition
- `check_pregnancy_tracking`: OB visits + prenatal meds + out-of-state location
- `check_depression_suicide_risk`: antidepressants + therapy visits + financial stress
- `check_affair_detection`: hotel transactions + restaurant + weekly location patterns
- `check_domestic_violence`: injury visits + social isolation
- `check_job_loss_prediction`: no workplace check-ins + career service transactions
- `check_gambling_addiction`: gambling transactions + casino visits + debt sources
- 12+ additional rules across health, financial, social, behavioral domains

### InferenceResult Fields
- rule_key, rule_name, category, confidence (0–1 auto-calculated)
- inference_text (interpolated), supporting_evidence[], implications[]
- domains_used, scariness_level, educational_note, real_world_example
- victim_statements: [{text, context, severity}]

### Player Editing
InferenceRulesEditor modal (accessible from citizen panel):
- Toggle rules on/off
- Edit condition functions
- Edit output templates
- Test rule against current citizen in real time
- Changes persist within session (not saved to file)

---

## 16. Content & Data System

### Content Files (`frontend/public/content/`)

| File/Directory | Contents |
|----------------|----------|
| `scenarios/default.json` | 8 directives, 4 contract events, special NPC definitions |
| `countries/usa.json` etc. | Country profiles, legal frameworks, UI flavor text, neighborhoods |
| `inference_rules.json` | All inference rule definitions |
| `outcomes.json` | Outcome templates per flag_type × time_period |
| `data_banks/health.json` | Conditions, medications, visit types, hospitals |
| `data_banks/finance.json` | Employers, banks, merchants, debt types |
| `data_banks/judicial.json` | Charges, case types, outcomes, sentences |
| `data_banks/social.json` | Post templates, platforms, groups, relationships |
| `data_banks/messages.json` | Message templates, contacts, encryption patterns |

### CountryProfile Fields
- country_key, display_name, flag_emoji
- surveillance_depth (1–3)
- available_domains: DomainKey[]
- legal_framework: {surveillance_law, data_retention, oversight_body}
- ui_flavor: {agency_name, operator_title, platform_version, flag_labels}
- real_world_references: string[]
- neighborhoods: [] (for Week 4 sweep)

### Citizen Generation
All citizen data generated deterministically via Faker.js with per-citizen seeds. The same citizen always generates the same profile across runs. Risk scores cached after first calculation.

### Outcome Templates
Per flag_type × time_period combinations:
- status: short label (e.g., "Detained indefinitely")
- narrative: paragraph-length story of the citizen's fate
- statistics: family events, detention conditions, impact summary

---

## 17. Persistence & Save System

### Storage Backends
- **localStorage**: persistent across sessions (game state, endings archive, tutorial flag)
- **sessionStorage**: current-session volatile state

### What Is Saved
- gameStore: operator, flags, directives, metrics, news, protests, bot state
- citizenStore: skeleton cache, profile cache, risk scores
- contentStore: loaded scenario, country, inference rules
- metricsStore: compliance, reluctance, public metrics
- uiStore: current screen, selected citizen, notifications, cinematic queue

### Save Keys
All prefixed `civic-harmony-*`

### When Save Occurs
- After every flag submission (rolling)
- End of each week (checkpoint)

### Manual Save/Load
Via SaveLoadPanel modal:
- Create named save slots
- Each slot displays: slot name, date/time, current week, key metrics
- Load previous save → full state restoration

---

## 18. Localization & Country Selection

### Countries Available at Session Start

| Country | Surveillance Depth | Notes |
|---------|-------------------|-------|
| USA | 3 (max) | ICE raids, PRISM references |
| UK | 3 (max) | Investigatory Powers Act framing |
| France | 2 | DGSI operations, GDPR tension |

Country selection affects:
- Agency name, operator title, flag type labels (via ui_flavor)
- Available surveillance domains
- Legal framework flavor text
- Week 4 neighborhood names
- Real-world references in ending screens

### i18n System
- react-i18next with English (en) locale
- All UI strings through `useTranslation()` — no hardcoded display strings in components
- Key namespaces: citizen, flag, metrics, directives, modals, shared

---

## 19. Educational Design

### Real-World Parallels (shown in ending screens)

| Reference | Context |
|-----------|---------|
| NSA PRISM (2013) | Bulk collection from tech companies |
| Palantir NHS contract (2020) | Patient data access |
| FinCEN Files (2020) | Financial intelligence sharing |
| ICE data sharing | Immigrant detention |
| Investigatory Powers Act (UK 2016) | Mass surveillance law |
| DGSI operations (France) | Political surveillance |

### Educational Links (per ending)
- ACLU surveillance resources
- Amnesty International documentation
- MIT Media Lab papers on algorithmic bias
- Mozilla privacy primers
- EPIC reports
- UN statements on surveillance

### In-Inference Educational Content
Every inference rule contains:
- `educational_note`: plain-language explanation of the data fusion risk
- `real_world_example`: named precedent
- `victim_statements[]`: first-person accounts with context and severity

The inference panel is the primary moment of *data literacy education* — it shows players not just "the algorithm flagged this" but why specific innocent data combinations produce surveillance profiles.

---

## 20. Known Design Tensions & Open Questions

This section lists areas where the current design has acknowledged gaps, rough edges, or unexplored potential. These are starting points for your collaboration:

### Game Flow & Pacing
- **Week 4 sweep vs. individual weeks**: The neighborhood sweep mechanic is mechanically distinct but has limited player agency. How do you design a mechanic that feels as personal as individual flagging but operates at mass scale?
- **Week 8 single target**: Having exactly one citizen in the queue removes the choice paralysis that made earlier weeks effective. Is this the right final chapter design?
- **Time between weeks**: Currently just a memo overlay. Could there be more between-week rituals — decompression, world-state reflection, implied passage of time?

### AutoFlag Bot UX
- The bot currently runs in a single bulk sweep. What does *granular* bot oversight look like? Should the player be able to set thresholds, review one by one, or watch the bot in real time?
- Bot confidence percentages are theater (ML-speak templates). Could the UI make this theater more legible — or more seductive?
- There's no UI cost to overriding the bot. Should there be (e.g., compliance penalty, colleague pressure)?

### Moral Feedback Legibility
- Metrics are abstract numbers. Players may not feel the human cost of their compliance score.
- Citizens disappear after flagging — you only see their fate in the ending. Could there be mid-game consequences that surface earlier?
- The "wrong flag" memo feedback is the only in-game moral mirror. Is it doing enough work?

### Inference Panel
- Currently a table below the data. It reads like a spreadsheet, which may be *intentionally* clinical — but does it land as designed?
- The educational notes are in expand rows most players may never open. What's the right friction level for accessing this content?
- The rules editor is powerful but exposed — does giving players the ability to edit rules undermine or strengthen the game's argument?

### World Map Integration
- The map is mostly decorative outside of cinematics. What would tighter map-gameplay integration look like (e.g., citizens' risk shown spatially, protests visible as map events)?
- Cinematics pan to the citizen's location. Do players understand they're seeing the consequences play out in physical space?

### Protest System
- The INCITE_VIOLENCE option exists but has limited narrative follow-through. The backfire doesn't cascade into a full alternative path.
- Players can ignore protests indefinitely. Should protests have escalating time pressure?

### Endings Reachability
- With 9 endings and 10 priority levels, some endings are nearly unreachable without intentional play (e.g., resistance_path requires specific non-obvious actions). Is this a feature (rewards exploration) or a flaw (players miss key content)?
- The endings archive and replay system exists but the Start screen placement may mean players don't discover it.

### Accessibility & Cognitive Load
- The dashboard is information-dense by design (Palantir aesthetic). Where is the line between intentional overwhelm and actual inaccessibility?
- Keyboard navigation exists but hasn't been fully playtested. What's the full keyboard path through a game session?

### Localization Depth
- Three countries are available but France has reduced mechanics (surveillance_depth 2 vs. 3). Is this intentional depth differentiation or incomplete content?
- All narrative text is English-only. What's the strategy for non-English players?

---

*Document generated from full codebase analysis. Accurate as of the `Clear_dev_artifacts` branch.*
