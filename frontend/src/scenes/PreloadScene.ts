import Phaser from 'phaser';
import { TILE_SIZE } from '../config';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Load tileset images for the map
    this.load.image('hospital_interior', '/assets/tilesets/hospital_interior.png');
    this.load.image('office_interior', '/assets/tilesets/office_interior.png');
    this.load.image('residential_interior', '/assets/tilesets/residential_interior.png');
    this.load.image('commercial_interior', '/assets/tilesets/commercial_interior.png');
    this.load.image('outdoor_ground', '/assets/tilesets/outdoor_ground.png');
    this.load.image('outdoor_nature', '/assets/tilesets/outdoor_nature.png');
    this.load.image('walls_doors', '/assets/tilesets/walls_doors.png');
    this.load.image('furniture_objects', '/assets/tilesets/furniture_objects.png');

    // Load character sprite sheets (32x32 per frame, 4x4 grid = 128x128 total)
    const spriteKeys = [
      'citizen_male_01',
      'citizen_male_02',
      'citizen_male_03',
      'citizen_female_01',
      'citizen_female_02',
      'citizen_female_03',
      'doctor_male_01',
      'doctor_female_01',
      'nurse_female_01',
      'office_worker_male_01',
      'office_worker_female_01',
      'employee_01',
      'official_01',
      'analyst_01',
    ];

    spriteKeys.forEach((key) => {
      this.load.spritesheet(key, `/assets/characters/${key}.png`, {
        frameWidth: TILE_SIZE,
        frameHeight: TILE_SIZE,
      });
    });

    // Load player sprite sheet
    this.load.spritesheet('player', '/assets/characters/player.png', {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });

    // Load the tilemap JSON
    this.load.tilemapTiledJSON('town', '/assets/maps/town.json');
  }

  create() {
    // Create animations for all character sprites
    this.createCharacterAnimations();

    this.scene.start('MainMenuScene');
  }

  private createCharacterAnimations() {
    // List of all character sprite keys including player
    const spriteKeys = [
      'citizen_male_01',
      'citizen_male_02',
      'citizen_male_03',
      'citizen_female_01',
      'citizen_female_02',
      'citizen_female_03',
      'doctor_male_01',
      'doctor_female_01',
      'nurse_female_01',
      'office_worker_male_01',
      'office_worker_female_01',
      'employee_01',
      'official_01',
      'analyst_01',
      'player',
    ];

    spriteKeys.forEach((key) => {
      // Create walk animations for all 4 directions
      // Sprite sheet layout: 4 rows (down, left, right, up) x 4 frames per row
      const directions = ['down', 'left', 'right', 'up'];

      directions.forEach((dir, rowIndex) => {
        // Walk animation (4 frames per direction)
        this.anims.create({
          key: `${key}_walk_${dir}`,
          frames: this.anims.generateFrameNumbers(key, {
            start: rowIndex * 4,
            end: rowIndex * 4 + 3,
          }),
          frameRate: 8,
          repeat: -1,
        });

        // Idle animation (single frame - middle of walk cycle)
        this.anims.create({
          key: `${key}_idle_${dir}`,
          frames: [{ key: key, frame: rowIndex * 4 + 1 }],
          frameRate: 1,
        });
      });
    });

    console.log('Created animations for all character sprites');
  }
}
