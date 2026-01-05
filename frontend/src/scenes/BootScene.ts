import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Future: Load game assets here
  }

  create() {
    const { width, height } = this.cameras.main;

    this.add
      .text(width / 2, height / 2, 'DataFusion World', {
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 60, 'Frontend initialized - Ready for API connection', {
        fontSize: '18px',
        color: '#888888',
      })
      .setOrigin(0.5);
  }
}
