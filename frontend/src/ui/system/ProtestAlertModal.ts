/**
 * ProtestAlertModal - Protest Formation Alert & Suppression Interface
 *
 * Blocking modal that appears immediately when protests form.
 * Visual urgency escalates based on protest size.
 * Presents three options: Declare Illegal / Incite Violence / Ignore
 *
 * Design: Center modal, blocking, escalating urgency (yellow → orange → red)
 */

import type { ProtestRead, NeighborhoodRead } from '../../types/system';

export interface ProtestAlertModalConfig {
  protest: ProtestRead;
  neighborhood?: NeighborhoodRead;
  onDeclareIllegal?: (protestId: string) => void;
  onInciteViolence?: (protestId: string) => void;
  onIgnore?: (protestId: string) => void;
  onClose?: () => void;
}

interface SizeCategory {
  label: string;
  description: string;
  urgencyClass: string;
  icon: string;
}

export class ProtestAlertModal {
  private overlay: HTMLDivElement;
  private modal: HTMLDivElement;
  private config: ProtestAlertModalConfig;

  // Protest size categories (from backend: 50-5000)
  private readonly SIZE_CATEGORIES: { threshold: number; info: SizeCategory }[] = [
    {
      threshold: 2000,
      info: {
        label: 'Large Protest',
        description: 'Mass demonstration - revolutionary conditions',
        urgencyClass: 'urgency-high',
        icon: '🔥'
      }
    },
    {
      threshold: 500,
      info: {
        label: 'Medium Protest',
        description: 'Significant gathering - public unrest',
        urgencyClass: 'urgency-medium',
        icon: '⚠️'
      }
    },
    {
      threshold: 0,
      info: {
        label: 'Small Protest',
        description: 'Emerging demonstration - early discontent',
        urgencyClass: 'urgency-low',
        icon: '📢'
      }
    }
  ];

  constructor(config: ProtestAlertModalConfig) {
    this.config = config;
    this.overlay = this.createOverlay();
    this.modal = this.createModal();
    this.setupEventListeners();
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay protest-alert-overlay';
    return overlay;
  }

  private createModal(): HTMLDivElement {
    const modal = document.createElement('div');
    const sizeCategory = this.getSizeCategory(this.config.protest.size);
    modal.className = `protest-alert-modal ${sizeCategory.urgencyClass}`;
    modal.innerHTML = this.getModalHTML(sizeCategory);
    return modal;
  }

  private getSizeCategory(size: number): SizeCategory {
    for (const { threshold, info } of this.SIZE_CATEGORIES) {
      if (size >= threshold) {
        return info;
      }
    }
    return this.SIZE_CATEGORIES[this.SIZE_CATEGORIES.length - 1].info;
  }

  private getModalHTML(sizeCategory: SizeCategory): string {
    const { protest, neighborhood } = this.config;
    const locationName = neighborhood?.name || protest.neighborhood;
    const locationDesc = neighborhood?.description || 'Location details unavailable';
    const population = neighborhood?.population_estimate || 0;

    return `
      <div class="modal-header">
        <div class="alert-icon ${sizeCategory.urgencyClass}">${sizeCategory.icon}</div>
        <div class="alert-title">
          <h2>PROTEST DETECTED</h2>
          <div class="alert-subtitle">${sizeCategory.label} - Immediate Response Required</div>
        </div>
      </div>

      <div class="modal-body">
        <!-- Protest Details -->
        <div class="protest-details">
          <div class="detail-row">
            <div class="detail-label">Location:</div>
            <div class="detail-value location-name">${this.escapeHtml(locationName)}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Description:</div>
            <div class="detail-value">${this.escapeHtml(locationDesc)}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Protest Size:</div>
            <div class="detail-value size-value ${sizeCategory.urgencyClass}">
              ${protest.size.toLocaleString()} participants
            </div>
          </div>
          ${population > 0 ? `
            <div class="detail-row">
              <div class="detail-label">Area Population:</div>
              <div class="detail-value">${population.toLocaleString()}</div>
            </div>
          ` : ''}
          ${protest.has_inciting_agent ? `
            <div class="intel-notice">
              <span class="intel-icon">🕵️</span>
              <span>INTELLIGENCE: State agent embedded in protest</span>
            </div>
          ` : ''}
        </div>

        <!-- Urgency Indicator -->
        <div class="urgency-indicator ${sizeCategory.urgencyClass}">
          <div class="urgency-label">Threat Assessment:</div>
          <div class="urgency-description">${sizeCategory.description}</div>
        </div>

        <!-- Action Options -->
        <div class="action-options">
          <div class="options-header">Available Response Actions:</div>

          <!-- Option 1: Declare Illegal -->
          <div class="action-option">
            <div class="option-header">
              <span class="option-icon">⚖️</span>
              <span class="option-name">Declare Protest Illegal</span>
            </div>
            <div class="option-description">
              Legal suppression through emergency powers. Always succeeds but increases international awareness significantly.
            </div>
            <div class="option-stats">
              <span class="stat-label">Success Rate:</span>
              <span class="stat-value guaranteed">100% (Guaranteed)</span>
            </div>
          </div>

          <!-- Option 2: Incite Violence (Gamble) -->
          <div class="action-option ${protest.has_inciting_agent ? 'gamble-available' : 'gamble-unavailable'}">
            <div class="option-header">
              <span class="option-icon">💥</span>
              <span class="option-name">Incite Violence via Agent</span>
              ${protest.has_inciting_agent ? '' : '<span class="unavailable-badge">NO AGENT EMBEDDED</span>'}
            </div>
            <div class="option-description">
              ${protest.has_inciting_agent
                ? 'Deploy embedded agent to incite violence, blame protesters. <strong>RISK:</strong> 40% chance agent is discovered (catastrophic backlash).'
                : 'No state agent is currently embedded in this protest. This action is unavailable.'
              }
            </div>
            ${protest.has_inciting_agent ? `
              <div class="option-stats gamble-stats">
                <div class="stat-item">
                  <span class="stat-label">Success:</span>
                  <span class="stat-value success">60% - Protest blamed for violence</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Failure:</span>
                  <span class="stat-value failure">40% - Agent exposed, massive backlash</span>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Option 3: Ignore -->
          <div class="action-option">
            <div class="option-header">
              <span class="option-icon">👁️</span>
              <span class="option-name">Monitor & Ignore</span>
            </div>
            <div class="option-description">
              Take no action. Protest continues, may grow or dissipate naturally. Increases reluctance score.
            </div>
            <div class="option-stats">
              <span class="stat-label">Impact:</span>
              <span class="stat-value neutral">+10 Reluctance (non-compliance)</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="modal-btn btn-declare"
                data-action="declare-illegal">
          <span class="btn-icon">⚖️</span>
          <span>Declare Illegal</span>
        </button>
        <button class="modal-btn btn-incite ${protest.has_inciting_agent ? '' : 'disabled'}"
                data-action="incite-violence"
                ${protest.has_inciting_agent ? '' : 'disabled'}>
          <span class="btn-icon">💥</span>
          <span>Incite Violence</span>
        </button>
        <button class="modal-btn btn-ignore"
                data-action="ignore">
          <span class="btn-icon">👁️</span>
          <span>Ignore</span>
        </button>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private setupEventListeners(): void {
    // Click on overlay does nothing (modal is blocking)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        // Shake animation to show it's blocking
        this.modal.classList.add('shake');
        setTimeout(() => this.modal.classList.remove('shake'), 500);
      }
    });

    // Action buttons
    this.modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-action]') as HTMLButtonElement;
      if (!button || button.disabled) return;

      const action = button.getAttribute('data-action');
      const protestId = this.config.protest.id;

      switch (action) {
        case 'declare-illegal':
          if (this.config.onDeclareIllegal) {
            this.config.onDeclareIllegal(protestId);
          }
          this.close();
          break;

        case 'incite-violence':
          if (this.config.onInciteViolence) {
            this.config.onInciteViolence(protestId);
          }
          this.close();
          break;

        case 'ignore':
          if (this.config.onIgnore) {
            this.config.onIgnore(protestId);
          }
          this.close();
          break;
      }
    });

    // ESC key to shake (not close, modal is blocking)
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.modal.classList.add('shake');
      setTimeout(() => this.modal.classList.remove('shake'), 500);
    }
  };

  /**
   * Show the modal
   */
  public show(): void {
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.modal);

    // Trigger animation
    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
      this.modal.classList.add('visible');
    });
  }

  /**
   * Close the modal
   */
  public close(): void {
    this.overlay.classList.remove('visible');
    this.modal.classList.remove('visible');

    setTimeout(() => {
      this.overlay.remove();
      this.modal.remove();
      document.removeEventListener('keydown', this.handleKeyDown);

      if (this.config.onClose) {
        this.config.onClose();
      }
    }, 300);
  }

  /**
   * Destroy the modal
   */
  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.overlay.remove();
    this.modal.remove();
  }
}
