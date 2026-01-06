import Phaser from 'phaser';
import { TILE_SIZE } from '../config';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    this.createPlaceholderAssets();
  }

  create() {
    this.scene.start('WorldScene');
  }

  private createPlaceholderAssets() {
    const graphics = this.add.graphics();

    // Player texture (blue square)
    graphics.fillStyle(0x4a90e2, 1);
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.generateTexture('player', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    // NPC texture (green square)
    graphics.fillStyle(0x50c878, 1);
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.generateTexture('npc', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    // Ground tile texture (brown square)
    graphics.fillStyle(0x8b7355, 1);
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.generateTexture('ground', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    graphics.destroy();
  }
}
