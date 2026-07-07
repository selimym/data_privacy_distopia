# Alpha Roadmap

**Definition of alpha:** a stranger with no explanation can play week 1 → an ending in one sitting (~60 min), discovers the pin→connect mechanic on their own, feels the human cost of at least one flag before the ending screen, and knows where to send feedback. Not required: audio, localization, all 9 endings polished, France parity.

## Milestone 1 — Core loop is legible (highest value per hour)

These are the P0s from `UX_Critique.html` that protect the thesis; all are small-to-medium code changes with no new systems:

- [ ] **F-23/F-24 — Pin affordance + persistent pinned strip.** The game's most original mechanic is currently invisible. Always-visible pin icon at low opacity; pinned-items strip at top of center panel surviving tab switches.
- [ ] **F-17 — Flag submission beat.** 0.8s `FILE SUBMITTED` interstitial (see game-feel-and-transitions skill). Severity-graded; micro-confirm on Detention (F-15).
- [ ] **F-09 — Processed list.** Grayed "processed" section at the bottom of the citizen queue with escalating one-line statuses over subsequent weeks. This is the single biggest thesis gap (citizens currently vanish).
- [ ] **F-13 — Remove risk scores from the queue** (early weeks). Scores compute on file-open. Kills quota-gaming without reading files.
- [ ] **F-26/F-25 — Rule registration feedback + responsibility warning.** Flash the new inference row; warning text names the player's operator ID.

## Milestone 2 — The map means something

Scoped v1 — resist anything fancier (see building-world-maps skill):

- [ ] Palette curation session (~1–2h human time, one-off)
- [ ] Stamp library: house, apartment, clinic, office, store, government building
- [ ] Town generator → real `town.json` (roads, 5 districts matching sweep neighborhoods, ~30 buildings)
- [ ] Switch engine to 48px tiles + purchased character strips (probe direction order first)
- [ ] NPC homes from Spawns layer (replaces random placement)
- [ ] Wander behavior (idle → short walk → idle), ≤12 concurrent walkers
- [ ] Click NPC → select citizen (already wired — re-verify after resize/scale changes)
- [ ] Detention walk-off + absence markers — the map's payoff feature
- [ ] Playwright screenshot check added to critical path

## Milestone 3 — First/last impressions

- [ ] **F-20 — Boot sequence start screen** (terminal-style init, "DEPLOYMENT ASSIGNMENT" framing). Cheap, sets tone for every playtest.
- [ ] **F-11 — Split shift memo** into moral beat → separate directive briefing card.
- [ ] **F-21 — Tutorial ends with a consequence card**, not a mechanic card.
- [ ] Ending screens: verify the 4 most reachable endings (reluctant_operator, reluctant_survivor, compliant_operator, imprisoned_dissent) read well; the rest can be rough.
- [ ] Week 8 Jessica moment: playtest whether the queue noise dilutes it (GAME_DESIGN_REFERENCE §20 flags this).

## Milestone 4 — Ship & learn

- [ ] `make test-critical` green; full playthrough on a clean profile (fresh IndexedDB/localStorage)
- [ ] 1366×768 layout pass (laptop players)
- [ ] Deploy to GitHub Pages (already set up) + pin an itch.io page for discoverability
- [ ] In-game feedback link (ending screen + start screen): GitHub issues + a 5-question form
- [ ] Playtest protocol: watch 2 people play live without helping; note where they stall. Ask: Where were you confused? When did you first feel uncomfortable? Did you find the pin mechanic? What do you think the bot did? Would you replay?

## Explicitly cut from alpha (write it down so it stays cut)

- Audio (silence is defensible — Papers, Please ships gameplay in silence)
- FR/UK content parity, non-English locales
- News headline rewrite (F-27) beyond quick template divergence, protest narrative cascade, granular bot threshold controls
- Map interiors / entering buildings; day-night; traffic
- Endings archive polish, achievements

## Sequencing note

Milestone 1 before Milestone 2: map work is high-effort/high-variance; the loop fixes are guaranteed wins that also make every later playtest more informative. Within Milestone 2, the walk-off/absence feature is the reason the map exists — if time runs short, cut wander before cutting walk-offs.
