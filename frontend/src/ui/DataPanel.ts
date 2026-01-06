import Phaser from 'phaser';
import { getNPC } from '../api/npcs';
import { getInferences } from '../api/inferences';
import type {
  DomainType,
  NPCWithDomains,
  InferencesResponse,
  InferenceResult,
} from '../types/npc';

export class DataPanel {
  private container: HTMLDivElement;
  private currentNpcId: string | null = null;
  private enabledDomains: Set<DomainType> = new Set();

  constructor(_scene: Phaser.Scene) {
    // scene parameter kept for consistency with Phaser patterns, may be used later
    this.container = this.createPanelElement();
    this.setupEventListeners();
  }

  private createPanelElement(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'data-panel';
    panel.style.display = 'none'; // Hidden by default

    panel.innerHTML = `
      <button class="close-btn" aria-label="Close panel">×</button>

      <div class="disclaimer">
        ⚠️ <strong>FICTIONAL DATA:</strong> All characters, organizations, and data in this game are entirely fictitious. Any resemblance to real persons or entities is purely coincidental.
      </div>

      <h2 class="npc-name">Select an NPC</h2>

      <div class="domain-toggles">
        <h3>Data Domains</h3>
        <label>
          <input type="checkbox" data-domain="health" />
          <span>Health Records</span>
        </label>
        <label>
          <input type="checkbox" data-domain="finance" disabled />
          <span>Financial Data (Coming Soon)</span>
        </label>
        <label>
          <input type="checkbox" data-domain="judicial" disabled />
          <span>Judicial Records (Coming Soon)</span>
        </label>
      </div>

      <div class="domain-content">
        <p class="hint">Enable domains above to see data</p>
      </div>
    `;

    document.body.appendChild(panel);
    return panel;
  }

  private setupEventListeners() {
    // Close button
    const closeBtn = this.container.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Domain checkboxes
    const checkboxes = this.container.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"][data-domain]'
    );

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const domain = target.dataset.domain as DomainType;

        if (target.checked) {
          this.enabledDomains.add(domain);
        } else {
          this.enabledDomains.delete(domain);
        }

        // Re-fetch data with updated domains
        if (this.currentNpcId) {
          this.fetchAndRender(this.currentNpcId);
        }
      });
    });
  }

  async show(npcId: string, enabledDomains: DomainType[] = []) {
    this.currentNpcId = npcId;
    this.enabledDomains = new Set(enabledDomains);

    // Update checkbox states
    this.updateCheckboxStates();

    // Show panel
    this.container.style.display = 'block';

    // Fetch and render data
    await this.fetchAndRender(npcId);
  }

  hide() {
    this.container.style.display = 'none';
    this.currentNpcId = null;
    this.enabledDomains.clear();
    this.updateCheckboxStates();
  }

  async setEnabledDomains(domains: DomainType[]) {
    this.enabledDomains = new Set(domains);
    this.updateCheckboxStates();

    if (this.currentNpcId) {
      await this.fetchAndRender(this.currentNpcId);
    }
  }

  private updateCheckboxStates() {
    const checkboxes = this.container.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"][data-domain]'
    );

    checkboxes.forEach(checkbox => {
      const domain = checkbox.dataset.domain as DomainType;
      checkbox.checked = this.enabledDomains.has(domain);
    });
  }

  private async fetchAndRender(npcId: string) {
    const contentDiv = this.container.querySelector('.domain-content');
    if (!contentDiv) return;

    // Show loading state
    contentDiv.innerHTML = '<p class="loading">Loading data...</p>';

    try {
      const domains = Array.from(this.enabledDomains);
      const [npcData, inferencesData] = await Promise.all([
        getNPC(npcId, domains),
        getInferences(npcId, domains),
      ]);
      this.renderNPCData(npcData, inferencesData);
    } catch (error) {
      console.error('Failed to fetch NPC data:', error);
      contentDiv.innerHTML = `
        <p class="error">Failed to load NPC data. Please try again.</p>
      `;
    }
  }

  private renderNPCData(data: NPCWithDomains, inferencesData: InferencesResponse) {
    const { npc, domains } = data;

    // Update NPC name
    const nameElement = this.container.querySelector('.npc-name');
    if (nameElement) {
      nameElement.textContent = `${npc.first_name} ${npc.last_name}`;
    }

    // Render domain content
    const contentDiv = this.container.querySelector('.domain-content');
    if (!contentDiv) return;

    let html = '';

    // Basic info (always shown)
    html += `
      <div class="basic-info">
        <h3>Basic Information</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Date of Birth:</span>
            <span class="value">${new Date(npc.date_of_birth).toLocaleDateString()}</span>
          </div>
          <div class="info-item">
            <span class="label">Role:</span>
            <span class="value role-${npc.role}">${this.formatRole(npc.role)}</span>
          </div>
          <div class="info-item">
            <span class="label">Address:</span>
            <span class="value">${npc.street_address}, ${npc.city}, ${npc.state} ${npc.zip_code}</span>
          </div>
          <div class="info-item">
            <span class="label">SSN:</span>
            <span class="value sensitive">${npc.ssn}</span>
          </div>
        </div>
      </div>
    `;

    // Health domain
    if (domains.health) {
      const health = domains.health;
      html += `
        <div class="health-domain">
          <h3>Health Records</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Insurance:</span>
              <span class="value">${health.insurance_provider}</span>
            </div>
            <div class="info-item">
              <span class="label">Primary Physician:</span>
              <span class="value">${health.primary_care_physician}</span>
            </div>
          </div>

          ${health.conditions.length > 0 ? `
            <div class="health-section">
              <h4>Conditions</h4>
              <ul class="health-list">
                ${health.conditions.map(c => `
                  <li class="${c.is_sensitive ? 'sensitive' : ''}">
                    <strong>${c.condition_name}</strong>
                    <span class="severity ${c.severity}">${c.severity}</span>
                    ${c.is_chronic ? '<span class="badge">Chronic</span>' : ''}
                    ${c.is_sensitive ? '<span class="badge sensitive">Sensitive</span>' : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          ${health.medications.length > 0 ? `
            <div class="health-section">
              <h4>Medications</h4>
              <ul class="health-list">
                ${health.medications.map(m => `
                  <li class="${m.is_sensitive ? 'sensitive' : ''}">
                    <strong>${m.medication_name}</strong> - ${m.dosage}
                    ${m.is_sensitive ? '<span class="badge sensitive">Sensitive</span>' : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          ${health.visits.length > 0 ? `
            <div class="health-section">
              <h4>Recent Visits</h4>
              <ul class="health-list">
                ${health.visits.slice(0, 5).map(v => `
                  <li class="${v.is_sensitive ? 'sensitive' : ''}">
                    <strong>${new Date(v.visit_date).toLocaleDateString()}</strong> - ${v.reason}
                    <br><small>${v.provider_name}</small>
                    ${v.notes ? `<br><small class="notes">${v.notes}</small>` : ''}
                    ${v.is_sensitive ? '<span class="badge sensitive">Sensitive</span>' : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
    }

    // Inferences section (only if domains are enabled)
    if (this.enabledDomains.size > 0 && inferencesData.inferences.length > 0) {
      html += this.renderInferences(inferencesData.inferences);
    }

    // Unlockable domains preview
    if (inferencesData.unlockable_inferences.length > 0) {
      html += this.renderUnlockablePreview(inferencesData.unlockable_inferences);
    }

    // No domains enabled message
    if (this.enabledDomains.size === 0) {
      html += `
        <div class="hint">
          <p>💡 Enable data domains above to see sensitive information</p>
          <p><small>This simulates gaining unauthorized access to different data sources</small></p>
        </div>
      `;
    }

    contentDiv.innerHTML = html;

    // Setup expand/collapse for inference cards
    this.setupInferenceInteractions();
  }

  private renderInferences(inferences: InferenceResult[]): string {
    return `
      <div class="inferences-section">
        <h3>🔍 Data Fusion Insights</h3>
        <p class="section-desc">What we learned by combining data sources:</p>

        ${inferences.map(inf => this.renderInferenceCard(inf)).join('')}
      </div>
    `;
  }

  private renderInferenceCard(inference: InferenceResult): string {
    const scarinessClass = `scariness-${inference.scariness_level}`;
    const skulls = '💀'.repeat(inference.scariness_level);

    return `
      <div class="inference-card ${scarinessClass}" data-rule-key="${inference.rule_key}">
        <div class="inference-header">
          <div class="inference-title">
            <span class="scariness-indicator" title="Scariness level ${inference.scariness_level}/5">${skulls}</span>
            <h4>${inference.rule_name}</h4>
          </div>
          <div class="inference-confidence">
            <span class="confidence-badge">${Math.round(inference.confidence * 100)}% confidence</span>
          </div>
        </div>

        <div class="inference-body">
          <p class="inference-text">${inference.inference_text}</p>

          <div class="inference-expandable">
            <button class="expand-btn" data-target="evidence-${inference.rule_key}">
              <span class="expand-icon">▶</span> Evidence (${inference.supporting_evidence.length})
            </button>
            <div class="expandable-content" id="evidence-${inference.rule_key}" style="display: none;">
              <ul class="evidence-list">
                ${inference.supporting_evidence.map(ev => `<li>${ev}</li>`).join('')}
              </ul>
            </div>
          </div>

          <div class="inference-expandable">
            <button class="expand-btn" data-target="implications-${inference.rule_key}">
              <span class="expand-icon">▶</span> Implications (${inference.implications.length})
            </button>
            <div class="expandable-content" id="implications-${inference.rule_key}" style="display: none;">
              <ul class="implications-list">
                ${inference.implications.map(imp => `<li>⚠️ ${imp}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderUnlockablePreview(unlockable: any[]): string {
    if (unlockable.length === 0) return '';

    return `
      <div class="unlockable-section">
        <h3>🔓 What You'd Learn</h3>
        <p class="section-desc">Enable more domains to unlock additional insights:</p>

        <div class="unlockable-list">
          ${unlockable.map(item => `
            <div class="unlockable-item">
              <div class="unlockable-header">
                <span class="domain-name">${this.formatDomainName(item.domain)}</span>
                <span class="unlock-count">${item.rule_keys.length} new insight${item.rule_keys.length > 1 ? 's' : ''}</span>
              </div>
              <p class="unlockable-hint">Check the box above to reveal</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private formatDomainName(domain: DomainType): string {
    const names: Record<DomainType, string> = {
      health: '🏥 Health Records',
      finance: '💰 Financial Data',
      judicial: '⚖️ Judicial Records',
      location: '📍 Location Data',
      social: '👥 Social Media',
    };
    return names[domain] || domain;
  }

  private setupInferenceInteractions() {
    // Setup expand/collapse buttons
    const expandButtons = this.container.querySelectorAll('.expand-btn');
    expandButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).dataset.target;
        if (!target) return;

        const content = this.container.querySelector(`#${target}`) as HTMLElement;
        const icon = button.querySelector('.expand-icon');

        if (content) {
          if (content.style.display === 'none') {
            content.style.display = 'block';
            if (icon) icon.textContent = '▼';
          } else {
            content.style.display = 'none';
            if (icon) icon.textContent = '▶';
          }
        }
      });
    });
  }

  private formatRole(role: string): string {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  destroy() {
    this.container.remove();
  }
}
