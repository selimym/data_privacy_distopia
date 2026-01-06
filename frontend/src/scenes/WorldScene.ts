import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../config';

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private playerGridX: number = 0;
  private playerGridY: number = 0;
  private isMoving: boolean = false;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create() {
    this.createGrid();
    this.createPlayer();
    this.setupInput();
    this.setupCamera();

    console.log('WorldScene ready');
  }

  update() {
    if (this.isMoving) return;

    const { left, right, up, down } = this.cursors;
    const { W, A, S, D } = this.wasd;

    if (left.isDown || A.isDown) {
      this.movePlayer(-1, 0);
    } else if (right.isDown || D.isDown) {
      this.movePlayer(1, 0);
    } else if (up.isDown || W.isDown) {
      this.movePlayer(0, -1);
    } else if (down.isDown || S.isDown) {
      this.movePlayer(0, 1);
    }
  }

  private createGrid() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.add.sprite(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          'ground'
        );
      }
    }
  }

  private createPlayer() {
    this.playerGridX = Math.floor(MAP_WIDTH / 2);
    this.playerGridY = Math.floor(MAP_HEIGHT / 2);

    this.player = this.add.sprite(
      this.playerGridX * TILE_SIZE + TILE_SIZE / 2,
      this.playerGridY * TILE_SIZE + TILE_SIZE / 2,
      'player'
    );
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  private setupCamera() {
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(
      0,
      0,
      MAP_WIDTH * TILE_SIZE,
      MAP_HEIGHT * TILE_SIZE
    );
  }

  private movePlayer(dx: number, dy: number) {
    const newGridX = this.playerGridX + dx;
    const newGridY = this.playerGridY + dy;

    if (
      newGridX < 0 ||
      newGridX >= MAP_WIDTH ||
      newGridY < 0 ||
      newGridY >= MAP_HEIGHT
    ) {
      return;
    }

    this.playerGridX = newGridX;
    this.playerGridY = newGridY;

    const newX = this.playerGridX * TILE_SIZE + TILE_SIZE / 2;
    const newY = this.playerGridY * TILE_SIZE + TILE_SIZE / 2;

    this.isMoving = true;

    this.tweens.add({
      targets: this.player,
      x: newX,
      y: newY,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.isMoving = false;
      },
    });
  }
}
