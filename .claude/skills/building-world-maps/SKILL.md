---
name: building-world-maps
description: Use when working on the Phaser world map — tilemaps, town layout, NPC sprites, walk animations, pathfinding, collision, map cinematics, or anything under frontend/src/phaser/ or frontend/public/assets/. Also use when town.json looks empty/placeholder or NPCs float on random tiles.
---

# Building World Maps

## Overview

The map's job is emotional: the dashboard says "cases," the map says "people." Every map feature must strengthen the feeling that flags land on inhabitants of a real town.

**Core principle: never hand-author tile data. Author a generator.** A 50×50 map is 2,500 tiles × 6 layers — hand-placing them (in code, JSON, or chat) always produces garbage. Instead, write and iterate on a **map generator** that composes the town from small hand-verified **stamps** (building prefabs), and verify results with screenshots.

## Current State (verified 2026-07)

- `frontend/public/assets/maps/town.json` is a **placeholder**: 1 layer ("Ground"), 1 unnamed tileset. `WorldMapScene.createMap()` expects 6 layers (`1_Floor` … `6_Objects`) — all `createLayer` calls return null. The map renders nothing real.
- The 8 tileset PNGs loaded by `PreloadScene` (`outdoor_ground.png` etc.) are **32×32 single-tile stubs**. Replace, don't extend.
- Real purchased assets (LimeZu Modern Interiors/Exteriors, MV format) sit unused — see [asset-inventory.md](asset-inventory.md) for verified dimensions, counts, and scaling math.
- `CitizenGenerator` assigns `map_x/map_y` as `randomInt(2,47)` — NPCs float on random tiles with no homes.

## Target Pipeline

1. **Palette curation (the one manual step, do it once).** Pick ~10 exterior sheets + ~8 interior themes from the asset packs. Generate a contact-sheet HTML (each sheet rendered with a 48px grid + tile indices overlaid), Read the sheet images, propose semantic tile constants (`ROAD_H`, `SIDEWALK`, `GRASS_1`, `WALL_FACE`, `ROOF_A`…) in `frontend/tools/mapgen/palette.ts`, and have the user visually confirm on the contact sheet. All downstream code uses only these names.
2. **Stamps.** Each building type (house, clinic, office, store, apartment block) is a prefab: per-layer 2D arrays of palette constants + door tile + collision mask + `building_kind`. Verify each stamp in isolation before composing the town.
3. **Town generator.** `frontend/tools/mapgen/generate.ts` (run via `npx tsx`, outputs Tiled-format JSON to `frontend/public/assets/maps/town.json`). Deterministic seed. Layout: road grid first → districts (residential / commercial / civic / hospital / government) → place stamps along roads → fill grass/props. Emit the 6 tile layers the scene expects **plus** two object layers: `Spawns` (door points with `building_id`, `district`, `capacity`) and nothing else the scene doesn't read.
4. **Collision + walkability.** Set a boolean `collides` property on wall/furniture tiles in the generated tileset defs. The scene builds a walkability grid from it (see [npc-pathing.md](npc-pathing.md)).
5. **NPC homes.** Replace random `map_x/map_y`: assign each citizen a spawn point from the `Spawns` layer, deterministically by seed. Keep `CitizenGenerator` pure — load the spawn list through `ContentLoader` and pass it in.
6. **Visual verification loop (mandatory).** `make dev` → Playwright MCP → navigate to World Map view → screenshot → Read the screenshot → fix generator → repeat. A generated map is not done until you have *looked at it*. Check: roads connect, buildings don't overlap, doors reachable, no missing-tile checkerboards, depth sorting correct when an NPC walks behind furniture.

## Engine Contract (must stay in sync)

| Thing | Value | Where |
|---|---|---|
| Tile size | 48px (change `TILE_SIZE` from 32 in BOTH `PreloadScene.ts` and `WorldMapScene.ts`) | both scenes |
| Layers | `1_Floor, 2_Walls_Base, 3_Furniture_Low, 4_Furniture_Mid, 5_Furniture_High, 6_Objects` at depths `0,10,50,150,200,250` | `WorldMapScene.createMap` |
| Tileset names | Tiled JSON `tilesets[].name` must equal first arg of `addTilesetImage(name, key)` and the loader key | PreloadScene + generator |
| NPC depth | dynamic: `sprite.setDepth(sprite.y)` so NPCs occlude correctly between furniture layers (adjust layer depths to y-space if needed) | WorldMapScene |
| Pixel art | `pixelArt: true` (or `roundPixels` + NEAREST) in the Phaser game config — without it 48px tiles blur | WorldMapGame.ts |
| React bridge | one-way `window.__worldEvents`; tile coords converted to world coords via `TILE_SIZE` — a 32/48 mismatch between React senders and the scene silently breaks `pan-to` | both sides |

## Rules

- Phaser never touches stores. Pathing, wander AI, and the walkability grid live entirely in the scene; citizen state arrives only via `npcs-update` events.
- Regenerating the map re-rolls `firstgid`s — never cache raw GIDs outside the generator.
- Keep the generator deterministic (seeded) so the town is stable across runs and tests.
- Each generator change: run generator → screenshot-verify → then commit map JSON + generator together.

## Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Hand-editing town.json | Corrupt/unmaintainable map | Only the generator writes it |
| Tileset name mismatch | Layer renders empty, no error | Log `addTilesetImage` nulls; assert names in generator |
| Layer name mismatch | `createLayer` returns null silently | Assert all 6 layers exist after load |
| Assuming walk-strip direction order | NPCs moonwalk | Run the probe scene in [asset-inventory.md](asset-inventory.md) once, record the real order there |
| Static NPC depth 100 | NPCs draw over roofs/under tables | `setDepth(y)` each move |
| Antialiased scaling | Blurry pixels | `pixelArt: true`; scale chars ×1.5 exactly (16px-base art → 3× total, stays crisp) |
