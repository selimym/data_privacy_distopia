/**
 * Time Progression UI
 *
 * Allows players to advance time in the game to see consequences unfold
 */

import type { TimeSkip } from '../types/abuse';
import { TimeSkip as TimeSkipEnum } from '../types/abuse';

export class TimeProgressionUI {
  private container: HTMLDivElement;
  private currentTime: TimeSkip = TimeSkipEnum.IMMEDIATE;
  private onTimeAdvanced: ((newTime: TimeSkip) => void) | null = null;

  constructor(onTimeAdvanced?: (newTime: TimeSkip) => void) {
    this.onTimeAdvanced = onTimeAdvanced || null;
    this.container = document.createElement('div');
    this.container.className = 'time-progression-ui';
    this.render();
  }

  private render() {
    const timeSteps: Array<{ key: TimeSkip; label: string; description: string }> = [
      { key: TimeSkipEnum.IMMEDIATE, label: 'Now', description: 'Immediate consequences' },
      { key: TimeSkipEnum.ONE_WEEK, label: '1 Week', description: 'One week later' },
      { key: TimeSkipEnum.ONE_MONTH, label: '1 Month', description: 'One month later' },
      { key: TimeSkipEnum.SIX_MONTHS, label: '6 Months', description: 'Six months later' },
      { key: TimeSkipEnum.ONE_YEAR, label: '1 Year', description: 'One year later' },
    ];

    const currentIndex = timeSteps.findIndex((step) => step.key === this.currentTime);
    const nextStep = currentIndex < timeSteps.length - 1 ? timeSteps[currentIndex + 1] : null;

    this.container.innerHTML = `
      <div class="time-progression-header">
        <div class="current-time-display">
          <span class="time-icon">⏰</span>
          <div class="time-info">
            <div class="time-label">Current Time</div>
            <div class="time-value">${timeSteps[currentIndex].label}</div>
          </div>
        </div>
      </div>

      <div class="time-progression-body">
        ${
          nextStep
            ? `
          <div class="next-time-info">
            <p class="advancement-prompt">
              Ready to see what happens over time?
            </p>
            <button class="btn-advance-time" id="advance-time-btn">
              ⏩ Advance to ${nextStep.label}
            </button>
            <p class="advancement-description">
              ${nextStep.description}
            </p>
          </div>
        `
            : `
          <div class="end-of-time">
            <p class="final-time-message">
              You've reached the end of the timeline.<br/>
              All long-term consequences have unfolded.
            </p>
          </div>
        `
        }

        <div class="time-timeline">
          ${timeSteps
            .map((step, index) => {
              const isPast = index < currentIndex;
              const isCurrent = index === currentIndex;
              const cssClass = isCurrent ? 'current' : isPast ? 'past' : 'future';

              return `
                <div class="timeline-step ${cssClass}" data-time-skip="${step.key}">
                  <div class="timeline-dot"></div>
                  <div class="timeline-step-label">${step.label}</div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners() {
    const advanceBtn = this.container.querySelector('#advance-time-btn');
    if (advanceBtn) {
      advanceBtn.addEventListener('click', () => {
        this.advanceTime();
      });
    }

    // Allow clicking on timeline steps to view that time period
    const timelineSteps = this.container.querySelectorAll('.timeline-step');
    timelineSteps.forEach((step) => {
      step.addEventListener('click', () => {
        const timeSkip = (step as HTMLElement).dataset.timeSkip as TimeSkip;
        if (timeSkip) {
          this.jumpToTime(timeSkip);
        }
      });
    });
  }

  private advanceTime() {
    const timeOrder = [
      TimeSkipEnum.IMMEDIATE,
      TimeSkipEnum.ONE_WEEK,
      TimeSkipEnum.ONE_MONTH,
      TimeSkipEnum.SIX_MONTHS,
      TimeSkipEnum.ONE_YEAR,
    ];

    const currentIndex = timeOrder.indexOf(this.currentTime);
    if (currentIndex < timeOrder.length - 1) {
      this.currentTime = timeOrder[currentIndex + 1];
      this.render();

      if (this.onTimeAdvanced) {
        this.onTimeAdvanced(this.currentTime);
      }
    }
  }

  private jumpToTime(timeSkip: TimeSkip) {
    // Only allow jumping to past or current time
    const timeOrder = [
      TimeSkipEnum.IMMEDIATE,
      TimeSkipEnum.ONE_WEEK,
      TimeSkipEnum.ONE_MONTH,
      TimeSkipEnum.SIX_MONTHS,
      TimeSkipEnum.ONE_YEAR,
    ];

    const targetIndex = timeOrder.indexOf(timeSkip);
    const currentIndex = timeOrder.indexOf(this.currentTime);

    if (targetIndex <= currentIndex) {
      this.currentTime = timeSkip;
      this.render();

      if (this.onTimeAdvanced) {
        this.onTimeAdvanced(this.currentTime);
      }
    }
  }

  public getCurrentTime(): TimeSkip {
    return this.currentTime;
  }

  public show() {
    document.body.appendChild(this.container);
  }

  public hide() {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }

  public destroy() {
    this.hide();
  }
}
