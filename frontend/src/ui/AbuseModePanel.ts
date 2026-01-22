/**
 * Abuse Mode Panel - Bottom Pokemon-style panel
 *
 * Simple panel at bottom of screen for abuse mode actions
 */

import { gameStore } from '../state/GameStore';
import {
  TargetType,
  ConsequenceSeverity,
  type AbuseAction,
  type AbuseExecuteResponse,
} from '../types/abuse';
import { ContentRating } from '../types/npc';
import type { NPCRead } from '../types';
import { ConsequenceViewer } from './ConsequenceViewer';

export class AbuseModePanel {
  private container: HTMLDivElement;
  private selectedTarget: NPCRead | null = null;
  private availableActions: AbuseAction[] = [];
  private lastExecution: AbuseExecuteResponse | null = null;
  private onActionExecuted: ((actionName: string, targetName: string, targetId: string) => void) | null = null;

  constructor(_sessionId: string, onActionExecuted?: (actionName: string, targetName: string, targetId: string) => void) {
    // sessionId not currently used in fat client mode
    this.onActionExecuted = onActionExecuted || null;
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
      // Get all NPCs from GameStore
      const npcs = gameStore.getAllNPCs();
      const targetSelect = this.container.querySelector('#target-select') as HTMLSelectElement;

      // Clear existing options except first
      targetSelect.innerHTML = '<option value="">-- Loading targets... --</option>';
      targetSelect.disabled = true;

      // TODO: Implement client-side rogue employee actions
      // For now, show all NPCs (Rogue Employee Mode not fully implemented)
      const npcsWithActions = npcs;

      // Update dropdown with NPCs
      targetSelect.innerHTML = '<option value="">-- Choose an NPC --</option>';
      targetSelect.disabled = false;

      if (npcsWithActions.length === 0) {
        targetSelect.innerHTML = '<option value="">-- No targets available --</option>';
        targetSelect.disabled = true;
        return;
      }

      npcsWithActions.forEach((npc: NPCRead) => {
        const option = document.createElement('option');
        option.value = npc.id;
        option.textContent = `${npc.first_name} ${npc.last_name}`;
        targetSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to load targets:', error);
      const targetSelect = this.container.querySelector('#target-select') as HTMLSelectElement;
      if (targetSelect) {
        targetSelect.innerHTML = '<option value="">-- Error loading targets --</option>';
        targetSelect.disabled = true;
      }
    }
  }

  private async selectTarget(npcId: string) {
    try {
      // Get NPC from GameStore
      this.selectedTarget = gameStore.getNPC(npcId) || null;

      if (this.selectedTarget) {
        // TODO: Implement client-side rogue employee actions
        // For now, use placeholder actions (Rogue Employee Mode not fully implemented)
        this.availableActions = [
          {
            id: 'placeholder-action',
            role_id: 'rogue_employee',
            action_key: 'view_health_records',
            name: 'View Health Records',
            description: 'Access confidential medical information',
            target_type: TargetType.SPECIFIC_NPC,
            content_rating: ContentRating.SAFE,
            detection_chance: 0.1,
            is_audit_logged: true,
            consequence_severity: ConsequenceSeverity.MEDIUM,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ];
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
      // TODO: Implement client-side abuse action execution
      // For now, create a placeholder response (Rogue Employee Mode not fully implemented)
      this.lastExecution = {
        execution_id: 'placeholder-' + Date.now(),
        action_name: action.name,
        target_name: `${this.selectedTarget.first_name} ${this.selectedTarget.last_name}`,
        immediate_result: `Accessed ${this.selectedTarget.first_name}'s confidential data without authorization`,
        data_revealed: null,
        was_detected: false,
        detection_message: null,
        warning: null,
      };

      // Notify WorldScene that an action was executed
      if (this.onActionExecuted) {
        this.onActionExecuted(
          action.name,
          `${this.selectedTarget.first_name} ${this.selectedTarget.last_name}`,
          this.selectedTarget.id
        );
      }

      // Show immediate result in an automatic modal
      this.showImmediateResultModal();
    } catch (error) {
      console.error('Failed to execute action:', error);
    }
  }

  private showImmediateResultModal() {
    if (!this.lastExecution) return;

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'action-result-overlay';

    const modal = document.createElement('div');
    modal.className = 'action-result-modal';

    modal.innerHTML = `
      <div class="result-modal-content">
        ${
          this.lastExecution.warning
            ? `<div class="result-warning">⚠️ ${this.lastExecution.warning}</div>`
            : ''
        }

        <div class="immediate-result">
          <h3>What Happened</h3>
          <p>${this.lastExecution.immediate_result}</p>
        </div>

        ${
          this.lastExecution.was_detected
            ? `<div class="detection-alert">
                <h4>🚨 DETECTED</h4>
                <p>${this.lastExecution.detection_message}</p>
              </div>`
            : `<div class="detection-success">
                <h4>✓ Not Detected</h4>
                <p>Your action went unnoticed... for now.</p>
              </div>`
        }

        <div class="modal-buttons">
          <button class="btn-primary" id="continue-action">Continue</button>
          <button class="btn-secondary" id="view-consequences">
            View Long-term Consequences
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Attach event listeners
    const continueBtn = modal.querySelector('#continue-action');
    continueBtn?.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    const viewBtn = modal.querySelector('#view-consequences');
    viewBtn?.addEventListener('click', () => {
      document.body.removeChild(overlay);
      if (this.lastExecution) {
        const viewer = new ConsequenceViewer(this.lastExecution.execution_id);
        viewer.show();
      }
    });

    // Click overlay to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  private showActions() {
    const actionsSection = this.container.querySelector('#actions-section') as HTMLElement;
    if (actionsSection) {
      actionsSection.style.display = 'block';
    }
  }

  private hideActions() {
    const actionsSection = this.container.querySelector('#actions-section') as HTMLElement;
    if (actionsSection) {
      actionsSection.style.display = 'none';
    }
  }

  public destroy() {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}
