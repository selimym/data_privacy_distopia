import Phaser from 'phaser';
import { TILE_SIZE } from '../config';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    this.createPlaceholderAssets();

    // Load the tilemap JSON
    this.load.tilemapTiledJSON('town', '/assets/maps/town.json');
  }

  create() {
    this.scene.start('WorldScene');
  }

  private createPlaceholderAssets() {
    const graphics = this.add.graphics();

    // Player texture (blue square with border)
    graphics.fillStyle(0x4a90e2, 1);
    graphics.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    graphics.lineStyle(2, 0x2a5a8a);
    graphics.strokeRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    graphics.generateTexture('player', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    // NPC texture (green circle)
    graphics.fillStyle(0x50c878, 1);
    graphics.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2 - 4);
    graphics.lineStyle(2, 0x2a6a3a);
    graphics.strokeCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2 - 4);
    graphics.generateTexture('npc', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    // Create tileset with different tiles for buildings/zones
    this.createTilesetTexture(graphics);

    graphics.destroy();
  }

  private createTilesetTexture(graphics: Phaser.GameObjects.Graphics) {
    // Create a tileset image with 8 tiles (1 row, 8 columns)
    const tilesetWidth = TILE_SIZE * 8;
    const tilesetHeight = TILE_SIZE;

    const tiles = [
      { color: 0x6b8e23, borderColor: 0x4a6018, name: 'Grass' },        // Tile 0: Grass/Ground
      { color: 0x4a4a4a, borderColor: 0x2a2a2a, name: 'Road' },         // Tile 1: Road
      { color: 0xffc0cb, borderColor: 0xff6b7a, name: 'Hospital' },     // Tile 2: Hospital (pink/red)
      { color: 0x87ceeb, borderColor: 0x4682b4, name: 'Residential' },  // Tile 3: Residential (blue)
      { color: 0xd3d3d3, borderColor: 0x8b8b8b, name: 'Town Square' },  // Tile 4: Town Square
      { color: 0x228b22, borderColor: 0x145214, name: 'Park' },         // Tile 5: Park (dark green)
      { color: 0xf5f5dc, borderColor: 0xc0c0aa, name: 'Government' },   // Tile 6: Government (beige/marble)
      { color: 0x4169e1, borderColor: 0x1e3a8a, name: 'Water' },        // Tile 7: Water/Pond
    ];

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const x = i * TILE_SIZE;

      // Fill tile
      graphics.fillStyle(tile.color, 1);
      graphics.fillRect(x + 1, 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Add border for definition
      graphics.lineStyle(1, tile.borderColor, 0.5);
      graphics.strokeRect(x + 1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    graphics.generateTexture('tileset', tilesetWidth, tilesetHeight);
    graphics.clear();
  }
}
