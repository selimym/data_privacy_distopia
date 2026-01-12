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

  // Map rendering
  private map!: Phaser.Tilemaps.Tilemap;
  private floorLayer!: Phaser.Tilemaps.TilemapLayer;
  private wallsLayer!: Phaser.Tilemaps.TilemapLayer;
  private furnitureLowLayer!: Phaser.Tilemaps.TilemapLayer;
  private furnitureMidLayer!: Phaser.Tilemaps.TilemapLayer;
  private furnitureHighLayer!: Phaser.Tilemaps.TilemapLayer;
  private objectsLayer!: Phaser.Tilemaps.TilemapLayer;

  // NPC rendering
  private npcs: NPCBasic[] = [];
  private npcSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private selectedNpcId: string | null = null;
  private npcTooltip: HTMLDivElement | null = null;

  // Data panel UI
  private dataPanel!: DataPanel;

  // Abuse mode state
  private isAbuseModeActive: boolean = false;
  private currentSessionId: string | null = null;
  private abuseModePanel: AbuseModePanel | null = null;
  private redTintOverlay: HTMLDivElement | null = null;
  private auditTrailElement: HTMLDivElement | null = null;
  private actionsThisSession: Array<{ action: string; target: string }> = [];
  private targetedNpcIds: Set<string> = new Set();

  constructor() {
    super({ key: 'WorldScene' });
  }

  create() {
    this.createMap();
    this.createPlayer();
    this.setupInput();
    this.setupCamera();
    this.setupZoomControls();

    // Ensure canvas has keyboard focus on load
    this.input.keyboard!.enabled = true;
    this.game.canvas.focus();

    // Initialize data panel UI
    this.dataPanel = new DataPanel(this);

    // Create NPC tooltip
    this.createNpcTooltip();

    // Listen for NPC click events
    this.events.on('npc-clicked', (npcId: string) => {
      this.handleNpcClickEvent(npcId);
    });

    // Add "Enter Abuse Mode" button
    this.createAbuseModeButton();

    // Add "Enter System Mode" button
    this.createSystemModeButton();

    // Add menu button
    this.createMenuButton();

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

  private createSystemModeButton() {
    const button = document.createElement('button');
    button.textContent = 'Enter System Mode';
    button.className = 'btn-enter-system-mode';
    button.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #1a1f2e 0%, #252a3d 100%);
      border: 2px solid #4fd1c5;
      color: #4fd1c5;
      font-size: 16px;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
      z-index: 500;
      transition: all 0.2s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(135deg, #252a3d 0%, #1a1f2e 100%)';
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 0 20px rgba(79, 209, 197, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(135deg, #1a1f2e 0%, #252a3d 100%)';
      button.style.transform = 'scale(1)';
      button.style.boxShadow = 'none';
    });

    button.addEventListener('click', () => {
      this.enterSystemMode();
    });

    document.body.appendChild(button);

    // Hide button when abuse mode is active
    this.events.on('abuse-mode-activated', () => {
      button.style.display = 'none';
    });
  }

  private enterSystemMode() {
    // Generate a session ID (in production, this would come from the backend)
    const sessionId = this.currentSessionId || uuidv4();

    // Clean up WorldScene UI elements
    this.cleanupUI();

    // Start the System Dashboard scene with the session ID
    this.scene.start('SystemDashboardScene', { sessionId });
  }

  private cleanupUI() {
    // Remove all UI buttons and panels created by WorldScene
    const uiElements = document.querySelectorAll(
      '.btn-enter-abuse-mode, .btn-enter-system-mode, .data-panel, .npc-tooltip, .zoom-controls, [style*="position: fixed"]'
    );
    uiElements.forEach(el => {
      // Only remove elements that belong to WorldScene (not Phaser game container)
      if (!el.id?.includes('game') && !el.classList.contains('system-dashboard')) {
        el.remove();
      }
    });
  }

  private handleNpcClickEvent(npcId: string) {
    if (this.isAbuseModeActive) {
      // In abuse mode: show abuse panel
      if (this.abuseModePanel) {
        // Show the panel if it's hidden
        this.abuseModePanel.show();
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

      // Use the sprite_key from the database for NPC appearance
      const sprite = this.add.sprite(x, y, npc.sprite_key);

      // Set depth so NPCs appear at the same level as player
      sprite.setDepth(100);

      // Play idle animation facing down by default
      const idleAnimKey = `${npc.sprite_key}_idle_down`;
      if (this.anims.exists(idleAnimKey)) {
        sprite.play(idleAnimKey);
      }

      // Make sprite interactive
      sprite.setInteractive({ useHandCursor: true });

      // Handle hover events
      sprite.on('pointerover', () => {
        this.handleNpcHover(npc.id, true);
      });

      sprite.on('pointerout', () => {
        this.handleNpcHover(npc.id, false);
      });

      // Handle click event
      sprite.on('pointerdown', () => {
        this.handleNpcClick(npc.id);
      });

      // Store sprite reference
      this.npcSprites.set(npc.id, sprite);
    }

    console.log(`Created ${this.npcSprites.size} NPC sprites with animations`);
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

  private createMap() {
    // Create the tilemap from the loaded JSON
    this.map = this.make.tilemap({ key: 'town' });

    // Add all tilesets to the map
    const hospitalTileset = this.map.addTilesetImage('hospital_interior', 'hospital_interior');
    const officeTileset = this.map.addTilesetImage('office_interior', 'office_interior');
    const residentialTileset = this.map.addTilesetImage('residential_interior', 'residential_interior');
    const commercialTileset = this.map.addTilesetImage('commercial_interior', 'commercial_interior');
    const groundTileset = this.map.addTilesetImage('outdoor_ground', 'outdoor_ground');
    const natureTileset = this.map.addTilesetImage('outdoor_nature', 'outdoor_nature');
    const wallsTileset = this.map.addTilesetImage('walls_doors', 'walls_doors');
    const furnitureTileset = this.map.addTilesetImage('furniture_objects', 'furniture_objects');

    // Collect all tilesets
    const tilesets = [
      hospitalTileset,
      officeTileset,
      residentialTileset,
      commercialTileset,
      groundTileset,
      natureTileset,
      wallsTileset,
      furnitureTileset,
    ];

    // Check if any tilesets failed to load
    const missingTilesets = tilesets.filter(t => !t);
    if (missingTilesets.length > 0) {
      console.warn(`Some tilesets failed to load (${missingTilesets.length}/${tilesets.length}). This is expected if assets haven't been added yet.`);
    }

    // Create all tile layers (must match layer names in Tiled map)
    // Note: If layers don't exist in the map, createLayer will return null
    this.floorLayer = this.map.createLayer('1_Floor', tilesets, 0, 0)!;
    this.wallsLayer = this.map.createLayer('2_Walls_Base', tilesets, 0, 0)!;
    this.furnitureLowLayer = this.map.createLayer('3_Furniture_Low', tilesets, 0, 0)!;
    this.furnitureMidLayer = this.map.createLayer('4_Furniture_Mid', tilesets, 0, 0)!;
    this.furnitureHighLayer = this.map.createLayer('5_Furniture_High', tilesets, 0, 0)!;
    this.objectsLayer = this.map.createLayer('6_Objects', tilesets, 0, 0)!;

    // Set depth for proper rendering order
    // Floor and walls below player
    if (this.floorLayer) this.floorLayer.setDepth(0);
    if (this.wallsLayer) this.wallsLayer.setDepth(10);
    if (this.furnitureLowLayer) this.furnitureLowLayer.setDepth(50);

    // Player and NPCs will be at depth 100 (set in createPlayer and createNPCSprites)

    // High furniture and objects above player
    if (this.furnitureMidLayer) this.furnitureMidLayer.setDepth(150);
    if (this.furnitureHighLayer) this.furnitureHighLayer.setDepth(200);
    if (this.objectsLayer) this.objectsLayer.setDepth(250);

    console.log('Tilemap loaded with multi-layer support');
  }

  private createPlayer() {
    this.playerGridX = Math.floor(MAP_WIDTH / 2);
    this.playerGridY = Math.floor(MAP_HEIGHT / 2);

    this.player = this.add.sprite(
      this.playerGridX * TILE_SIZE + TILE_SIZE / 2,
      this.playerGridY * TILE_SIZE + TILE_SIZE / 2,
      'player'
    );

    // Set depth so player appears above low furniture but below high objects
    this.player.setDepth(100);

    // Play initial idle animation facing down
    if (this.anims.exists('player_idle_down')) {
      this.player.play('player_idle_down');
    }
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

    // Handle window resize
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;

    // Update camera viewport
    this.cameras.resize(width, height);

    console.log(`Game resized to ${width}x${height}`);
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

    // Determine movement direction for animation
    let direction = 'down';
    if (dx < 0) direction = 'left';
    else if (dx > 0) direction = 'right';
    else if (dy < 0) direction = 'up';
    else if (dy > 0) direction = 'down';

    // Play walk animation for the movement direction
    const walkAnimKey = `player_walk_${direction}`;
    if (this.anims.exists(walkAnimKey)) {
      this.player.play(walkAnimKey, true);
    }

    this.isMoving = true;

    this.tweens.add({
      targets: this.player,
      x: newX,
      y: newY,
      duration: MOVEMENT_DURATION_MS,
      ease: MOVEMENT_EASING,
      onComplete: () => {
        this.isMoving = false;

        // Switch to idle animation after movement completes
        const idleAnimKey = `player_idle_${direction}`;
        if (this.anims.exists(idleAnimKey)) {
          this.player.play(idleAnimKey);
        }
      },
    });
  }

  private async enterAbuseModeFlow() {
    // Skip warning modal and go straight to scenario intro
    this.showScenarioIntro();
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

    // Create and show abuse mode panel with action callback
    this.abuseModePanel = new AbuseModePanel(
      this.currentSessionId,
      (actionName: string, targetName: string, targetId: string) => this.onActionExecuted(actionName, targetName, targetId)
    );
    this.abuseModePanel.show();

    // Create audit trail
    this.createAuditTrail();

    // Emit event
    this.events.emit('abuse-mode-activated');

    // Show initial prompt
    this.showScenarioPrompt();
  }

  private createRedTintOverlay() {
    // Create edge glow effect instead of full overlay
    this.redTintOverlay = document.createElement('div');
    this.redTintOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
      box-shadow: inset 0 0 100px 20px rgba(239, 71, 111, 0.6);
      transition: box-shadow 0.5s ease-in;
    `;
    document.body.appendChild(this.redTintOverlay);
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

  private onActionExecuted(actionName: string, targetName: string, targetId: string) {
    this.updateAuditTrail(actionName, targetName);
    this.markNpcAsTargeted(targetId);
  }

  private updateAuditTrail(actionName: string, targetName: string) {
    this.actionsThisSession.push({ action: actionName, target: targetName });
    if (this.auditTrailElement) {
      const countElement = this.auditTrailElement.querySelector('.count-number');
      if (countElement) {
        countElement.textContent = this.actionsThisSession.length.toString();
      }
      const listElement = this.auditTrailElement.querySelector('#audit-list') as HTMLUListElement;
      if (listElement) {
        const li = document.createElement('li');
        li.innerHTML = `
          <span class="action-name">${actionName}</span>
          → <span class="target-name">${targetName}</span>
        `;
        listElement.prepend(li);
      }
    }
  }

  private markNpcAsTargeted(npcId: string) {
    // Track that this NPC has been targeted
    this.targetedNpcIds.add(npcId);

    // Apply red glow effect to the NPC sprite
    const sprite = this.npcSprites.get(npcId);
    if (sprite) {
      // Set red tint with slight transparency for a glowing effect
      sprite.setTint(0xff6b6b);

      // Add a pulse effect using tweens
      this.tweens.add({
        targets: sprite,
        alpha: 0.7,
        yoyo: true,
        repeat: -1,
        duration: 1000,
        ease: 'Sine.easeInOut'
      });
    }
  }

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

  private createNpcTooltip() {
    this.npcTooltip = document.createElement('div');
    this.npcTooltip.style.cssText = `
      position: fixed;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border: 1px solid #4a90e2;
      border-radius: 4px;
      font-size: 14px;
      font-weight: bold;
      pointer-events: none;
      z-index: 1000;
      display: none;
      white-space: nowrap;
    `;
    document.body.appendChild(this.npcTooltip);
  }

  private handleNpcHover(npcId: string, isHovering: boolean) {
    const sprite = this.npcSprites.get(npcId);
    const npc = this.npcs.find(n => n.id === npcId);

    if (!sprite || !npc) return;

    if (isHovering) {
      // Apply hover effect (scale up slightly)
      if (this.selectedNpcId !== npcId) {
        sprite.setScale(1.2);
      }

      // Show tooltip
      if (this.npcTooltip) {
        this.npcTooltip.textContent = `${npc.first_name} ${npc.last_name}`;
        this.npcTooltip.style.display = 'block';

        // Position tooltip near cursor
        const updateTooltipPosition = (pointer: Phaser.Input.Pointer) => {
          if (this.npcTooltip) {
            this.npcTooltip.style.left = `${pointer.x + 15}px`;
            this.npcTooltip.style.top = `${pointer.y - 30}px`;
          }
        };

        this.input.on('pointermove', updateTooltipPosition);
        this.input.once('pointerout', () => {
          this.input.off('pointermove', updateTooltipPosition);
        });
      }
    } else {
      // Remove hover effect
      if (this.selectedNpcId !== npcId) {
        sprite.setScale(1);
      }

      // Hide tooltip
      if (this.npcTooltip) {
        this.npcTooltip.style.display = 'none';
      }
    }
  }

  private setupZoomControls() {
    const camera = this.cameras.main;

    // Mouse wheel zoom
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const zoomAmount = deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Phaser.Math.Clamp(camera.zoom + zoomAmount, 0.5, 2.0);
      camera.setZoom(newZoom);
    });

    // Create zoom control buttons
    const zoomControls = document.createElement('div');
    zoomControls.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 500;
    `;

    const buttonStyle = `
      width: 40px;
      height: 40px;
      background: rgba(0, 0, 0, 0.7);
      border: 2px solid #4a90e2;
      color: white;
      font-size: 20px;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    `;

    // Zoom in button
    const zoomInBtn = document.createElement('button');
    zoomInBtn.textContent = '+';
    zoomInBtn.style.cssText = buttonStyle;
    zoomInBtn.addEventListener('mouseenter', () => {
      zoomInBtn.style.background = 'rgba(74, 144, 226, 0.3)';
    });
    zoomInBtn.addEventListener('mouseleave', () => {
      zoomInBtn.style.background = 'rgba(0, 0, 0, 0.7)';
    });
    zoomInBtn.addEventListener('click', () => {
      const newZoom = Phaser.Math.Clamp(camera.zoom + 0.2, 0.5, 2.0);
      camera.setZoom(newZoom);
    });

    // Zoom out button
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.textContent = '−';
    zoomOutBtn.style.cssText = buttonStyle;
    zoomOutBtn.addEventListener('mouseenter', () => {
      zoomOutBtn.style.background = 'rgba(74, 144, 226, 0.3)';
    });
    zoomOutBtn.addEventListener('mouseleave', () => {
      zoomOutBtn.style.background = 'rgba(0, 0, 0, 0.7)';
    });
    zoomOutBtn.addEventListener('click', () => {
      const newZoom = Phaser.Math.Clamp(camera.zoom - 0.2, 0.5, 2.0);
      camera.setZoom(newZoom);
    });

    // Reset zoom button
    const resetZoomBtn = document.createElement('button');
    resetZoomBtn.textContent = '⊙';
    resetZoomBtn.style.cssText = buttonStyle;
    resetZoomBtn.addEventListener('mouseenter', () => {
      resetZoomBtn.style.background = 'rgba(74, 144, 226, 0.3)';
    });
    resetZoomBtn.addEventListener('mouseleave', () => {
      resetZoomBtn.style.background = 'rgba(0, 0, 0, 0.7)';
    });
    resetZoomBtn.addEventListener('click', () => {
      camera.setZoom(1.0);
    });

    zoomControls.appendChild(zoomInBtn);
    zoomControls.appendChild(resetZoomBtn);
    zoomControls.appendChild(zoomOutBtn);
    document.body.appendChild(zoomControls);
  }

  private createMenuButton() {
    const menuBtn = document.createElement('button');
    menuBtn.textContent = '☰ Menu';
    menuBtn.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      padding: 10px 20px;
      background: rgba(0, 0, 0, 0.7);
      border: 2px solid #4a90e2;
      color: white;
      font-size: 16px;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
      z-index: 500;
      transition: all 0.2s;
    `;

    menuBtn.addEventListener('mouseenter', () => {
      menuBtn.style.background = 'rgba(74, 144, 226, 0.3)';
    });

    menuBtn.addEventListener('mouseleave', () => {
      menuBtn.style.background = 'rgba(0, 0, 0, 0.7)';
    });

    menuBtn.addEventListener('click', () => {
      this.showMenuModal();
    });

    document.body.appendChild(menuBtn);
  }

  private showMenuModal() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #4a90e2;
      border-radius: 8px;
      padding: 30px;
      max-width: 400px;
      color: white;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Menu';
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 24px;
      text-align: center;
    `;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    const createButton = (text: string, onClick: () => void, isDanger = false) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.cssText = `
        padding: 12px 24px;
        background: ${isDanger ? '#ef476f' : '#4a90e2'};
        border: none;
        color: white;
        font-size: 16px;
        font-weight: bold;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.background = isDanger ? '#d63354' : '#357abd';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = isDanger ? '#ef476f' : '#4a90e2';
      });
      btn.addEventListener('click', onClick);
      return btn;
    };

    // Restart button
    buttonContainer.appendChild(createButton('Restart Game', () => {
      overlay.remove();
      this.scene.restart();
    }, true));

    // Exit Rogue Mode button (only show if in abuse mode)
    if (this.isAbuseModeActive) {
      buttonContainer.appendChild(createButton('Exit Rogue Mode', () => {
        overlay.remove();
        this.exitAbuseMode();
      }));
    }

    // Close button
    buttonContainer.appendChild(createButton('Close Menu', () => {
      overlay.remove();
    }));

    modal.appendChild(title);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  private exitAbuseMode() {
    if (!this.isAbuseModeActive) return;

    this.isAbuseModeActive = false;
    this.currentSessionId = null;

    // Remove red tint overlay
    if (this.redTintOverlay && this.redTintOverlay.parentElement) {
      this.redTintOverlay.parentElement.removeChild(this.redTintOverlay);
      this.redTintOverlay = null;
    }

    // Remove audit trail
    if (this.auditTrailElement && this.auditTrailElement.parentElement) {
      this.auditTrailElement.parentElement.removeChild(this.auditTrailElement);
      this.auditTrailElement = null;
    }

    // Hide abuse mode panel
    if (this.abuseModePanel) {
      this.abuseModePanel.destroy();
      this.abuseModePanel = null;
    }

    // Clear targeted NPCs list and reset their visuals
    for (const npcId of this.targetedNpcIds) {
      const sprite = this.npcSprites.get(npcId);
      if (sprite) {
        sprite.clearTint();
        sprite.setAlpha(1);
        this.tweens.killTweensOf(sprite);
      }
    }
    this.targetedNpcIds.clear();
    this.actionsThisSession = [];

    // Show the enter abuse mode button again
    const abuseModeBtn = document.querySelector('.btn-enter-abuse-mode') as HTMLElement;
    if (abuseModeBtn) {
      abuseModeBtn.style.display = 'block';
    }

    console.log('Exited abuse mode');
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

    // Clean up red tint overlay
    if (this.redTintOverlay && this.redTintOverlay.parentElement) {
      this.redTintOverlay.parentElement.removeChild(this.redTintOverlay);
    }

    // Clean up audit trail
    if (this.auditTrailElement && this.auditTrailElement.parentElement) {
      this.auditTrailElement.parentElement.removeChild(this.auditTrailElement);
    }

    // Clean up NPC tooltip
    if (this.npcTooltip && this.npcTooltip.parentElement) {
      this.npcTooltip.parentElement.removeChild(this.npcTooltip);
    }

    // Remove event listeners
    this.events.off('npc-clicked');
    this.events.off('abuse-mode-activated');
    this.scale.off('resize', this.handleResize, this);
  }
}
