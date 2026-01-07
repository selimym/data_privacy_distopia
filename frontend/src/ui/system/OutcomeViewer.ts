/**
 * OutcomeViewer - Consequence Timeline Viewer
 *
 * Shows the escalating human cost of surveillance decisions
 * over time: immediate, 1 month, 6 months, 1 year.
 *
 * This is the emotional core of System Mode - players see
 * how their decisions destroy lives.
 */

import type { CitizenOutcome } from '../../types/system';
import * as api from '../../api/system';

export type TimePoint = 'immediate' | '1_month' | '6_months' | '1_year';

export interface OutcomeViewerConfig {
  flagId: string;
  citizenName: string;
  onClose: () => void;
}

export class OutcomeViewer {
  private overlay: HTMLDivElement;
  private config: OutcomeViewerConfig;
  private currentTimePoint: TimePoint = 'immediate';
  private outcomes: Map<TimePoint, CitizenOutcome> = new Map();
  private isLoading: boolean = false;

  constructor(config: OutcomeViewerConfig) {
    this.config = config;
    this.overlay = this.createViewer();
    document.body.appendChild(this.overlay);

    // Load immediate outcome
    this.loadOutcome('immediate');

    // Animate in
    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
    });
  }

  private createViewer(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'outcome-viewer-overlay';
    overlay.innerHTML = this.getViewerHTML();
    this.setupEventListeners(overlay);
    return overlay;
  }

  private getViewerHTML(): string {
    return `
      <div class="outcome-viewer-modal">
        <div class="viewer-header">
          <h2>SUBJECT OUTCOME PROJECTION</h2>
          <div class="subject-name">${this.formatName(this.config.citizenName)}</div>
        </div>

        <div class="timeline-section">
          <h3>TIMELINE</h3>
          <div class="timeline-bar">
            <button class="timeline-point active" data-time="immediate">
              <span class="point-marker"></span>
              <span class="point-label">IMMEDIATE</span>
            </button>
            <div class="timeline-connector"></div>
            <button class="timeline-point" data-time="1_month">
              <span class="point-marker"></span>
              <span class="point-label">1 MONTH</span>
            </button>
            <div class="timeline-connector"></div>
            <button class="timeline-point" data-time="6_months">
              <span class="point-marker"></span>
              <span class="point-label">6 MONTHS</span>
            </button>
            <div class="timeline-connector"></div>
            <button class="timeline-point" data-time="1_year">
              <span class="point-marker"></span>
              <span class="point-label">1 YEAR</span>
            </button>
          </div>
        </div>

        <div class="outcome-content">
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading outcome projection...</p>
          </div>
        </div>

        <div class="viewer-footer">
          <p class="footer-hint">Click a time point to see projected outcome.</p>
          <button class="btn-close-viewer">CLOSE</button>
        </div>
      </div>
    `;
  }

  private async loadOutcome(timePoint: TimePoint) {
    if (this.isLoading) return;

    // Check cache first
    if (this.outcomes.has(timePoint)) {
      this.renderOutcome(timePoint);
      return;
    }

    this.isLoading = true;
    this.showLoadingState();

    try {
      const outcome = await api.getFlagOutcome(this.config.flagId, timePoint);
      this.outcomes.set(timePoint, outcome);
      this.renderOutcome(timePoint);
    } catch (error) {
      console.error('Failed to load outcome:', error);
      this.showErrorState();
    } finally {
      this.isLoading = false;
    }
  }

  private showLoadingState() {
    const content = this.overlay.querySelector('.outcome-content');
    if (content) {
      content.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading outcome projection...</p>
        </div>
      `;
    }
  }

  private showErrorState() {
    const content = this.overlay.querySelector('.outcome-content');
    if (content) {
      content.innerHTML = `
        <div class="error-state">
          <p>Failed to load outcome projection.</p>
          <button class="btn-retry">Retry</button>
        </div>
      `;

      const retryBtn = content.querySelector('.btn-retry');
      retryBtn?.addEventListener('click', () => {
        this.loadOutcome(this.currentTimePoint);
      });
    }
  }

  private renderOutcome(timePoint: TimePoint) {
    this.currentTimePoint = timePoint;
    const outcome = this.outcomes.get(timePoint);

    if (!outcome) return;

    // Update timeline active state
    const points = this.overlay.querySelectorAll('.timeline-point');
    points.forEach(point => {
      const pointTime = point.getAttribute('data-time');
      point.classList.toggle('active', pointTime === timePoint);
      point.classList.toggle('visited', this.outcomes.has(pointTime as TimePoint));
    });

    const content = this.overlay.querySelector('.outcome-content');
    if (!content) return;

    const isLastTimePoint = timePoint === '1_year';

    content.innerHTML = `
      <div class="outcome-details ${timePoint}">
        <div class="outcome-header">
          <span class="time-label">${this.formatTimeLabel(timePoint)}</span>
          <span class="status-badge status-${outcome.status.toLowerCase().replace(/\s+/g, '-')}">
            ${outcome.status}
          </span>
        </div>

        <div class="outcome-narrative">
          ${this.formatNarrative(outcome.narrative)}
        </div>

        ${this.renderStatistics(outcome.statistics)}

        ${isLastTimePoint ? this.renderFinalQuote(outcome) : ''}
      </div>
    `;
  }

  private formatNarrative(narrative: string): string {
    // Split into paragraphs and add emphasis to key phrases
    const paragraphs = narrative.split('\n').filter(p => p.trim());

    return paragraphs.map(p => {
      // Highlight concerning phrases
      let formatted = p
        .replace(/(terminated|denied|failed|rejected|suspended)/gi,
          '<span class="negative-highlight">$1</span>')
        .replace(/(increased|flagged|reduced|decreased|searched)/gi,
          '<span class="warning-highlight">$1</span>')
        .replace(/(depression|anxiety|fear|afraid|worried)/gi,
          '<span class="emotional-highlight">$1</span>')
        .replace(/(\d+%)/g, '<span class="stat-highlight">$1</span>')
        .replace(/(risk score increased to \d+)/gi,
          '<span class="danger-highlight">$1</span>');

      return `<p>${formatted}</p>`;
    }).join('');
  }

  private renderStatistics(stats: Record<string, unknown>): string {
    if (!stats || Object.keys(stats).length === 0) return '';

    const statItems = Object.entries(stats)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => {
        const label = this.formatStatLabel(key);
        const formattedValue = this.formatStatValue(key, value);
        return `
          <div class="stat-item">
            <span class="stat-label">${label}</span>
            <span class="stat-value">${formattedValue}</span>
          </div>
        `;
      });

    if (statItems.length === 0) return '';

    return `
      <div class="outcome-statistics">
        <h4>CURRENT STATUS</h4>
        <div class="stats-grid">
          ${statItems.join('')}
        </div>
      </div>
    `;
  }

  private formatStatLabel(key: string): string {
    const labels: Record<string, string> = {
      risk_score: 'Risk Score',
      social_connections: 'Social Connections',
      employment_status: 'Employment',
      housing_status: 'Housing',
      mental_health_flags: 'Mental Health Flags',
      financial_stability: 'Financial Stability',
      movement_pattern: 'Movement Pattern',
      communication_frequency: 'Communication Frequency',
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatStatValue(key: string, value: unknown): string {
    if (typeof value === 'number') {
      if (key.includes('score')) return value.toString();
      if (key.includes('percent') || key.includes('change')) return `${value}%`;
      return value.toString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return String(value);
  }

  private renderFinalQuote(outcome: CitizenOutcome): string {
    // The final quote - the human voice
    const quotes = this.extractQuote(outcome.narrative);

    if (!quotes) {
      return this.getDefaultFinalFrame();
    }

    return `
      <div class="final-quote-frame">
        <div class="quote-content">
          ${quotes}
        </div>
        <div class="quote-attribution">
          — ${this.config.citizenName}, 1 year later
        </div>
      </div>
    `;
  }

  private extractQuote(narrative: string): string | null {
    // Try to find quoted text in the narrative
    const quoteMatch = narrative.match(/"([^"]+)"/g);
    if (quoteMatch && quoteMatch.length > 0) {
      // Return the last (most recent) quote
      return quoteMatch.map(q => `<p>${q}</p>`).join('');
    }
    return null;
  }

  private getDefaultFinalFrame(): string {
    return `
      <div class="final-quote-frame">
        <div class="quote-content">
          <p>"I just wanted to live my life. I don't know what I did."</p>
          <p>"Now I'm afraid to talk to anyone. Afraid to go anywhere."</p>
          <p>"I used to believe in things. Now I just try to be invisible."</p>
        </div>
        <div class="quote-attribution">
          — ${this.config.citizenName}, 1 year later
        </div>
      </div>
    `;
  }

  private formatTimeLabel(timePoint: TimePoint): string {
    const labels: Record<TimePoint, string> = {
      immediate: 'IMMEDIATE',
      '1_month': '1 MONTH LATER',
      '6_months': '6 MONTHS LATER',
      '1_year': '1 YEAR LATER',
    };
    return labels[timePoint];
  }

  private formatName(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[parts.length - 1].toUpperCase()}, ${parts.slice(0, -1).join(' ')}`;
    }
    return name.toUpperCase();
  }

  private setupEventListeners(overlay: HTMLElement) {
    // Timeline point clicks
    const timelinePoints = overlay.querySelectorAll('.timeline-point');
    timelinePoints.forEach(point => {
      point.addEventListener('click', () => {
        const timePoint = point.getAttribute('data-time') as TimePoint;
        if (timePoint) {
          this.loadOutcome(timePoint);
        }
      });
    });

    // Close button
    const closeBtn = overlay.querySelector('.btn-close-viewer');
    closeBtn?.addEventListener('click', () => {
      this.close();
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.close();
    }

    // Arrow key navigation
    const timePoints: TimePoint[] = ['immediate', '1_month', '6_months', '1_year'];
    const currentIndex = timePoints.indexOf(this.currentTimePoint);

    if (e.key === 'ArrowRight' && currentIndex < timePoints.length - 1) {
      this.loadOutcome(timePoints[currentIndex + 1]);
    }
    if (e.key === 'ArrowLeft' && currentIndex > 0) {
      this.loadOutcome(timePoints[currentIndex - 1]);
    }
  };

  public close() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.overlay.classList.remove('visible');
    setTimeout(() => {
      this.overlay.remove();
      this.config.onClose();
    }, 300);
  }
}
