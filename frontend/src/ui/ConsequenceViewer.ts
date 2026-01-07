/**
 * Consequence Viewer
 *
 * Modal for viewing time-based consequences of abuse actions
 */

import { getConsequences } from '../api/abuse';
import type { ConsequenceChain, TimeSkip } from '../types/abuse';
import { TimeSkip as TimeSkipEnum } from '../types/abuse';

export class ConsequenceViewer {
  private container: HTMLDivElement;
  private executionId: string;
  private currentConsequences: ConsequenceChain | null = null;
  private currentTimeSkip: TimeSkip = TimeSkipEnum.IMMEDIATE;

  constructor(executionId: string) {
    this.executionId = executionId;
    this.container = document.createElement('div');
    this.container.className = 'consequence-viewer-overlay';
    this.init();
  }

  private async init() {
    try {
      await this.loadConsequences(this.currentTimeSkip);
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to load consequences:', error);
      this.renderError();
    }
  }

  private async loadConsequences(timeSkip: TimeSkip) {
    this.currentConsequences = await getConsequences(this.executionId, timeSkip);
    this.currentTimeSkip = timeSkip;
  }

  private render() {
    if (!this.currentConsequences) {
      this.renderError();
      return;
    }

    const timelineHtml = this.renderTimeline();
    const eventsHtml = this.renderEvents();
    const victimImpactHtml = this.renderVictimImpact();
    const realWorldParallelHtml = this.renderRealWorldParallel();

    this.container.innerHTML = `
      <div class="consequence-viewer">
        <div class="consequence-header">
          <h2>Consequences: ${this.formatTimeSkip(this.currentTimeSkip)}</h2>
          <button class="btn-close" id="close-viewer">&times;</button>
        </div>

        <div class="consequence-body">
          ${timelineHtml}
          ${eventsHtml}
          ${victimImpactHtml}
          ${realWorldParallelHtml}

          <div class="your-status">
            <h4>Your Status</h4>
            <p class="status-text">${this.currentConsequences.your_status}</p>
          </div>

          ${this.currentConsequences.victim_statement ? this.renderVictimStatement() : ''}
        </div>

        <div class="consequence-footer">
          <p class="reflection-prompt">This is what you caused.</p>
        </div>
      </div>
    `;
  }

  private renderTimeline(): string {
    if (!this.currentConsequences) return '';

    const timeSkips = this.currentConsequences.time_skips_available;
    const current = this.currentConsequences.current_time_skip;

    return `
      <div class="timeline">
        ${timeSkips
          .map((skip) => {
            const isActive = skip === current;
            const isPast = this.isTimeSkipBefore(skip, current);
            const cssClass = isActive
              ? 'active'
              : isPast
                ? 'past'
                : 'future';

            return `
              <div class="timeline-point ${cssClass}" data-time-skip="${skip}">
                <div class="timeline-marker"></div>
                <div class="timeline-label">${this.formatTimeSkip(skip)}</div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  private renderEvents(): string {
    if (!this.currentConsequences || !this.currentConsequences.events) {
      return '';
    }

    return `
      <div class="events-section">
        <h4>What Happened</h4>
        <ul class="events-list">
          ${this.currentConsequences.events
            .map((event) => `<li>${event}</li>`)
            .join('')}
        </ul>
      </div>
    `;
  }

  private renderVictimImpact(): string {
    if (!this.currentConsequences?.victim_impact) return '';

    return `
      <div class="victim-impact">
        <h4>Impact on Victim</h4>
        <p>${this.currentConsequences.victim_impact}</p>
      </div>
    `;
  }

  private renderVictimStatement(): string {
    if (!this.currentConsequences?.victim_statement) return '';

    return `
      <div class="victim-statement">
        <h4>Victim's Statement</h4>
        <blockquote>${this.currentConsequences.victim_statement}</blockquote>
      </div>
    `;
  }

  private renderRealWorldParallel(): string {
    if (!this.currentConsequences?.real_world_parallel) return '';

    const parallel = this.currentConsequences.real_world_parallel;

    return `
      <div class="real-world-parallel">
        <h4>Real-World Case</h4>
        <div class="case-info">
          <strong>${parallel.case}</strong>
          <p>${parallel.summary}</p>
          <cite>Source: ${parallel.source}</cite>
        </div>
      </div>
    `;
  }

  private renderError() {
    this.container.innerHTML = `
      <div class="consequence-viewer">
        <div class="consequence-header">
          <h2>Error</h2>
          <button class="btn-close" id="close-viewer">&times;</button>
        </div>
        <div class="consequence-body">
          <p>Failed to load consequences. Please try again.</p>
        </div>
      </div>
    `;
    this.attachEventListeners();
  }

  private attachEventListeners() {
    // Close button
    const closeBtn = this.container.querySelector('#close-viewer');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Timeline navigation
    const timelinePoints =
      this.container.querySelectorAll('.timeline-point');
    timelinePoints.forEach((point) => {
      point.addEventListener('click', async () => {
        const timeSkip = (point as HTMLElement).dataset.timeSkip as TimeSkip;
        if (timeSkip) {
          await this.navigateToTimeSkip(timeSkip);
        }
      });
    });

    // Click outside to close
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.hide();
      }
    });
  }

  private async navigateToTimeSkip(timeSkip: TimeSkip) {
    try {
      await this.loadConsequences(timeSkip);
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to navigate to time skip:', error);
    }
  }

  private formatTimeSkip(skip: TimeSkip): string {
    const labels: Record<TimeSkip, string> = {
      [TimeSkipEnum.IMMEDIATE]: 'Immediate',
      [TimeSkipEnum.ONE_WEEK]: '1 Week',
      [TimeSkipEnum.ONE_MONTH]: '1 Month',
      [TimeSkipEnum.SIX_MONTHS]: '6 Months',
      [TimeSkipEnum.ONE_YEAR]: '1 Year',
    };
    return labels[skip] || skip;
  }

  private isTimeSkipBefore(a: TimeSkip, b: TimeSkip): boolean {
    const order = [
      TimeSkipEnum.IMMEDIATE,
      TimeSkipEnum.ONE_WEEK,
      TimeSkipEnum.ONE_MONTH,
      TimeSkipEnum.SIX_MONTHS,
      TimeSkipEnum.ONE_YEAR,
    ];
    return order.indexOf(a) < order.indexOf(b);
  }

  public show() {
    document.body.appendChild(this.container);
  }

  public hide() {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}
