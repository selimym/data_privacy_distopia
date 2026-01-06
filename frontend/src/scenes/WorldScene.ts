import Phaser from 'phaser';
import {
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  MOVEMENT_DURATION_MS,
  MOVEMENT_EASING
} from '../config';
import { listNPCs } from '../api/npcs';
import type { NPCBasic } from '../types/npc';
import { DataPanel } from '../ui/DataPanel';

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

  // NPC rendering
  private npcs: NPCBasic[] = [];
  private npcSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private selectedNpcId: string | null = null;

  // Data panel UI
  private dataPanel!: DataPanel;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create() {
    this.createGrid();
    this.createPlayer();
    this.setupInput();
    this.setupCamera();

    // Ensure canvas has keyboard focus on load
    this.input.keyboard!.enabled = true;
    this.game.canvas.focus();

    // Initialize data panel UI
    this.dataPanel = new DataPanel(this);

    // Listen for NPC click events
    this.events.on('npc-clicked', (npcId: string) => {
      this.dataPanel.show(npcId);
    });

    // Load and render NPCs
    this.loadNPCs();

    console.log('WorldScene ready');
  }

  private async loadNPCs() {
    try {
      // Load all NPCs from API (no pagination limit for now)
      const result = await listNPCs(1000, 0);
      this.npcs = result.items;

      console.log(`Loaded ${this.npcs.length} NPCs from API`);

      // Create sprites for each NPC
      this.createNPCSprites();
    } catch (error) {
      console.error('Failed to load NPCs:', error);
    }
  }

  private createNPCSprites() {
    for (const npc of this.npcs) {
      const x = npc.map_x * TILE_SIZE + TILE_SIZE / 2;
      const y = npc.map_y * TILE_SIZE + TILE_SIZE / 2;

      const sprite = this.add.sprite(x, y, 'npc');

      // Make sprite interactive
      sprite.setInteractive({ useHandCursor: true });

      // Handle click event
      sprite.on('pointerdown', () => {
        this.handleNpcClick(npc.id);
      });

      // Store sprite reference
      this.npcSprites.set(npc.id, sprite);
    }

    console.log(`Created ${this.npcSprites.size} NPC sprites`);
  }

  private handleNpcClick(npcId: string) {
    // Reset previous selection tint
    if (this.selectedNpcId) {
      const previousSprite = this.npcSprites.get(this.selectedNpcId);
      if (previousSprite) {
        previousSprite.clearTint();
      }
    }

    // Set new selection
    this.selectedNpcId = npcId;
    const selectedSprite = this.npcSprites.get(npcId);

    if (selectedSprite) {
      // Apply yellow tint to selected sprite
      selectedSprite.setTint(0xffff00);
    }

    // Find NPC data for logging
    const npc = this.npcs.find(n => n.id === npcId);
    if (npc) {
      console.log(`Selected NPC: ${npc.first_name} ${npc.last_name} (${npcId})`);
    } else {
      console.log(`Selected NPC: ${npcId}`);
    }

    // Emit event for potential future use
    this.events.emit('npc-clicked', npcId);
  }

  update() {
    if (this.isMoving) return;

    const { left, right, up, down } = this.cursors;
    const { W, A, S, D } = this.wasd;

    // Hold-to-move: Check if keys are currently pressed
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
      duration: MOVEMENT_DURATION_MS,
      ease: MOVEMENT_EASING,
      onComplete: () => {
        this.isMoving = false;
      },
    });
  }

  shutdown() {
    // Clean up data panel
    if (this.dataPanel) {
      this.dataPanel.destroy();
    }

    // Remove event listeners
    this.events.off('npc-clicked');
  }
}
