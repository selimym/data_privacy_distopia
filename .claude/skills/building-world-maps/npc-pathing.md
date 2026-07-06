# NPC Pathing & Wander Behavior

All of this lives inside `WorldMapScene` (Phaser never touches stores). Citizen identity/state arrives via `npcs-update`; the scene owns *movement*.

## Walkability Grid

Build once after map creation:

```ts
private walkable: boolean[][] = []

private buildWalkabilityGrid() {
  this.walkable = Array.from({ length: this.map.height }, (_, y) =>
    Array.from({ length: this.map.width }, (_, x) => {
      // a tile is blocked if ANY layer has a colliding tile there
      return !this.map.layers.some(l => {
        const t = this.map.getTileAt(x, y, false, l.name)
        return t?.properties?.collides === true
      })
    }),
  )
}
```

## A* (no dependency needed)

Grid A* with 4-neighborhood and Manhattan heuristic is ~50 lines; paths are short (wander radius ≤ 8 tiles) so performance is a non-issue. If you'd rather not maintain it, `easystar.js` (~9KB) is the standard drop-in — but prefer the inline version: zero deps, easier to test.

Key constraints:
- Cap search at ~400 expanded nodes; on failure the NPC just idles (never freeze or teleport).
- Return tile-coordinate waypoints; the scene tweens between tile centers.

## Wander Loop (per NPC)

State machine, driven by scene `update()` or chained tweens:

```
IDLE (2–6s random) → pick random walkable tile within R=6 of home anchor
  → A* path → WALKING (tween tile-to-tile, ~0.4s/tile, play `${key}_walk_${dir}`)
  → arrive → play `${key}_idle_${dir}` → IDLE
```

- Direction from waypoint delta: `dx>0 → right`, `dx<0 → left`, `dy>0 → down`, `dy<0 → up`. Update anim on each waypoint, not each frame.
- **Determinism doesn't matter here** (pure ambience) but stability does: seed nothing, cap concurrent walkers to ~10–12 and let the rest idle; stagger decision times so NPCs don't all move in sync.
- Home anchor = the NPC's spawn point (from the `Spawns` object layer), NOT its current position — prevents drift across the map.
- `setDepth(sprite.y)` on every position change.

## Interaction Rules (keep working)

- Selected/flagged tints (`highlight-npc`, `is_flagged`) must survive movement — re-apply tint after anim changes.
- Click hit area: sprites are 32×64 scaled ×1.5; `setInteractive` after scaling, and verify clicks land (Playwright: click NPC → citizen selected in queue).
- When a citizen is detained (removed from `npcs-update` payload), don't just `destroy()` — see the game-feel-and-transitions skill for the walk-off escort pattern; the scene may keep a short-lived local "departure" animation before removal.
- Pause wander while a cinematic pan is running (a `cinematic-start`/`cinematic-end` flag on the event bus) so the camera subject doesn't stroll away.

## Performance Notes

- 50 NPCs × tween-based movement is fine; avoid per-frame `getTileAt` (use the cached `walkable` grid).
- If frame rate drops on the dashboard-embedded canvas, halve concurrent walkers before optimizing anything else.
