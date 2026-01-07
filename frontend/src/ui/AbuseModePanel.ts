/**
 * Abuse Mode Panel - Bottom Pokemon-style panel
 *
 * Simple panel at bottom of screen for abuse mode actions
 */

import {
  executeAbuseAction,
  getRoleActions,
} from '../api/abuse';
import { listNPCs } from '../api/npcs';
import type {
  AbuseAction,
  AbuseExecuteRequest,
  AbuseExecuteResponse,
} from '../types/abuse';
import type { NPCBasic } from '../types/npc';
import { ConsequenceViewer } from './ConsequenceViewer';

export class AbuseModePanel {
  private container: HTMLDivElement;
  private sessionId: string;
  private selectedTarget: NPCBasic | null = null;
  private availableActions: AbuseAction[] = [];
  private lastExecution: AbuseExecuteResponse | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.container = this.createPanelElement();
    this.setupEventListeners();
  }

  private createPanelElement(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'abuse-panel';
    panel.style.display = 'none'; // Hidden by default

    panel.innerHTML = `
      <button class="close-btn" aria-label="Close abuse mode">×</button>

      <div class="abuse-panel-header">
        <h2>🔴 Rogue Employee Mode</h2>
        <p class="role-description">Medical Records Clerk - Authorized Access</p>
      </div>

      <div class="abuse-panel-content">
        <div class="target-selection">
          <h3>Select Target</h3>
          <select id="target-select" class="target-dropdown">
            <option value="">-- Choose an NPC --</option>
          </select>
        </div>

        <div class="actions-section" id="actions-section" style="display: none;">
          <h3>Available Actions</h3>
          <div id="actions-list"></div>
        </div>

        <div class="results-section" id="results-section" style="display: none;">
          <h3>Result</h3>
          <div id="result-content"></div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    return panel;
  }

  private setupEventListeners() {
    // Close button
    const closeBtn = this.container.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Target selection
    const targetSelect = this.container.querySelector('#target-select') as HTMLSelectElement;
    targetSelect?.addEventListener('change', async (e) => {
      const npcId = (e.target as HTMLSelectElement).value;
      if (npcId) {
        await this.selectTarget(npcId);
      } else {
        this.selectedTarget = null;
        this.hideActions();
      }
    });
  }

  public async show() {
    // Load NPCs
    await this.loadTargets();

    this.container.style.display = 'block';
  }

  public hide() {
    this.container.style.display = 'none';
  }

  private async loadTargets() {
    try {
      const response = await listNPCs();
      const targetSelect = this.container.querySelector('#target-select') as HTMLSelectElement;

      // Clear existing options except first
      targetSelect.innerHTML = '<option value="">-- Choose an NPC --</option>';

      response.items.forEach((npc: NPCBasic) => {
        const option = document.createElement('option');
        option.value = npc.id;
        option.textContent = `${npc.first_name} ${npc.last_name}`;
        targetSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to load targets:', error);
    }
  }

  private async selectTarget(npcId: string) {
    try {
      const response = await listNPCs();
      this.selectedTarget = response.items.find((npc: NPCBasic) => npc.id === npcId) || null;

      if (this.selectedTarget) {
        // Load available actions for this target
        this.availableActions = await getRoleActions('rogue_employee', npcId);
        this.renderActions();
        this.showActions();
      }
    } catch (error) {
      console.error('Failed to select target:', error);
    }
  }

  private renderActions() {
    const actionsList = this.container.querySelector('#actions-list');
    if (!actionsList) return;

    if (this.availableActions.length === 0) {
      actionsList.innerHTML = '<p class="no-actions">No actions available for this target.</p>';
      return;
    }

    actionsList.innerHTML = this.availableActions
      .map(
        (action) => `
        <button class="action-btn" data-action-id="${action.id}">
          <span class="action-name">${action.name}</span>
          <span class="action-severity">${action.consequence_severity}</span>
        </button>
      `
      )
      .join('');

    // Attach click handlers
    const actionButtons = actionsList.querySelectorAll('.action-btn');
    actionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const actionId = (btn as HTMLElement).dataset.actionId;
        if (actionId) {
          this.executeAction(actionId);
        }
      });
    });
  }

  private async executeAction(actionId: string) {
    if (!this.selectedTarget) return;

    const action = this.availableActions.find((a) => a.id === actionId);
    if (!action) return;

    try {
      const request: AbuseExecuteRequest = {
        role_key: 'rogue_employee',
        action_key: action.action_key,
        target_npc_id: this.selectedTarget.id,
      };

      this.lastExecution = await executeAbuseAction(request, this.sessionId);
      this.renderResults();
      this.showResults();
    } catch (error) {
      console.error('Failed to execute action:', error);
    }
  }

  private renderResults() {
    if (!this.lastExecution) return;

    const resultContent = this.container.querySelector('#result-content');
    if (!resultContent) return;

    resultContent.innerHTML = `
      ${
        this.lastExecution.warning
          ? `<div class="result-warning">${this.lastExecution.warning}</div>`
          : ''
      }

      <div class="immediate-result">
        <p>${this.lastExecution.immediate_result}</p>
      </div>

      ${
        this.lastExecution.was_detected
          ? `<div class="detection-alert">🚨 ${this.lastExecution.detection_message}</div>`
          : '<div class="detection-success">✓ Not detected</div>'
      }

      <button class="btn-primary view-consequences-btn" id="view-consequences">
        View Consequences Over Time
      </button>
    `;

    // Attach consequence viewer handler
    const viewBtn = resultContent.querySelector('#view-consequences');
    viewBtn?.addEventListener('click', () => {
      if (this.lastExecution) {
        const viewer = new ConsequenceViewer(this.lastExecution.execution_id);
        viewer.show();
      }
    });
  }

  private showActions() {
    const actionsSection = this.container.querySelector('#actions-section') as HTMLElement;
    if (actionsSection) {
      actionsSection.style.display = 'block';
    }
    this.hideResults();
  }

  private hideActions() {
    const actionsSection = this.container.querySelector('#actions-section') as HTMLElement;
    if (actionsSection) {
      actionsSection.style.display = 'none';
    }
  }

  private showResults() {
    const resultsSection = this.container.querySelector('#results-section') as HTMLElement;
    if (resultsSection) {
      resultsSection.style.display = 'block';
    }
    this.hideActions();
  }

  private hideResults() {
    const resultsSection = this.container.querySelector('#results-section') as HTMLElement;
    if (resultsSection) {
      resultsSection.style.display = 'none';
    }
  }

  public destroy() {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}
