# Asset Inventory (verified by inspection, 2026-07)

All under `frontend/public/assets/`. Art style: LimeZu "Modern Interiors / Modern Exteriors" pixel packs, RPG Maker MV export (`_MV` suffix = 48px tile grid, 3× upscale of the 16px originals).

## Tilesets

| Location | Count | Format | Grid |
|---|---|---|---|
| `tilesets/exteriors/Tileset_N_MV.png` | 186 sheets | 768×768 PNG | 16×16 tiles of 48px |
| `tilesets/interiors/<Theme>_NN.png` | 65 themed sheets (Hospital_01–06, Grocery_Store, Classroom, Bedroom, Bathroom, Generic, Gym, Clothing_Store, Condominium, Conference_Hall, …) | 768×768 PNG | 16×16 tiles of 48px |
| `tilesets/*.png` (root: `outdoor_ground`, `walls_doors`, etc.) | 8 files | **32×32 single-tile placeholders** | replace |

Sheets are plain object/terrain sheets (Tiled-ready) — not RPG Maker A-format autotiles, so no autotile expansion needed. Tile index = `row * 16 + col` (0-based, row-major).

Suggested starting palette (browse before committing): exteriors `Tileset_7` (construction), `Tileset_Cars`, plus road/ground/building sheets chosen at curation time; interiors `Hospital_01`, `Generic_01–03`, `Grocery_Store_01`, `Classroom_and_Library_01`, `Condominium_01`.

## Characters

Two generations coexist in `characters/`:

| Kind | Files | Format |
|---|---|---|
| **Purchased walk strips (use these)** | `Male_01–04_walk`, `Female_01–03_walk`, `Police_01_walk`, `Female_doctor_walk`, `Male_doctor_walk`, `Nurse_walk`, `Chef_walk`, `Gov_official_walk`, `employee_01_walk` (14 strips) | 768×64 = **24 frames of 32×64** (6 frames × 4 directions) |
| Legacy placeholders (currently wired in `PreloadScene.SPRITE_KEYS`) | `citizen_male_01` … `analyst_01`, `player` | 128×128 = 4×4 frames of 32×32 |

**Scaling math:** art is 16px-base. Chars are 2× (32×64); MV tiles are 3× (48px). At `TILE_SIZE = 48`, scale characters by exactly **1.5** → 48×96, a clean 3× of the original — pixel-crisp with `pixelArt: true`.

**Direction row order is UNVERIFIED.** LimeZu convention is usually `right, up, left, down` (6 frames each) but confirm once with a probe before wiring animations:

```ts
// Temporary probe in PreloadScene.create(): render frames 0, 6, 12, 18 side by side
;[0, 6, 12, 18].forEach((f, i) =>
  this.add.sprite(100 + i * 80, 100, 'Police_01_walk', f).setScale(2),
)
```

Screenshot it, identify which index faces which way, then **record the confirmed order here** and delete the probe.

- `PreloadScene` loads spritesheets with `frameWidth/frameHeight` — for strips use `{ frameWidth: 32, frameHeight: 64 }`.
- Anim keys follow the existing convention `${key}_walk_${dir}` / `${key}_idle_${dir}` (see `PreloadScene.createCharacterAnimations`); `WorldMapScene` plays `_idle_down` on spawn.
- `CitizenGenerator.SPRITE_KEYS` must be updated to the new keys in the same change (`sprite_key` is assigned `index % SPRITE_KEYS.length`).

## Other

- `maps/town.json` — placeholder Tiled JSON (1 "Ground" layer). Generator output replaces it.
- `endings/*.JPG` — ending screen images.
- `audio/` — empty except README (no audio yet).
