/**
 * PublicMetricsDisplay - International Awareness & Public Anger Tracker
 *
 * Displays two horizontal progress bars tracking escalating consequences:
 * - International Awareness: How much the world knows about the regime's actions
 * - Public Anger: How much domestic population is enraged
 *
 * Uses gradient colors, tier threshold markers, and visual notifications
 * when crossing tier thresholds.
 */

import type { PublicMetricsRead } from '../../types/system';
import { getSystemAudioManager } from '../../audio/SystemAudioManager';

export interface PublicMetricsDisplayConfig {
  metrics?: PublicMetricsRead;  // Optional - may not be loaded yet
  onTierCrossed?: (metric: 'awareness' | 'anger', tier: number) => void;
}

interface TierInfo {
  threshold: number;
  label: string;
  description: string;
}

export class PublicMetricsDisplay {
  private container: HTMLDivElement;
  private config: PublicMetricsDisplayConfig;
  private lastAwarenessTier: number;
  private lastAngerTier: number;

  // Tier thresholds (from backend PublicMetricsService)
  private readonly AWARENESS_TIERS: TierInfo[] = [
    { threshold: 0, label: 'No Coverage', description: 'No international attention' },
    { threshold: 20, label: 'Local Reports', description: 'Regional news coverage begins' },
    { threshold: 40, label: 'National Concern', description: 'National media reporting' },
    { threshold: 60, label: 'International Outcry', description: 'UN statements, diplomatic pressure' },
    { threshold: 80, label: 'Global Condemnation', description: 'Sanctions, international isolation' },
    { threshold: 95, label: 'War Crimes Tribunal', description: 'ICC investigation launched' }
  ];

  private readonly ANGER_TIERS: TierInfo[] = [
    { threshold: 0, label: 'Quiet', description: 'Population subdued' },
    { threshold: 20, label: 'Murmurs', description: 'Private discontent spreading' },
    { threshold: 40, label: 'Discontent', description: 'Public complaints visible' },
    { threshold: 60, label: 'Unrest', description: 'Protests forming' },
    { threshold: 80, label: 'Outrage', description: 'Large-scale demonstrations' },
    { threshold: 95, label: 'Revolutionary', description: 'Revolutionary conditions reached' }
  ];

  constructor(config: PublicMetricsDisplayConfig) {
    this.config = config;
    this.lastAwarenessTier = config.metrics?.awareness_tier ?? 0;
    this.lastAngerTier = config.metrics?.anger_tier ?? 0;
    this.container = this.createDisplay();
  }

  private createDisplay(): HTMLDivElement {
    const display = document.createElement('div');
    display.className = 'public-metrics-display';
    display.innerHTML = this.getDisplayHTML();
    this.setupEventListeners(display);
    return display;
  }

  private getDisplayHTML(): string {
    // Handle loading state
    if (!this.config.metrics) {
      return `
        <div class="metrics-header">
          <h3>PUBLIC BACKLASH METRICS</h3>
          <div class="classification-badge">INTELLIGENCE</div>
        </div>
        <div class="metrics-loading">Loading metrics...</div>
      `;
    }

    const { international_awareness, public_anger, awareness_tier, anger_tier } = this.config.metrics;

    return `
      <div class="metrics-header">
        <h3>PUBLIC BACKLASH METRICS</h3>
        <div class="classification-badge">INTELLIGENCE</div>
      </div>

      <div class="metric-row">
        <div class="metric-label">
          <span class="metric-icon awareness-icon">🌍</span>
          <div>
            <div class="metric-name">International Awareness</div>
            <div class="metric-tier">Tier ${awareness_tier}: ${this.getAwarenessTierLabel(awareness_tier)}</div>
          </div>
        </div>
        <div class="metric-bar-container">
          ${this.renderProgressBar('awareness', international_awareness, awareness_tier)}
        </div>
        <div class="metric-value">${international_awareness}</div>
      </div>

      <div class="metric-row">
        <div class="metric-label">
          <span class="metric-icon anger-icon">🔥</span>
          <div>
            <div class="metric-name">Public Anger</div>
            <div class="metric-tier">Tier ${anger_tier}: ${this.getAngerTierLabel(anger_tier)}</div>
          </div>
        </div>
        <div class="metric-bar-container">
          ${this.renderProgressBar('anger', public_anger, anger_tier)}
        </div>
        <div class="metric-value">${public_anger}</div>
      </div>

      <div class="metrics-footer">
        <span class="warning-icon">⚠</span>
        <span class="warning-text">Higher metrics increase likelihood of protests, news coverage, and exposure</span>
      </div>
    `;
  }

  private renderProgressBar(type: 'awareness' | 'anger', value: number, tier: number): string {
    const tiers = type === 'awareness' ? this.AWARENESS_TIERS : this.ANGER_TIERS;

    return `
      <div class="progress-bar ${type}-bar" data-metric-type="${type}">
        <div class="progress-fill ${type}-fill" style="width: ${value}%"></div>
        ${this.renderTierMarkers(tiers)}
      </div>
    `;
  }

  private renderTierMarkers(tiers: TierInfo[]): string {
    return tiers
      .filter(tier => tier.threshold > 0)
      .map(tier => `
        <div
          class="tier-marker"
          style="left: ${tier.threshold}%"
          data-threshold="${tier.threshold}"
          data-label="${tier.label}"
          data-description="${tier.description}"
          title="${tier.label} (${tier.threshold}): ${tier.description}"
        >
          <div class="marker-line"></div>
        </div>
      `)
      .join('');
  }

  private getAwarenessTierLabel(tier: number): string {
    return this.AWARENESS_TIERS[tier]?.label ?? 'Unknown';
  }

  private getAngerTierLabel(tier: number): string {
    return this.ANGER_TIERS[tier]?.label ?? 'Unknown';
  }

  private setupEventListeners(display: HTMLDivElement): void {
    // Hover effects for tier markers
    const markers = display.querySelectorAll('.tier-marker');
    markers.forEach(marker => {
      marker.addEventListener('mouseenter', () => {
        marker.classList.add('highlighted');
      });
      marker.addEventListener('mouseleave', () => {
        marker.classList.remove('highlighted');
      });
    });
  }

  /**
   * Update metrics and check for tier crossings
   */
  public update(newMetrics: PublicMetricsRead): void {
    this.config.metrics = newMetrics;

    // Check for tier crossings
    if (newMetrics.awareness_tier > this.lastAwarenessTier) {
      this.handleTierCrossing('awareness', newMetrics.awareness_tier);
      this.lastAwarenessTier = newMetrics.awareness_tier;
    }

    if (newMetrics.anger_tier > this.lastAngerTier) {
      this.handleTierCrossing('anger', newMetrics.anger_tier);
      this.lastAngerTier = newMetrics.anger_tier;
    }

    // Update visual
    this.container.innerHTML = this.getDisplayHTML();
    this.setupEventListeners(this.container);
  }

  /**
   * Handle tier threshold crossing - flash bar and show notification
   */
  private handleTierCrossing(metric: 'awareness' | 'anger', newTier: number): void {
    // Play alert sound
    getSystemAudioManager().play('alert_high');

    // Flash the progress bar
    const bar = this.container.querySelector(`.${metric}-bar`);
    if (bar) {
      bar.classList.add('tier-crossed');
      setTimeout(() => bar.classList.remove('tier-crossed'), 2000);
    }

    // Trigger callback
    if (this.config.onTierCrossed) {
      this.config.onTierCrossed(metric, newTier);
    }
  }

  /**
   * Manually trigger tier crossing notification (for initial display)
   */
  public flashBar(metric: 'awareness' | 'anger'): void {
    const bar = this.container.querySelector(`.${metric}-bar`);
    if (bar) {
      bar.classList.add('tier-crossed');
      setTimeout(() => bar.classList.remove('tier-crossed'), 1000);
    }
  }

  public getContainer(): HTMLDivElement {
    return this.container;
  }

  public destroy(): void {
    this.container.remove();
  }
}
