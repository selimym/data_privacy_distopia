/**
 * MainMenuScene - Mode Selection Menu
 *
 * Entry point for the game with options to explore different modes.
 * "The System" mode shows a content warning before entry.
 */

import Phaser from 'phaser';

// Simple UUID v4 generator
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class MainMenuScene extends Phaser.Scene {
  private container!: HTMLDivElement;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    this.container = document.createElement('div');
    this.container.className = 'main-menu-scene';
    this.container.innerHTML = this.getMenuHTML();
    document.body.appendChild(this.container);
    this.setupEventListeners();
  }

  private getMenuHTML(): string {
    return `
      <div class="menu-container">
        <div class="menu-header">
          <h1 class="game-title">DATAFUSION WORLD</h1>
          <p class="game-subtitle">A Privacy Dystopia Experience</p>
        </div>

        <div class="menu-options">
          <button class="menu-btn" data-mode="explore">
            <span class="btn-icon">🌍</span>
            <span class="btn-text">
              <span class="btn-title">Explore Town</span>
              <span class="btn-desc">Walk around and view citizen data</span>
            </span>
          </button>

          <button class="menu-btn" data-mode="rogue">
            <span class="btn-icon">💀</span>
            <span class="btn-text">
              <span class="btn-title">Rogue Employee</span>
              <span class="btn-desc">Abuse your access to harm citizens</span>
            </span>
          </button>

          <button class="menu-btn system-mode" data-mode="system">
            <span class="btn-icon">⬡</span>
            <span class="btn-text">
              <span class="btn-title">The System</span>
              <span class="btn-desc">Become a surveillance state operator</span>
            </span>
            <span class="btn-badge">NEW</span>
          </button>

          <button class="menu-btn settings-btn" data-mode="settings">
            <span class="btn-icon">⚙</span>
            <span class="btn-text">
              <span class="btn-title">Settings</span>
              <span class="btn-desc">Content warnings and options</span>
            </span>
          </button>
        </div>

        <div class="menu-footer">
          <p class="disclaimer">
            All characters, organizations, and data in this game are entirely fictitious.
            This is an educational experience about data privacy.
          </p>
          <p class="credits">
            Made with concern for digital rights.
          </p>
        </div>
      </div>
    `;
  }

  private setupEventListeners() {
    const buttons = this.container.querySelectorAll('.menu-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        this.handleModeSelection(mode);
      });
    });
  }

  private handleModeSelection(mode: string | null) {
    switch (mode) {
      case 'explore':
        this.startExploreMode();
        break;
      case 'rogue':
        this.startRogueMode();
        break;
      case 'system':
        this.showSystemContentWarning();
        break;
      case 'settings':
        this.showSettings();
        break;
    }
  }

  private startExploreMode() {
    this.cleanup();
    this.scene.start('WorldScene');
  }

  private startRogueMode() {
    // Rogue mode starts from WorldScene with abuse mode enabled
    this.cleanup();
    this.scene.start('WorldScene', { startInAbuseMode: true });
  }

  private showSystemContentWarning() {
    // Create content warning overlay
    const warning = document.createElement('div');
    warning.className = 'content-warning-overlay';
    warning.innerHTML = `
      <div class="content-warning-modal">
        <div class="warning-header">
          <h2>CONTENT ADVISORY</h2>
        </div>

        <div class="warning-body">
          <p class="warning-intro">
            "The System" is an interactive experience that places you in
            the role of a surveillance state operator.
          </p>

          <div class="warning-content-list">
            <p>This mode contains:</p>
            <ul>
              <li>Themes of mass surveillance and privacy violation</li>
              <li>Depictions of state control and authoritarianism</li>
              <li>Consequences including job loss, family separation, detention</li>
              <li>Reading of simulated private communications</li>
              <li>Content designed to be uncomfortable (this is intentional)</li>
            </ul>
          </div>

          <div class="warning-purpose">
            <p>
              The purpose is educational: to demonstrate why privacy
              protections matter and what surveillance states look like
              from the inside.
            </p>
            <p>
              This content is based on real systems and proposed legislation.
            </p>
          </div>

          <div class="warning-checkbox">
            <label>
              <input type="checkbox" id="content-understood" />
              <span>I understand this is educational content about surveillance</span>
            </label>
          </div>
        </div>

        <div class="warning-actions">
          <button class="btn-continue" disabled>CONTINUE</button>
          <button class="btn-back">BACK TO MENU</button>
        </div>
      </div>
    `;

    document.body.appendChild(warning);

    // Animate in
    requestAnimationFrame(() => {
      warning.classList.add('visible');
    });

    // Setup listeners
    const checkbox = warning.querySelector('#content-understood') as HTMLInputElement;
    const continueBtn = warning.querySelector('.btn-continue') as HTMLButtonElement;
    const backBtn = warning.querySelector('.btn-back');

    checkbox?.addEventListener('change', () => {
      continueBtn.disabled = !checkbox.checked;
    });

    continueBtn?.addEventListener('click', () => {
      warning.classList.remove('visible');
      setTimeout(() => {
        warning.remove();
        this.startSystemMode();
      }, 300);
    });

    backBtn?.addEventListener('click', () => {
      warning.classList.remove('visible');
      setTimeout(() => warning.remove(), 300);
    });
  }

  private startSystemMode() {
    const sessionId = uuidv4();
    this.cleanup();
    this.scene.start('SystemDashboardScene', { sessionId });
  }

  private showSettings() {
    const settings = document.createElement('div');
    settings.className = 'settings-overlay';
    settings.innerHTML = `
      <div class="settings-modal">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="btn-close">×</button>
        </div>

        <div class="settings-body">
          <div class="setting-group">
            <h3>Content Warnings</h3>
            <label class="setting-item">
              <input type="checkbox" checked />
              <span>Show content warnings before sensitive modes</span>
            </label>
          </div>

          <div class="setting-group">
            <h3>Display</h3>
            <label class="setting-item">
              <input type="checkbox" />
              <span>Reduce visual intensity</span>
            </label>
          </div>

          <div class="setting-group">
            <h3>About</h3>
            <p class="about-text">
              Datafusion World is an educational game about data privacy
              and the dangers of mass surveillance. All characters and
              scenarios are fictional.
            </p>
            <p class="about-text">
              Learn more about protecting your privacy at:
              <a href="https://www.eff.org" target="_blank" rel="noopener">EFF.org</a>
            </p>
          </div>
        </div>

        <div class="settings-footer">
          <button class="btn-save">Save & Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(settings);

    requestAnimationFrame(() => {
      settings.classList.add('visible');
    });

    const closeBtn = settings.querySelector('.btn-close');
    const saveBtn = settings.querySelector('.btn-save');

    const closeSettings = () => {
      settings.classList.remove('visible');
      setTimeout(() => settings.remove(), 300);
    };

    closeBtn?.addEventListener('click', closeSettings);
    saveBtn?.addEventListener('click', closeSettings);
  }

  private cleanup() {
    if (this.container) {
      this.container.remove();
    }
  }

  shutdown() {
    this.cleanup();
  }
}
