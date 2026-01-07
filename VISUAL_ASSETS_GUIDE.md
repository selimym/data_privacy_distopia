# Visual Assets Guide

## What Was Created

The game now has a proper 2D RPG-style map infrastructure with placeholder blocks for different building types.

### Map Structure

**Location**: `frontend/public/assets/maps/town.json`

The 50x50 tile map includes the following zones:

1. **Hospital Area** (Pink/Red blocks - Tile ID: 2)
   - Located in the north section (rows 1-9, columns 11-19)
   - Large building with multiple rooms

2. **Residential Buildings** (Blue blocks - Tile ID: 3)
   - Scattered throughout the west side
   - Multiple apartment buildings (4x4 blocks each)

3. **Government Building** (Beige blocks - Tile ID: 6)
   - Located in the northeast (rows 2-4, columns 32-36)
   - Could be used for the Senator scenario

4. **Town Square** (Light gray blocks - Tile ID: 4)
   - Central meeting area (rows 23-28, columns 13-22)
   - Public gathering space

5. **Park** (Dark green blocks - Tile ID: 5)
   - Located on the east side (rows 10-19, columns 40-48)
   - Includes a pond/water feature (blue blocks)

6. **Roads** (Dark gray blocks - Tile ID: 1)
   - Connect different areas
   - Main roads run horizontally and vertically

7. **Grass/Ground** (Olive green - Tile ID: 0)
   - Default ground tile everywhere else

### Current Placeholder Colors

| Building Type | Color | Hex Code | Usage |
|--------------|-------|----------|-------|
| Grass | Olive green | #6b8e23 | Default ground |
| Road | Dark gray | #4a4a4a | Paths between buildings |
| Hospital | Pink/Red | #ffc0cb | Medical facilities |
| Residential | Light blue | #87ceeb | Apartment buildings |
| Town Square | Light gray | #d3d3d3 | Public plaza |
| Park | Dark green | #228b22 | Trees and nature |
| Government | Beige | #f5f5dc | Official buildings |
| Water | Blue | #4169e1 | Ponds/decorations |

### NPC Sprites

- **Player**: Blue square with border
- **NPCs**: Green circles with border

These are procedurally generated in `PreloadScene.ts` and can be easily replaced with sprite sheets.

---

## How to Replace with Real Assets

### Option 1: Create/Find a Tileset Image

1. **Create a tileset image** (256x32 pixels)
   - 8 tiles in a horizontal row
   - Each tile is 32x32 pixels
   - Tiles should match the order: Grass, Road, Hospital, Residential, Town Square, Park, Government, Water

2. **Save it as**: `frontend/public/assets/tilesets/town-tileset.png`

3. **Update PreloadScene.ts**:
   ```typescript
   // Replace this line in preload():
   this.load.image('tileset', '/assets/tilesets/town-tileset.png');

   // And remove or comment out:
   this.createTilesetTexture(graphics);
   ```

### Option 2: Use Tiled Map Editor (Recommended)

1. **Install Tiled**: https://www.mapeditor.org/

2. **Open the map**:
   - File → Open: `frontend/public/assets/maps/town.json`

3. **Replace the tileset**:
   - In Tiled, go to Tilesets panel
   - Click "Replace Tileset Image"
   - Select your custom tileset image

4. **Edit the map**:
   - Paint new tiles
   - Add object layers for spawn points
   - Add collision layers
   - Export as JSON

5. **No code changes needed** - Phaser will automatically use the updated map

### Option 3: Character Sprites

To replace player and NPC sprites:

1. **Create or find sprite sheets**:
   - Player sprite: 32x32 (or 32x128 for 4 directions)
   - NPC sprites: 32x32 each or sprite sheet

2. **Save to**: `frontend/public/assets/sprites/`

3. **Update PreloadScene.ts**:
   ```typescript
   preload() {
     // Instead of createPlaceholderAssets(), load images:
     this.load.image('player', '/assets/sprites/player.png');

     // For animated sprites:
     this.load.spritesheet('player', '/assets/sprites/player.png', {
       frameWidth: 32,
       frameHeight: 32
     });
   }
   ```

4. **Add animations in WorldScene.ts** (optional):
   ```typescript
   this.anims.create({
     key: 'walk-down',
     frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
     frameRate: 10,
     repeat: -1
   });
   ```

---

## Where to Find Assets

### Free Tileset Resources

1. **OpenGameArt.org**
   - Search: "32x32 tileset" or "RPG tileset"
   - License: Various (check each)
   - Good for: Buildings, ground tiles, decorations

2. **Itch.io**
   - Search: "tileset" or "pixel art pack"
   - Many free and paid options
   - Filter by: Free, Assets, Graphics

3. **Kenney.nl**
   - Free game assets
   - Clean, consistent style
   - CC0 license (public domain)

4. **LimeZu Itch.io**
   - Modern pixel art tilesets
   - Hospital, city, indoor sets available

### Character Sprite Resources

1. **OpenGameArt.org**
   - Search: "character sprite" or "RPG character"
   - Many top-down view options

2. **Universal LPC Spritesheet**
   - Customizable character generator
   - Thousands of combinations
   - Great for diverse NPCs

3. **CraftPix.net**
   - High-quality sprite packs
   - Both free and premium options

### AI Generation Tools

1. **Scenario.gg** - Generate consistent tilesets
2. **Stable Diffusion** - With ControlNet for pixel art
3. **Midjourney** - Pixel art style prompts
4. **DALL-E** - With "pixel art game tiles" in prompt

---

## Audio Assets (Already Set Up)

The AudioManager is ready to use. Add audio files to:
`frontend/public/assets/audio/`

See `frontend/public/assets/audio/README.md` for details on what files to add and where to find them.

---

## Map Layout Details

### Suggested NPC Placements

Based on the game design document scenarios:

1. **Alex** (Hospital scenario) → Hospital area (tile coordinates: 15, 5)
2. **Jessica** (Residential) → Residential building (tile coordinates: 4, 13)
3. **Senator** → Government building (tile coordinates: 34, 3)
4. **Random NPCs** → Scattered in Town Square, Park, and Residential areas

### How to Update NPC Positions

NPC positions are stored in the database (`map_x`, `map_y` coordinates).

To place NPCs at specific buildings, update the backend NPC generator:
`backend/src/datafusion/generators/npc.py`

Example:
```python
# Place Alex at hospital
alex = NPC(
    first_name="Alex",
    last_name="Chen",
    map_x=15,  # Hospital location
    map_y=5,
    scenario_key="patient_stalking"
)
```

---

## Testing the Map

1. **Build the frontend**:
   ```bash
   cd frontend
   pnpm build
   ```

2. **Start the development server**:
   ```bash
   pnpm dev
   ```

3. **What you should see**:
   - Different colored blocks representing buildings
   - Green circles (NPCs) at their map positions
   - Blue square (player) in the center
   - Smooth movement with WASD/arrow keys
   - Camera follows the player

4. **Map boundaries**:
   - Player cannot move outside the 50x50 grid
   - Buildings are visible as colored zones

---

## Next Steps

1. **Find or create assets**:
   - Look through the resources listed above
   - Download a consistent tileset pack
   - Ensure all tiles are 32x32 pixels

2. **Replace placeholder graphics**:
   - Follow "Option 1" or "Option 2" above
   - Test that the map still loads

3. **Add character variety**:
   - Create or find different NPC sprites
   - Update `sprite_key` in backend to reference different sprites
   - Load multiple sprite types in PreloadScene

4. **Enhance with animations**:
   - Add walking animations for player
   - Add idle animations for NPCs
   - Add particle effects (optional)

5. **Add audio**:
   - Find ambient sounds and SFX
   - Place in `assets/audio/` directory
   - Uncomment AudioManager loading code

---

## Technical Notes

### Phaser 3 Tilemap System

The game uses Phaser's built-in tilemap rendering:
- **Format**: Tiled JSON (compatible with Tiled Map Editor)
- **Tile size**: 32x32 pixels
- **Map size**: 50x50 tiles (1600x1600 pixels)
- **Layers**: Currently 1 layer ("Ground"), can add more

### Adding More Layers

To add collision or decoration layers:

1. **In Tiled**:
   - Layer → New Layer → Tile Layer
   - Name it (e.g., "Collision", "Decorations")
   - Paint tiles

2. **In WorldScene.ts**:
   ```typescript
   const decorationsLayer = this.map.createLayer('Decorations', tileset, 0, 0);
   decorationsLayer.setDepth(10); // Render above ground
   ```

### Collision Detection (Future)

To add building collision:

1. **Mark tiles as collidable**:
   ```typescript
   this.groundLayer.setCollisionByProperty({ collides: true });
   ```

2. **Check collision before moving**:
   ```typescript
   const tile = this.groundLayer.getTileAtWorldXY(newX, newY);
   if (tile && tile.properties.collides) {
     return; // Don't move
   }
   ```

---

## Current File Structure

```
frontend/
├── public/
│   └── assets/
│       ├── maps/
│       │   └── town.json         (50x50 tilemap)
│       ├── tilesets/
│       │   └── (add tileset images here)
│       ├── sprites/
│       │   └── (add character sprites here)
│       └── audio/
│           └── README.md         (audio guide)
└── src/
    ├── scenes/
    │   ├── PreloadScene.ts      (loads assets, creates placeholders)
    │   └── WorldScene.ts        (renders map, handles gameplay)
    ├── audio/
    │   └── AudioManager.ts      (manages sound)
    └── config.ts                (game constants)
```

---

## Common Issues & Solutions

### Map doesn't load
- Check browser console for errors
- Verify `town.json` exists in `public/assets/maps/`
- Check that tileset name matches in JSON and code

### Tiles render as black squares
- Tileset texture generation failed
- Check browser console for errors
- Verify tile IDs in JSON match tileset size

### Player spawns off-map
- Default spawn is center of map (25, 25)
- Change in `WorldScene.ts` → `createPlayer()`

### NPCs not visible
- Check that API is running and returning NPCs
- Verify NPC coordinates are within map bounds (0-49)
- Check browser console for loading errors

---

**Created**: January 7, 2026
**Last Updated**: January 7, 2026
**Status**: Ready for asset replacement
