# Papers, Please — Dev Blog Design Insights

Raw devlog condensed for game design brainstorming.

---

## Core Loop Design

**The fundamental mechanic**: Spot discrepancies by comparing two pieces of information. Highlighting any two mismatched facts opens further options (interrogate, search, detain). This single correlation mechanic handles *every* error type uniformly — missing docs, forged seals, wrong dates, mismatched names — which gives the game its clean structure without edge-case spaghetti.

**Key insight**: "If you can just click on what you think is an error, there's nothing stopping you from just clicking each piece of info in turn and waiting for the dialog to pop up." The inspection mode requirement forces the player to *understand* the error, not just discover it by clicking everything.

**Time as the scarce resource**: Realtime clock. No artificial "this action costs 5 seconds" system. Looking up the rulebook costs time. Sending a telex costs time. The faster you process, the more you earn. This elegantly creates pressure without tutorial-able rules about action costs.

**Quota + time limit duality**: Days have both a minimum quota (scripted story must resolve) and a pay-cutoff time. You get paid per entrant processed before 6PM. This separates "story completion" from "optimization play" cleanly.

---

## Moral Weight & Emotional Design

**The core emotional goal**: "Exploit the player's morals and give them tough choices." The designer deliberately made it satisfying to deny entry ("they're trying to lie their way into MY country") — then later designed more sympathetic applicants to muddy that satisfaction.

**Consequences delayed, not immediate**: Most applicants just pass through and you never know what happened. Only some trigger immediate on-screen consequences (suicide bomber detonates right after you approve them). End-of-day "where are they now" blurbs proposed instead of stats screen — showing distant futures for applicants you processed, rewarding mercy or punishing negligence narratively.

**Letters as feedback**: Morning letters from the Ministry (performance reports) + personal letters (thank-you notes, hate mail, bribes in the mail) replace sterile stats screens. Makes the bureaucracy feel inhabited.

**Family as moral counterweight**: Nightly home screen with rent, food, heat, medicine costs. Barely surviving on inspector's salary forces the player to rationalize bribe-taking. The family's suffering is kept vague and simple on purpose — "not by defining the family more, but by providing more fine-grained influence over their wellbeing."

**Bribes**: Some applicants offer upfront cash or promise mail-in payments for approval. Gives non-altruistic incentive to let bad actors through. Player's "score" can literally be their bank account.

---

## Procedural Generation Philosophy

**Minimal specification, maximum randomness**: Story-critical entrants are scripted only for what matters (face, nationality, specific errors). Everything else fills in randomly. This gives each playthrough flavor without breaking narrative.

**Procedural faces**: Faces divided into 3 composited layers (head/shoulders, eyes, nose/mouth). Swapping parts between base drawings produces thousands of unique faces from ~32 source drawings. Metadata tags (HasGlasses, WearingHat) enable accessories. Same system produces "slightly wrong" variations for forged document photos.

**Scripted story + random texture**: ~30 story days are deterministic in structure. Immigrants within those days have mostly random properties within constraints. "Low level day-to-day stuff is random within parameters; the story is scripted."

**Multiple errors counterintuitively reduces difficulty**: The designer discovered that more errors per applicant makes them *easier* to catch. Final design: at most one error per entrant, with exceptions for revealed-later documents.

---

## Progression & Difficulty Scaling

**Front-load mechanics introduction**: Nearly a new mechanic every day in early game. Designer acknowledged this makes it feel like applicants are "cooperating with the inspector's learning process."

**Escalating penalties**: Too-lenient citation system allowed players to just approve/deny everyone randomly. Solution: ~5 citations in one day = game over that night. This forces engagement with the actual mechanic.

**Rule complexity escalation**: New document types, new required seals, new countries added day by day. Players who've memorized common doc formats stop needing to reference the rulebook — rewarding expertise.

**Seal arms race**: Forged documents have incorrect seals. Designer envisioned escalating seal complexity as criminals "catch up" — plus special IR seals requiring UV light to verify. Staying one step ahead of forgery tech is a progression mechanic.

---

## Tension & Action Beats

**Wall-scaling runners**: Desperate applicants occasionally attempt to scale the border wall. Player gets ~3 seconds to tranquilize them before guards open fire (lethal). "Should I stop this guy myself or do nothing and let the guards do it/get killed" — a snap moral decision nested inside a mechanical action.

**Getting the gun is the hard part**: Sniping is technically easy (just aim). What's hard is the gun is locked in a drawer. Key is on your desk buried under papers. Under extreme time pressure, you have to find the key, drag it to the drawer, unlock it, select the gun. Uses *the same paper-shuffling interface* — no special mode, same mechanics, different stakes.

**Suicide bombers**: Scripted story events. If you approve the wrong person, the bomb goes off immediately on screen. No reaction window. Pure consequence.

**The shutter**: Player controls the booth shutter. Can make applicants wait, cut them off mid-conversation, trap their documents inside. Guards bang on the shutter if you close it too long. Doubles as defensive tool — someone pulls a gun in the booth, close the shutter fast.

---

## Interface & UX Lessons

**Drag-and-drop over the desk**: Documents freely dragged around the workspace. Paper shuffling is intentional friction — "I want to avoid adding a right-click-drag function for this one feature." The desk chaos is the experience, not a problem to fix.

**Stamp feel matters**: Applying stamp on mouse-up feels bad. Fixed with immovable stamp bar — you arrange documents *under* the stamps, then press down. Physical THUNK on mousedown.

**Inspection mode as intent expression**: Separate mode where you can't move documents. Forces player to commit to what they're comparing. Prevents "click everything" strategy.

**Warnings must name the exact mistake**: Early alpha cited you without saying what you did wrong. Completely frustrating and required tutorial text to compensate. Explicit citation = implicit tutorial. Players learn from specific failures without front-loaded explanation.

**The day-3 no-papers problem**: A man who presents *no documents at all* broke many players because the interface paradigm shifts — instead of inspecting docs on desk, you must highlight an *empty counter* + a rulebook rule. Players expected documents to exist. This "conceptual leap" is the hardest design problem documented in the blog.

---

## Narrative Structure

**Story threads as composable pieces**: Short threads (1-3 applicants), medium threads, 2-3 long threads, 1 overall arc spanning the whole game. Each thread may have custom documents, special headlines, or unique travelers. Pieces created first, arranged in a grid second.

**Newspaper headlines**: Each day opens with a newspaper. Designer's third game using this technique for story delivery. Efficient, atmospheric, minimal reading required.

**Tokens / achievements as hidden rewards**: Mostly unexplained achievements discoverable through play. Intentionally vague — "I like that they're unmentioned and mostly hidden."

**20 endings**: 12 "early" endings (triggered before day 31 by extreme decisions), 8 "standard" endings at game completion. Branching save system lets players go back and try different paths. Designer admits 20 is "honestly way too many" — adding endings became the logical response to all the divergent player choices.

---

## Development Process Notes

**Fast-play debug mode**: Separate UI using the same logic engine, allowing rapid click-through of all encounters without playing the full UI. Critical for testing story progression and money balancing without replaying everything. Extended to "play style bots" for balance testing (one bot denies all foreigners, one makes one mistake per new rule, etc.).

**Spreadsheet as game data**: Per-day settings, traveler placement, news, rules all in a CSV from a spreadsheet. "Working in a spreadsheet makes it much easier to follow and edit progression. If this were XML I'd be constantly scrolling."

**Custom traveler scripting format**: Tab-indented format parsed into node tree. Can specify as much or as little as needed per traveler — from full scripting (face, name, dialog, nationality, errors) to just a custom rejection line.

---

## Tone & Aesthetic

**Broken English for NPCs**: "I stay three months" instead of "I'll stay for three months." Subtle, but fluent English "destroyed some of the mood." Eastern-European cadence maintained through grammar, not vocabulary.

**Stark family screen by design**: Deliberately simple and vague. "I want to add another facet to the primary gameplay without too much distraction." Humanizes the player without becoming a sub-game.

**No music during gameplay**: Music only on title, intro, night, and end screens. Silence during inspection creates focus and pressure.

**Pixel art as constraint**: Limited ~3-shade palette per object. Designer chose pixels over vectors despite believing "general population prefers smooth" — ultimately kept pixels because "the look has grown on me."
