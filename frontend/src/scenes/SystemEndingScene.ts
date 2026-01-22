/**
 * SystemEndingScene - Multiple endings based on player behavior
 *
 * Each ending is impactful and educational, showing the human cost
 * of surveillance decisions and connecting to real-world systems.
 */

import Phaser from 'phaser';
import { EndingCalculator } from '../services/ending-calculator';
import type { EndingResult, CitizenOutcomeSummary } from '../types/system';
import { getSystemAudioManager } from '../audio/SystemAudioManager';
import { getSystemVisualEffects } from '../ui/system/SystemVisualEffects';

export class SystemEndingScene extends Phaser.Scene {
  private container!: HTMLDivElement;
  private operatorId: string | null = null;
  private endingData: EndingResult | null = null;
  private currentSequenceIndex: number = 0;
  private typewriterTimeout: number | null = null;

  constructor() {
    super({ key: 'SystemEndingScene' });
  }

  init(data: { operatorId: string }) {
    this.operatorId = data.operatorId;
  }

  async create() {
    this.container = document.createElement('div');
    this.container.className = 'system-ending-scene';
    document.body.appendChild(this.container);

    await this.loadEnding();
  }

  private async loadEnding() {
    if (!this.operatorId) {
      this.showError('No operator ID provided');
      return;
    }

    this.showLoading();

    try {
      const endingCalculator = new EndingCalculator();
      const endingType = endingCalculator.calculateEnding(this.operatorId);
      this.endingData = endingCalculator.generateEndingContent(endingType, this.operatorId);
      this.startEnding();
    } catch (error) {
      console.error('Failed to load ending:', error);
      this.showError('Failed to load ending data');
    }
  }

  private showLoading() {
    this.container.innerHTML = `
      <div class="ending-loading">
        <div class="loading-spinner"></div>
        <p>Processing final outcome...</p>
      </div>
    `;
  }

  private showError(message: string) {
    this.container.innerHTML = `
      <div class="ending-error">
        <p>${message}</p>
        <button class="btn-return-menu">Return to Menu</button>
      </div>
    `;
    this.container.querySelector('.btn-return-menu')?.addEventListener('click', () => {
      this.returnToMenu();
    });
  }

  private startEnding() {
    if (!this.endingData) return;

    // Stop ambient and play ending audio
    const audioManager = getSystemAudioManager();
    audioManager.stopAmbient();

    // Clean up visual effects
    getSystemVisualEffects().cleanup();

    switch (this.endingData.ending_type) {
      case 'compliant_operator':
        audioManager.play('ending_compliant');
        this.playCompliantEnding();
        break;
      case 'suspended_operator':
        audioManager.play('ending_suspended');
        this.playSuspendedEnding();
        break;
      case 'reluctant_operator':
        audioManager.play('ending_revelation');
        this.playReluctantEnding();
        break;
      case 'resistance_path':
        audioManager.play('ending_revelation');
        this.playResistanceEnding();
        break;
      default:
        audioManager.play('ending_compliant');
        this.playCompliantEnding();
    }
  }

  private async playCompliantEnding() {
    const sequences = [
      { type: 'fade', duration: 1500 },
      { type: 'text', content: 'Six months later.', duration: 3000, style: 'large' },
      { type: 'fade', duration: 1000 },
      { type: 'text', content: 'The system works.', duration: 2500 },
      { type: 'text', content: 'Crime is down 34%.', duration: 2500 },
      { type: 'text', content: 'Dissent is down 91%.', duration: 2500 },
      { type: 'text', content: 'Happiness surveys report 96% satisfaction.', duration: 3000 },
      { type: 'text', content: '(Survey response is mandatory.)', duration: 3000, style: 'subtle' },
      { type: 'fade', duration: 1500 },
      { type: 'outcomes', duration: 0 },
      { type: 'fade', duration: 1500 },
      { type: 'text', content: 'You were promoted to Senior Analyst.', duration: 3000 },
      { type: 'text', content: `Your compliance score: ${this.endingData?.statistics.your_compliance_score.toFixed(1)}%`, duration: 3000 },
      { type: 'text', content: 'Thank you for your service to social harmony.', duration: 4000, style: 'large' },
      { type: 'fade', duration: 2000 },
      { type: 'realworld', duration: 0 },
    ];

    await this.playSequence(sequences);
  }

  private async playSuspendedEnding() {
    const sequences = [
      { type: 'review', duration: 0 },
      { type: 'fade', duration: 2000 },
      { type: 'text', content: 'Your access has been permanently revoked.', duration: 3000 },
      { type: 'text', content: 'Your personnel file has been flagged.', duration: 3000 },
      { type: 'text', content: 'Future employment in public sector: DENIED', duration: 3500, style: 'warning' },
      { type: 'fade', duration: 1500 },
      { type: 'text', content: 'You are now a subject, not an operator.', duration: 4000, style: 'large' },
      { type: 'fade', duration: 1500 },
      { type: 'player_outcomes', duration: 0 },
      { type: 'fade', duration: 2000 },
      { type: 'realworld', duration: 0 },
    ];

    await this.playSequence(sequences);
  }

  private async playReluctantEnding() {
    const sequences = [
      { type: 'fade', duration: 1500 },
      { type: 'text', content: 'You followed most orders. You hesitated on some.', duration: 3500 },
      { type: 'text', content: 'You told yourself you were different. Better.', duration: 3500 },
      { type: 'fade', duration: 1500 },
      { type: 'outcomes', duration: 0 },
      { type: 'fade', duration: 1500 },
      { type: 'text', content: 'These people\'s lives were disrupted by your decisions.', duration: 4000 },
      { type: 'text', content: 'The ones you spared? Someone else flagged them.', duration: 4000 },
      { type: 'fade', duration: 1500 },
      { type: 'text', content: 'The system doesn\'t need your compliance.', duration: 3500 },
      { type: 'text', content: 'It just needs enough compliance.', duration: 3500 },
      { type: 'text', content: 'Your hesitation changed nothing.', duration: 3000 },
      { type: 'text', content: 'Except how you sleep at night.', duration: 4000, style: 'subtle' },
      { type: 'fade', duration: 2000 },
      { type: 'realworld', duration: 0 },
    ];

    await this.playSequence(sequences);
  }

  private async playResistanceEnding() {
    const sequences = [
      { type: 'fade', duration: 1500 },
      { type: 'text', content: 'You refused.', duration: 3000, style: 'large' },
      { type: 'text', content: 'In a system designed to make refusal impossible.', duration: 4000 },
      { type: 'fade', duration: 1500 },
      { type: 'text', content: 'Your career is over.', duration: 3000 },
      { type: 'text', content: 'Your file is marked.', duration: 3000 },
      { type: 'text', content: 'But you know what you did. And what you didn\'t do.', duration: 4000 },
      { type: 'fade', duration: 1500 },
      { type: 'text', content: 'The system continues without you.', duration: 3500 },
      { type: 'text', content: 'But systems are made of people.', duration: 3500 },
      { type: 'text', content: 'And some people still say no.', duration: 4000, style: 'large' },
      { type: 'fade', duration: 2000 },
      { type: 'realworld', duration: 0 },
    ];

    await this.playSequence(sequences);
  }

  private async playSequence(sequences: Array<{ type: string; content?: string; duration: number; style?: string }>) {
    for (const seq of sequences) {
      await this.playSequenceItem(seq);
    }
  }

  private playSequenceItem(seq: { type: string; content?: string; duration: number; style?: string }): Promise<void> {
    return new Promise((resolve) => {
      switch (seq.type) {
        case 'fade':
          this.container.innerHTML = '<div class="fade-screen"></div>';
          setTimeout(resolve, seq.duration);
          break;

        case 'text':
          this.showTypewriterText(seq.content || '', seq.style);
          setTimeout(resolve, seq.duration);
          break;

        case 'outcomes':
          this.showCitizenOutcomes();
          // Wait for user to click continue
          break;

        case 'player_outcomes':
          this.showPlayerOutcomes();
          break;

        case 'review':
          this.showReviewScreen();
          break;

        case 'realworld':
          this.showRealWorldContent();
          break;

        default:
          resolve();
      }

      // For screens that wait for user input, resolve is handled by button clicks
      if (['outcomes', 'player_outcomes', 'review', 'realworld'].includes(seq.type)) {
        // Don't auto-resolve, wait for user interaction
      }
    });
  }

  private showTypewriterText(text: string, style?: string) {
    const styleClass = style ? `text-${style}` : '';
    this.container.innerHTML = `
      <div class="ending-text-screen ${styleClass}">
        <p class="typewriter-text"></p>
      </div>
    `;

    const textEl = this.container.querySelector('.typewriter-text');
    if (!textEl) return;

    let charIndex = 0;
    const typeChar = () => {
      if (charIndex < text.length) {
        textEl.textContent += text[charIndex];
        charIndex++;
        this.typewriterTimeout = window.setTimeout(typeChar, 40);
      }
    };
    typeChar();
  }

  private showCitizenOutcomes() {
    if (!this.endingData) return;

    const outcomes = this.endingData.citizens_flagged;
    const stats = this.endingData.statistics;

    this.container.innerHTML = `
      <div class="ending-outcomes-screen">
        <h2>CITIZEN OUTCOMES</h2>

        <div class="statistics-summary">
          <div class="stat-item">
            <span class="stat-value">${stats.total_citizens_flagged}</span>
            <span class="stat-label">Citizens Flagged</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${stats.lives_disrupted}</span>
            <span class="stat-label">Lives Disrupted</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${stats.families_separated}</span>
            <span class="stat-label">Families Separated</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${stats.detentions_ordered}</span>
            <span class="stat-label">Detentions Ordered</span>
          </div>
        </div>

        <div class="outcomes-list">
          ${outcomes.map(o => this.renderOutcomeSummary(o)).join('')}
        </div>

        <button class="btn-continue">CONTINUE</button>
      </div>
    `;

    this.container.querySelector('.btn-continue')?.addEventListener('click', () => {
      this.currentSequenceIndex++;
      this.startEnding(); // Continue sequence
    });
  }

  private renderOutcomeSummary(outcome: CitizenOutcomeSummary): string {
    const name = outcome.citizen_name.split(' ');
    const formattedName = name.length >= 2
      ? `${name[name.length - 1].toUpperCase()}, ${name.slice(0, -1).join(' ')}`
      : outcome.citizen_name.toUpperCase();

    return `
      <div class="outcome-row">
        <span class="outcome-name">${formattedName}</span>
        <span class="outcome-separator">—</span>
        <span class="outcome-summary">${outcome.one_line_summary}</span>
        <span class="outcome-status">Status: ${outcome.final_status}</span>
      </div>
    `;
  }

  private showPlayerOutcomes() {
    this.container.innerHTML = `
      <div class="ending-player-outcomes-screen">
        <h2>YOUR OUTCOME</h2>

        <div class="timeline-outcomes">
          <div class="timeline-item">
            <span class="timeline-label">1 MONTH</span>
            <p class="timeline-text">Under investigation. Assets frozen pending review. Former colleagues avoid contact.</p>
          </div>
          <div class="timeline-item">
            <span class="timeline-label">6 MONTHS</span>
            <p class="timeline-text">Investigation concluded. No charges filed. Informal blacklist confirmed. Employment applications rejected without explanation.</p>
          </div>
          <div class="timeline-item">
            <span class="timeline-label">1 YEAR</span>
            <p class="timeline-text">Social connections distancing. Rental applications flagged. You understand now what it feels like. You understand why privacy mattered.</p>
          </div>
        </div>

        <button class="btn-continue">CONTINUE</button>
      </div>
    `;

    this.container.querySelector('.btn-continue')?.addEventListener('click', () => {
      this.showRealWorldContent();
    });
  }

  private showReviewScreen() {
    // This is a simplified version - the full OperatorReviewScreen is shown before ending
    this.container.innerHTML = `
      <div class="ending-review-screen">
        <h2>OPERATOR REVIEW COMPLETE</h2>
        <p>Your access has been revoked.</p>
        <button class="btn-continue">CONTINUE</button>
      </div>
    `;

    this.container.querySelector('.btn-continue')?.addEventListener('click', () => {
      this.currentSequenceIndex++;
    });
  }

  private showRealWorldContent() {
    if (!this.endingData) return;

    // Note: endingData contains real_world_content and educational_links
    // Currently using hardcoded examples below for consistent messaging

    this.container.innerHTML = `
      <div class="ending-realworld-screen">
        <div class="realworld-header">
          <h2>THIS IS NOT FICTION</h2>
        </div>

        <div class="realworld-body">
          <p class="realworld-intro">The systems depicted in this game exist today.</p>

          <div class="realworld-examples">
            <div class="example-item">
              <h3>CHAT CONTROL (EU, 2024)</h3>
              <p>Proposed legislation requiring platforms to scan all private messages. Critics call it "the end of encryption in Europe."</p>
              <span class="example-status">Status: Under debate.</span>
            </div>

            <div class="example-item">
              <h3>PALANTIR GOTHAM</h3>
              <p>Used by law enforcement across the US and Europe to build profiles on individuals from dozens of data sources.</p>
              <span class="example-status">Status: Active. Expanding.</span>
            </div>

          <p class="realworld-call-to-action">
            The laws being debated right now determine which future we get.
          </p>
        </div>

        <div class="realworld-actions">
          <button class="btn-learn-more">LEARN MORE</button>
          <button class="btn-take-action">TAKE ACTION</button>
        </div>

        <div class="realworld-links" style="display: none;">
          <h3>Resources</h3>
          <div class="links-grid">
            <a href="https://www.eff.org" target="_blank" rel="noopener">EFF (Electronic Frontier Foundation)</a>
            <a href="https://edri.org" target="_blank" rel="noopener">EDRi (European Digital Rights)</a>
            <a href="https://privacyinternational.org" target="_blank" rel="noopener">Privacy International</a>
            <a href="https://www.aclu.org" target="_blank" rel="noopener">ACLU</a>
          </div>
          <h3>Take Action</h3>
          <div class="links-grid">
            <a href="https://www.europarl.europa.eu/meps/en/home" target="_blank" rel="noopener">Contact EU Representatives</a>
            <a href="https://stopscanningme.eu" target="_blank" rel="noopener">Stop Scanning Me Campaign</a>
          </div>
        </div>

        <div class="ending-footer">
          <button class="btn-return-menu">RETURN TO MENU</button>
        </div>
      </div>
    `;

    // Toggle links visibility
    const learnMoreBtn = this.container.querySelector('.btn-learn-more');
    const takeActionBtn = this.container.querySelector('.btn-take-action');
    const linksSection = this.container.querySelector('.realworld-links') as HTMLElement;

    learnMoreBtn?.addEventListener('click', () => {
      linksSection.style.display = linksSection.style.display === 'none' ? 'block' : 'none';
    });

    takeActionBtn?.addEventListener('click', () => {
      linksSection.style.display = linksSection.style.display === 'none' ? 'block' : 'none';
    });

    this.container.querySelector('.btn-return-menu')?.addEventListener('click', () => {
      this.acknowledgeAndReturn();
    });
  }

  private async acknowledgeAndReturn() {
    if (this.operatorId) {
      // TODO: Track ending acknowledgment in GameStore if needed
      console.log('Ending acknowledged for operator:', this.operatorId);
    }
    this.returnToMenu();
  }

  private returnToMenu() {
    this.cleanup();
    this.scene.start('MainMenuScene');
  }

  private cleanup() {
    if (this.typewriterTimeout) {
      window.clearTimeout(this.typewriterTimeout);
    }
    if (this.container) {
      this.container.remove();
    }
  }

  shutdown() {
    this.cleanup();
  }
}
