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
import { AbuseModePanel } from '../ui/AbuseModePanel';
import { WarningModal } from '../ui/WarningModal';
import { ScenarioIntro } from '../ui/ScenarioIntro';
import { ScenarioPromptUI } from '../ui/ScenarioPromptUI';
import { getScenarioPrompt } from '../api/scenarios';

// Simple UUID v4 generator
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

  // Abuse mode state
  private isAbuseModeActive: boolean = false;
  private currentSessionId: string | null = null;
  private abuseModePanel: AbuseModePanel | null = null;
  private redTintOverlay: Phaser.GameObjects.Rectangle | null = null;
  private auditTrailElement: HTMLDivElement | null = null;
  // TODO: Track actions for audit trail
  // private actionsThisSession: Array<{ action: string; target: string }> = [];

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
      this.handleNpcClickEvent(npcId);
    });

    // Add "Enter Abuse Mode" button
    this.createAbuseModeButton();

    // Load and render NPCs
    this.loadNPCs();

    console.log('WorldScene ready');
  }

  private createAbuseModeButton() {
    const button = document.createElement('button');
    button.textContent = 'Enter Rogue Employee Mode';
    button.className = 'btn-enter-abuse-mode';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #e94560 0%, #ef476f 100%);
      border: none;
      color: white;
      font-size: 16px;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
      z-index: 500;
      transition: all 0.2s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(135deg, #ef476f 0%, #e94560 100%)';
      button.style.transform = 'scale(1.05)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(135deg, #e94560 0%, #ef476f 100%)';
      button.style.transform = 'scale(1)';
    });

    button.addEventListener('click', () => {
      this.enterAbuseModeFlow();
    });

    document.body.appendChild(button);

    // Hide button when abuse mode is active
    this.events.on('abuse-mode-activated', () => {
      button.style.display = 'none';
    });
  }

  private handleNpcClickEvent(npcId: string) {
    if (this.isAbuseModeActive) {
      // In abuse mode: populate abuse panel with actions for this target
      if (this.abuseModePanel) {
        // The AbuseModePanel will handle target selection
        // Just select the NPC visually
        this.selectedNpcId = npcId;
      }
    } else {
      // Normal mode: show data panel
      this.dataPanel.show(npcId);
    }
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

  private async enterAbuseModeFlow() {
    // Step 1: Show warning modal
    const warningModal = new WarningModal(
      'rogue_employee',
      () => {
        // User accepted warnings - show scenario intro
        this.showScenarioIntro();
      },
      () => {
        // User declined - do nothing
        console.log('User declined abuse mode');
      }
    );
    warningModal.show();
  }

  private showScenarioIntro() {
    const intro = new ScenarioIntro('rogue_employee', () => {
      // User clicked Begin - activate abuse mode
      this.activateAbuseMode();
    });
    intro.show();
  }

  private activateAbuseMode() {
    this.isAbuseModeActive = true;
    this.currentSessionId = uuidv4();

    console.log(`Abuse mode activated. Session: ${this.currentSessionId}`);

    // Add red tint overlay
    this.createRedTintOverlay();

    // Hide normal data panel
    this.dataPanel.hide();

    // Create abuse mode panel
    const panelContainer = document.getElementById('ui-container');
    if (panelContainer) {
      this.abuseModePanel = new AbuseModePanel(
        panelContainer as HTMLDivElement,
        this.currentSessionId
      );
    }

    // Create audit trail
    this.createAuditTrail();

    // Emit event
    this.events.emit('abuse-mode-activated');

    // Show initial prompt
    this.showScenarioPrompt();
  }

  private createRedTintOverlay() {
    // Create semi-transparent red overlay over the entire camera view
    this.redTintOverlay = this.add.rectangle(
      0,
      0,
      MAP_WIDTH * TILE_SIZE,
      MAP_HEIGHT * TILE_SIZE,
      0xff0000,
      0.1 // 10% opacity
    );
    this.redTintOverlay.setOrigin(0, 0);
    this.redTintOverlay.setDepth(5); // Above ground and NPCs, below UI
  }

  private createAuditTrail() {
    this.auditTrailElement = document.createElement('div');
    this.auditTrailElement.className = 'audit-trail';
    this.auditTrailElement.innerHTML = `
      <div class="audit-trail-header">Your Actions</div>
      <div class="audit-count">
        <span class="count-number">0</span> privacy violations committed
      </div>
      <ul class="audit-list" id="audit-list"></ul>
    `;
    document.body.appendChild(this.auditTrailElement);
  }

  // TODO: Wire up audit trail to AbuseModePanel action execution events
  // private updateAuditTrail(actionName: string, targetName: string) {
  //   this.actionsThisSession.push({ action: actionName, target: targetName });
  //   if (this.auditTrailElement) {
  //     const countElement = this.auditTrailElement.querySelector('.count-number');
  //     if (countElement) {
  //       countElement.textContent = this.actionsThisSession.length.toString();
  //     }
  //     const listElement = this.auditTrailElement.querySelector('#audit-list') as HTMLUListElement;
  //     if (listElement) {
  //       const li = document.createElement('li');
  //       li.innerHTML = `
  //         <span class="action-name">${actionName}</span>
  //         → <span class="target-name">${targetName}</span>
  //       `;
  //       listElement.prepend(li);
  //     }
  //   }
  // }

  private async showScenarioPrompt() {
    if (!this.currentSessionId) return;

    try {
      const prompt = await getScenarioPrompt(
        'rogue_employee',
        this.currentSessionId
      );

      const promptUI = new ScenarioPromptUI(prompt, () => {
        console.log('Prompt dismissed');
      });
      promptUI.show();
    } catch (error) {
      // No prompt available - that's ok
      console.log('No scenario prompt available:', error);
    }
  }

  shutdown() {
    // Clean up data panel
    if (this.dataPanel) {
      this.dataPanel.destroy();
    }

    // Clean up abuse mode panel
    if (this.abuseModePanel) {
      this.abuseModePanel.destroy();
    }

    // Clean up audit trail
    if (this.auditTrailElement && this.auditTrailElement.parentElement) {
      this.auditTrailElement.parentElement.removeChild(this.auditTrailElement);
    }

    // Remove event listeners
    this.events.off('npc-clicked');
    this.events.off('abuse-mode-activated');
  }
}
