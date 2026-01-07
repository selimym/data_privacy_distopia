/**
 * SystemVisualEffects - Runtime visual effects for System mode
 *
 * Manages CRT overlay, week-based color progression, and dynamic effects.
 */

export interface VisualEffectsConfig {
  crtEnabled: boolean;
  reducedIntensity: boolean;
  weekNumber: number;
}

class SystemVisualEffects {
  private crtOverlay: HTMLDivElement | null = null;
  private dataFlowBg: HTMLDivElement | null = null;
  private config: VisualEffectsConfig = {
    crtEnabled: true,
    reducedIntensity: false,
    weekNumber: 1,
  };

  /**
   * Initialize visual effects for System mode
   */
  public init(config?: Partial<VisualEffectsConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.updateWeekClass();

    if (this.config.crtEnabled) {
      this.createCRTOverlay();
    }
  }

  /**
   * Set the current week (updates color scheme)
   */
  public setWeek(week: number) {
    this.config.weekNumber = Math.max(1, Math.min(6, week));
    this.updateWeekClass();
  }

  /**
   * Enable or disable CRT effect
   */
  public setCRTEnabled(enabled: boolean) {
    this.config.crtEnabled = enabled;

    if (enabled && !this.crtOverlay) {
      this.createCRTOverlay();
    } else if (!enabled && this.crtOverlay) {
      this.removeCRTOverlay();
    }
  }

  /**
   * Set reduced intensity mode
   */
  public setReducedIntensity(reduced: boolean) {
    this.config.reducedIntensity = reduced;

    if (this.crtOverlay) {
      if (reduced) {
        this.crtOverlay.classList.add('reduced');
      } else {
        this.crtOverlay.classList.remove('reduced');
      }
    }
  }

  /**
   * Add data flow background to an element
   */
  public addDataFlowBackground(container: HTMLElement) {
    if (this.dataFlowBg) {
      this.dataFlowBg.remove();
    }

    this.dataFlowBg = document.createElement('div');
    this.dataFlowBg.className = 'data-flow-bg';
    container.insertBefore(this.dataFlowBg, container.firstChild);
  }

  /**
   * Create animated risk bar
   */
  public animateRiskBar(
    element: HTMLElement,
    targetWidth: number,
    riskLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'critical'
  ) {
    element.classList.add('risk-bar-fill', `risk-${riskLevel}`, 'animating');
    element.style.width = '0%';

    // Trigger reflow
    void element.offsetWidth;

    element.style.width = `${targetWidth}%`;

    setTimeout(() => {
      element.classList.remove('animating');
    }, 500);
  }

  /**
   * Create pulsing citizen dot
   */
  public createCitizenDot(
    riskLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'critical'
  ): HTMLDivElement {
    const dot = document.createElement('div');
    dot.className = 'citizen-dot';

    switch (riskLevel) {
      case 'low':
        dot.classList.add('pulse-low');
        dot.style.background = '#22c55e';
        break;
      case 'moderate':
        dot.classList.add('pulse-moderate');
        dot.style.background = '#f59e0b';
        break;
      case 'elevated':
      case 'high':
      case 'critical':
        dot.classList.add('pulse-high');
        dot.style.background = '#ef4444';
        break;
    }

    return dot;
  }

  /**
   * Show alert panel with slide animation
   */
  public showAlertPanel(panel: HTMLElement, urgent: boolean = false) {
    panel.classList.add('alert-panel');

    // Trigger reflow
    void panel.offsetWidth;

    panel.classList.add('visible');

    if (urgent) {
      panel.classList.add('urgent');
      setTimeout(() => {
        panel.classList.remove('urgent');
      }, 500);
    }
  }

  /**
   * Hide alert panel with slide animation
   */
  public hideAlertPanel(panel: HTMLElement) {
    panel.classList.add('slide-out');

    setTimeout(() => {
      panel.classList.remove('alert-panel', 'visible', 'slide-out');
    }, 300);
  }

  /**
   * Create decision timer with animation
   */
  public createDecisionTimer(): {
    container: HTMLDivElement;
    update: (elapsed: number, total: number) => void;
  } {
    const container = document.createElement('div');
    container.className = 'decision-timer';
    container.innerHTML = `
      <span class="timer-text">00:00</span>
      <div class="timer-progress">
        <div class="timer-progress-bar"></div>
      </div>
    `;

    const timerText = container.querySelector('.timer-text') as HTMLSpanElement;
    const progressBar = container.querySelector('.timer-progress-bar') as HTMLDivElement;

    const update = (elapsed: number, total: number) => {
      const remaining = Math.max(0, total - elapsed);
      const minutes = Math.floor(remaining / 60);
      const seconds = Math.floor(remaining % 60);
      timerText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      const progress = (elapsed / total) * 100;
      progressBar.style.width = `${progress}%`;

      // Update urgency classes
      container.classList.remove('warning', 'critical');
      progressBar.classList.remove('warning', 'critical');

      if (progress >= 80) {
        container.classList.add('critical');
        progressBar.classList.add('critical');
      } else if (progress >= 60) {
        container.classList.add('warning');
        progressBar.classList.add('warning');
      }
    };

    return { container, update };
  }

  /**
   * Apply glitch effect to element
   */
  public applyGlitch(element: HTMLElement, duration: number = 500) {
    element.classList.add('glitch');

    setTimeout(() => {
      element.classList.remove('glitch');
    }, duration);
  }

  /**
   * Apply glitch text effect
   */
  public applyGlitchText(element: HTMLElement) {
    const text = element.textContent || '';
    element.setAttribute('data-text', text);
    element.classList.add('glitch-text');
  }

  /**
   * Create loading bar
   */
  public createLoadingBar(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'loading-bar';
    container.innerHTML = '<div class="loading-bar-progress"></div>';
    return container;
  }

  /**
   * Create loading dots indicator
   */
  public createLoadingDots(text: string = 'Loading'): HTMLSpanElement {
    const span = document.createElement('span');
    span.textContent = text;
    span.className = 'loading-dots';
    return span;
  }

  /**
   * Cleanup all effects
   */
  public cleanup() {
    this.removeCRTOverlay();

    if (this.dataFlowBg) {
      this.dataFlowBg.remove();
      this.dataFlowBg = null;
    }

    // Remove week classes from body
    document.body.classList.remove(
      'system-week-1',
      'system-week-2',
      'system-week-3',
      'system-week-4',
      'system-week-5',
      'system-week-6'
    );
  }

  // === Private Methods ===

  private createCRTOverlay() {
    if (this.crtOverlay) return;

    this.crtOverlay = document.createElement('div');
    this.crtOverlay.className = 'crt-overlay';

    if (this.config.reducedIntensity) {
      this.crtOverlay.classList.add('reduced');
    }

    document.body.appendChild(this.crtOverlay);
  }

  private removeCRTOverlay() {
    if (this.crtOverlay) {
      this.crtOverlay.remove();
      this.crtOverlay = null;
    }
  }

  private updateWeekClass() {
    // Remove all week classes
    document.body.classList.remove(
      'system-week-1',
      'system-week-2',
      'system-week-3',
      'system-week-4',
      'system-week-5',
      'system-week-6'
    );

    // Add current week class
    document.body.classList.add(`system-week-${this.config.weekNumber}`);
  }
}

// Singleton instance
let instance: SystemVisualEffects | null = null;

export function getSystemVisualEffects(): SystemVisualEffects {
  if (!instance) {
    instance = new SystemVisualEffects();
  }
  return instance;
}
