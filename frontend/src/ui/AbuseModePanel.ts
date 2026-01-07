/**
 * Abuse Mode Panel
 *
 * Main interface for selecting and executing abuse actions
 */

import {
  executeAbuseAction,
  getRoleActions,
  getAbuseRoles,
} from '../api/abuse';
import { listNPCs } from '../api/npcs';
import type {
  AbuseAction,
  AbuseExecuteRequest,
  AbuseExecuteResponse,
  AbuseRole,
} from '../types/abuse';
import type { NPCBasic } from '../types/npc';
import { ConsequenceViewer } from './ConsequenceViewer';

export class AbuseModePanel {
  private container: HTMLDivElement;
  private currentRole: AbuseRole | null = null;
  private selectedTarget: NPCBasic | null = null;
  private selectedAction: AbuseAction | null = null;
  private availableActions: AbuseAction[] = [];
  private sessionId: string;
  private lastExecution: AbuseExecuteResponse | null = null;

  constructor(container: HTMLDivElement, sessionId: string) {
    this.container = container;
    this.sessionId = sessionId;
    this.init();
  }

  private async init() {
    // For now, default to rogue_employee role
    try {
      const roles = await getAbuseRoles();
      this.currentRole = roles.find((r) => r.role_key === 'rogue_employee') || null;
      await this.render();
    } catch (error) {
      console.error('Failed to initialize abuse mode:', error);
      this.renderError('Failed to load abuse mode. Please try again.');
    }
  }

  private async render() {
    if (!this.currentRole) {
      this.renderError('No role selected');
      return;
    }

    this.container.innerHTML = `
      <div class="abuse-mode-panel">
        <div class="abuse-header">
          <div class="role-indicator">
            <span class="role-label">Playing as:</span>
            <span class="role-name">${this.currentRole.display_name}</span>
          </div>
          <button class="btn-exit" id="exit-abuse-mode">Exit Abuse Mode</button>
        </div>

        <div class="abuse-body">
          <section class="target-section">
            <h3>Select Target</h3>
            <div id="target-selector">
              <select id="target-dropdown">
                <option value="">-- Select a target --</option>
              </select>
            </div>
            ${
              this.selectedTarget
                ? `
              <div class="selected-target">
                Target: ${this.selectedTarget.first_name} ${this.selectedTarget.last_name}
              </div>
            `
                : ''
            }
          </section>

          <section class="actions-section">
            <h3>Available Actions</h3>
            <div id="actions-list">
              ${this.renderActionsList()}
            </div>
          </section>

          ${this.selectedAction ? this.renderActionDetail() : ''}
          ${this.lastExecution ? this.renderExecutionResults() : ''}
        </div>
      </div>
    `;

    await this.loadTargets();
    this.attachEventListeners();
  }

  private async loadTargets() {
    try {
      const response = await listNPCs();
      const dropdown = this.container.querySelector(
        '#target-dropdown'
      ) as HTMLSelectElement;

      if (dropdown) {
        // Add NPCs to dropdown
        response.items.forEach((npc: NPCBasic) => {
          const option = document.createElement('option');
          option.value = npc.id;
          option.textContent = `${npc.first_name} ${npc.last_name}`;
          dropdown.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Failed to load targets:', error);
    }
  }

  private renderActionsList(): string {
    if (this.availableActions.length === 0) {
      return '<p class="no-actions">Select a target to see available actions.</p>';
    }

    return `
      <div class="actions-grid">
        ${this.availableActions
          .map(
            (action) => `
          <div class="action-card" data-action-id="${action.id}">
            <div class="action-name">${action.name}</div>
            <div class="action-severity">${action.consequence_severity}</div>
            <div class="action-detection">
              Detection: ${Math.round(action.detection_chance * 100)}%
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  private renderActionDetail(): string {
    if (!this.selectedAction) return '';

    const isHighRisk =
      this.selectedAction.content_rating === 'DISTURBING' ||
      this.selectedAction.content_rating === 'DYSTOPIAN';

    return `
      <section class="action-detail">
        <h3>${this.selectedAction.name}</h3>
        <p class="action-description">${this.selectedAction.description}</p>

        ${
          isHighRisk
            ? `
          <div class="action-warning">
            ⚠️ Warning: This action contains ${this.selectedAction.content_rating.toLowerCase()} content
          </div>
        `
            : ''
        }

        <div class="action-stats">
          <div class="stat">
            <span class="stat-label">Detection Chance:</span>
            <span class="stat-value">${Math.round(this.selectedAction.detection_chance * 100)}%</span>
          </div>
          <div class="stat">
            <span class="stat-label">Severity:</span>
            <span class="stat-value">${this.selectedAction.consequence_severity}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Audit Logged:</span>
            <span class="stat-value">${this.selectedAction.is_audit_logged ? 'Yes' : 'No'}</span>
          </div>
        </div>

        <button class="btn-execute" id="execute-action-btn">Execute Action</button>
      </section>
    `;
  }

  private renderExecutionResults(): string {
    if (!this.lastExecution) return '';

    return `
      <section class="execution-results">
        <h3>Action Executed</h3>

        ${
          this.lastExecution.warning
            ? `
          <div class="result-warning">${this.lastExecution.warning}</div>
        `
            : ''
        }

        <div class="immediate-result">
          <h4>Immediate Result</h4>
          <p>${this.lastExecution.immediate_result}</p>
        </div>

        ${
          this.lastExecution.data_revealed
            ? `
          <div class="data-revealed">
            <h4>Data Revealed</h4>
            <pre>${JSON.stringify(this.lastExecution.data_revealed, null, 2)}</pre>
          </div>
        `
            : ''
        }

        ${
          this.lastExecution.was_detected
            ? `
          <div class="detection-alert">
            🚨 DETECTED: ${this.lastExecution.detection_message}
          </div>
        `
            : `
          <div class="detection-success">
            ✓ Not detected
          </div>
        `
        }

        <button class="btn-primary" id="view-consequences-btn">
          View Consequences Over Time
        </button>
      </section>
    `;
  }

  private renderError(message: string) {
    this.container.innerHTML = `
      <div class="abuse-mode-error">
        <h3>Error</h3>
        <p>${message}</p>
      </div>
    `;
  }

  private attachEventListeners() {
    // Target selection
    const dropdown = this.container.querySelector(
      '#target-dropdown'
    ) as HTMLSelectElement;
    if (dropdown) {
      dropdown.addEventListener('change', async (e) => {
        const targetId = (e.target as HTMLSelectElement).value;
        if (targetId) {
          await this.selectTarget(targetId);
        }
      });
    }

    // Action selection
    const actionCards = this.container.querySelectorAll('.action-card');
    actionCards.forEach((card) => {
      card.addEventListener('click', () => {
        const actionId = (card as HTMLElement).dataset.actionId;
        if (actionId) {
          this.selectAction(actionId);
        }
      });
    });

    // Execute action
    const executeBtn = this.container.querySelector('#execute-action-btn');
    if (executeBtn) {
      executeBtn.addEventListener('click', () => this.executeAction());
    }

    // View consequences
    const viewConsequencesBtn = this.container.querySelector(
      '#view-consequences-btn'
    );
    if (viewConsequencesBtn) {
      viewConsequencesBtn.addEventListener('click', () => {
        if (this.lastExecution) {
          this.showConsequenceViewer(this.lastExecution.execution_id);
        }
      });
    }

    // Exit abuse mode
    const exitBtn = this.container.querySelector('#exit-abuse-mode');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        // TODO: Emit event to exit abuse mode
        console.log('Exit abuse mode');
      });
    }
  }

  private async selectTarget(targetId: string) {
    try {
      const response = await listNPCs();
      this.selectedTarget = response.items.find((npc: NPCBasic) => npc.id === targetId) || null;

      if (this.selectedTarget && this.currentRole) {
        // Load available actions for this target
        this.availableActions = await getRoleActions(
          this.currentRole.role_key,
          targetId
        );
      }

      await this.render();
    } catch (error) {
      console.error('Failed to select target:', error);
    }
  }

  private selectAction(actionId: string) {
    this.selectedAction =
      this.availableActions.find((a) => a.id === actionId) || null;
    this.render();
  }

  private async executeAction() {
    if (!this.currentRole || !this.selectedAction || !this.selectedTarget) {
      console.error('Missing required data for execution');
      return;
    }

    try {
      const request: AbuseExecuteRequest = {
        role_key: this.currentRole.role_key,
        action_key: this.selectedAction.action_key,
        target_npc_id: this.selectedTarget.id,
      };

      this.lastExecution = await executeAbuseAction(request, this.sessionId);
      await this.render();
    } catch (error) {
      console.error('Failed to execute action:', error);
      // TODO: Show error message to user
    }
  }

  private showConsequenceViewer(executionId: string) {
    const viewer = new ConsequenceViewer(executionId);
    viewer.show();
  }

  public destroy() {
    this.container.innerHTML = '';
  }
}
