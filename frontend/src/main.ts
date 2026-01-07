import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { WorldScene } from './scenes/WorldScene';
import { SystemDashboardScene } from './scenes/SystemDashboardScene';
import { SystemEndingScene } from './scenes/SystemEndingScene';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import './styles/panel.css';
import './styles/abuse.css';
import './styles/system.css';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  scene: [BootScene, PreloadScene, MainMenuScene, WorldScene, SystemDashboardScene, SystemEndingScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
};

new Phaser.Game(config);
