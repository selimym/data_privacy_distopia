import Phaser from 'phaser';
import { getNPC } from '../api/npcs';
import { getInferences } from '../api/inferences';
import type {
  DomainType,
  NPCWithDomains,
  InferencesResponse,
  InferenceResult,
} from '../types/npc';

const STORAGE_KEY_PREFIX = 'npc_domains_';

export class DataPanel {
  private container: HTMLDivElement;
  private currentNpcId: string | null = null;
  private enabledDomains: Set<DomainType> = new Set();
  private currentTab: string = 'inferences';
  private npcData: NPCWithDomains | null = null;
  private inferencesData: InferencesResponse | null = null;

  constructor(_scene: Phaser.Scene) {
    // scene parameter kept for consistency with Phaser patterns, may be used later
    this.container = this.createPanelElement();
    this.setupEventListeners();
  }

  // Persistence methods
  private saveUnlockedDomains(npcId: string, domains: Set<DomainType>) {
    try {
      localStorage.setItem(
        STORAGE_KEY_PREFIX + npcId,
        JSON.stringify(Array.from(domains))
      );
    } catch (error) {
      console.warn('Failed to save unlocked domains:', error);
    }
  }

  private loadUnlockedDomains(npcId: string): Set<DomainType> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + npcId);
      if (stored) {
        return new Set(JSON.parse(stored) as DomainType[]);
      }
    } catch (error) {
      console.warn('Failed to load unlocked domains:', error);
    }
    return new Set();
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
          <span>🏥 Health</span>
        </label>
        <label>
          <input type="checkbox" data-domain="finance" />
          <span>💰 Finance</span>
        </label>
        <label>
          <input type="checkbox" data-domain="judicial" />
          <span>⚖️ Judicial</span>
        </label>
        <label>
          <input type="checkbox" data-domain="location" />
          <span>📍 Location</span>
        </label>
        <label>
          <input type="checkbox" data-domain="social" />
          <span>👥 Social</span>
        </label>
      </div>

      <div class="tabs">
        <button class="tab-btn active" data-tab="inferences">🔍 Inferences</button>
        <button class="tab-btn" data-tab="basic">👤 Basic Info</button>
        <button class="tab-btn" data-tab="health">🏥 Health</button>
        <button class="tab-btn" data-tab="finance">💰 Finance</button>
        <button class="tab-btn" data-tab="judicial">⚖️ Judicial</button>
        <button class="tab-btn" data-tab="location">📍 Location</button>
        <button class="tab-btn" data-tab="social">👥 Social</button>
      </div>

      <div class="tab-content">
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

        // Save persistence
        if (this.currentNpcId) {
          this.saveUnlockedDomains(this.currentNpcId, this.enabledDomains);
          this.updatePanelColorIntensity();
          this.fetchAndRender(this.currentNpcId);
        }
      });
    });

    // Tab buttons
    const tabButtons = this.container.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tab = target.dataset.tab;

        if (tab) {
          this.switchTab(tab);
        }
      });
    });
  }

  async show(npcId: string, enabledDomains: DomainType[] = []) {
    this.currentNpcId = npcId;

    // Load previously unlocked domains from persistence
    const savedDomains = this.loadUnlockedDomains(npcId);

    // Merge with any passed domains
    this.enabledDomains = new Set([...savedDomains, ...enabledDomains]);

    // Update checkbox states
    this.updateCheckboxStates();

    // Show panel
    this.container.style.display = 'block';

    // Update color based on unlocked domains
    this.updatePanelColorIntensity();

    // Fetch and render data
    await this.fetchAndRender(npcId);
  }

  hide() {
    this.container.style.display = 'none';
    this.currentNpcId = null;
    // Don't clear enabled domains - they're persisted
    this.updateCheckboxStates();
  }

  private updatePanelColorIntensity() {
    const domainCount = this.enabledDomains.size;

    // Progressive color intensity based on unlocked domains (0-5)
    // More domains = more scary/intense colors
    let borderColor = '#4a90e2'; // Default blue
    let headerColor = '#4a90e2';
    let shadowIntensity = 0.2;

    if (domainCount >= 1) {
      borderColor = '#ffd166'; // Yellow - some data
      headerColor = '#ffd166';
      shadowIntensity = 0.3;
    }
    if (domainCount >= 2) {
      borderColor = '#ff9d00'; // Orange - more data
      headerColor = '#ff9d00';
      shadowIntensity = 0.4;
    }
    if (domainCount >= 3) {
      borderColor = '#ff6b35'; // Dark orange - significant data
      headerColor = '#ff6b35';
      shadowIntensity = 0.5;
    }
    if (domainCount >= 4) {
      borderColor = '#ef476f'; // Red - very invasive
      headerColor = '#ef476f';
      shadowIntensity = 0.6;
    }
    if (domainCount >= 5) {
      borderColor = '#d63354'; // Dark red - complete invasion
      headerColor = '#d63354';
      shadowIntensity = 0.8;
    }

    // Apply colors to panel
    this.container.style.borderColor = borderColor;
    this.container.style.boxShadow = `
      0 8px 32px rgba(0, 0, 0, 0.6),
      0 0 ${20 + domainCount * 10}px rgba(239, 71, 111, ${shadowIntensity})
    `;

    // Update header color
    const nameElement = this.container.querySelector('.npc-name') as HTMLElement;
    if (nameElement) {
      nameElement.style.color = headerColor;
    }

    // Update disclaimer color intensity
    const disclaimer = this.container.querySelector('.disclaimer') as HTMLElement;
    if (disclaimer && domainCount >= 3) {
      disclaimer.style.borderColor = borderColor;
      disclaimer.style.background = `rgba(239, 71, 111, ${0.05 + domainCount * 0.02})`;
    }
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
    const contentDiv = this.container.querySelector('.tab-content');
    if (!contentDiv) return;

    // Show loading state
    contentDiv.innerHTML = '<p class="loading">Loading data...</p>';

    try {
      const domains = Array.from(this.enabledDomains);
      const [npcData, inferencesData] = await Promise.all([
        getNPC(npcId, domains),
        getInferences(npcId, domains),
      ]);

      // Store data
      this.npcData = npcData;
      this.inferencesData = inferencesData;

      // Update NPC name
      const nameElement = this.container.querySelector('.npc-name');
      if (nameElement) {
        nameElement.textContent = `${npcData.npc.first_name} ${npcData.npc.last_name}`;
      }

      // Render current tab
      this.renderCurrentTab();
    } catch (error) {
      console.error('Failed to fetch NPC data:', error);
      contentDiv.innerHTML = `
        <p class="error">Failed to load NPC data. Please try again.</p>
      `;
    }
  }

  private switchTab(tab: string) {
    this.currentTab = tab;

    // Update tab button states
    const tabButtons = this.container.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
      const buttonTab = (button as HTMLElement).dataset.tab;
      if (buttonTab === tab) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });

    // Render current tab
    this.renderCurrentTab();
  }

  private renderCurrentTab() {
    const contentDiv = this.container.querySelector('.tab-content');
    if (!contentDiv) return;

    if (!this.npcData || !this.inferencesData) {
      contentDiv.innerHTML = '<p class="hint">Loading...</p>';
      return;
    }

    switch (this.currentTab) {
      case 'inferences':
        this.renderInferencesTab(contentDiv);
        break;
      case 'basic':
        this.renderBasicInfoTab(contentDiv);
        break;
      case 'health':
        this.renderHealthTab(contentDiv);
        break;
      case 'finance':
        this.renderFinanceTab(contentDiv);
        break;
      case 'judicial':
        this.renderJudicialTab(contentDiv);
        break;
      case 'location':
        this.renderLocationTab(contentDiv);
        break;
      case 'social':
        this.renderSocialTab(contentDiv);
        break;
      default:
        contentDiv.innerHTML = '<p class="hint">Unknown tab</p>';
    }

    // Setup expand/collapse for inference cards
    this.setupInferenceInteractions();
  }

  private renderInferencesTab(contentDiv: Element) {
    let html = '';

    // Inferences section (only if domains are enabled)
    if (this.enabledDomains.size > 0 && this.inferencesData!.inferences.length > 0) {
      html += this.renderInferences(this.inferencesData!.inferences);
    } else if (this.enabledDomains.size === 0) {
      html += `
        <div class="hint">
          <p>💡 Enable data domains above to see cross-domain inferences</p>
          <p><small>This simulates gaining unauthorized access to different data sources</small></p>
        </div>
      `;
    } else {
      html += `
        <div class="hint">
          <p>No inferences available for the enabled domains</p>
        </div>
      `;
    }

    // Unlockable domains preview
    if (this.inferencesData!.unlockable_inferences.length > 0) {
      html += this.renderUnlockablePreview(this.inferencesData!.unlockable_inferences);
    }

    contentDiv.innerHTML = html;
  }

  private renderBasicInfoTab(contentDiv: Element) {
    const npc = this.npcData!.npc;

    const html = `
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

    contentDiv.innerHTML = html;
  }

  private renderHealthTab(contentDiv: Element) {
    const health = this.npcData!.domains.health as any;

    if (!health) {
      contentDiv.innerHTML = '<p class="hint">Enable Health domain to see medical records</p>';
      return;
    }

    const html = `
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
              ${health.conditions.map((c: any) => `
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
              ${health.medications.map((m: any) => `
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
              ${health.visits.slice(0, 5).map((v: any) => `
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

    contentDiv.innerHTML = html;
  }

  private renderFinanceTab(contentDiv: Element) {
    const finance = this.npcData!.domains.finance as any;

    if (!finance) {
      contentDiv.innerHTML = '<p class="hint">Enable Finance domain to see financial records</p>';
      return;
    }

    const html = `
      <div class="finance-domain">
        <h3>Financial Records</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Employment:</span>
            <span class="value">${finance.employment_status.replace(/_/g, ' ')}</span>
          </div>
          ${finance.employer_name ? `
          <div class="info-item">
            <span class="label">Employer:</span>
            <span class="value">${finance.employer_name}</span>
          </div>
          ` : ''}
          <div class="info-item">
            <span class="label">Annual Income:</span>
            <span class="value">$${parseFloat(finance.annual_income).toLocaleString()}</span>
          </div>
          <div class="info-item">
            <span class="label">Credit Score:</span>
            <span class="value">${finance.credit_score}</span>
          </div>
        </div>

        ${finance.bank_accounts.length > 0 ? `
          <div class="finance-section">
            <h4>Bank Accounts</h4>
            <ul class="finance-list">
              ${finance.bank_accounts.map((a: any) => `
                <li>
                  <strong>${a.bank_name}</strong> - ${a.account_type.replace(/_/g, ' ')}
                  <br><small>****${a.account_number_last4} | Balance: $${parseFloat(a.balance).toLocaleString()}</small>
                  ${a.is_primary ? '<span class="badge">Primary</span>' : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${finance.debts.length > 0 ? `
          <div class="finance-section">
            <h4>Debts</h4>
            <ul class="finance-list">
              ${finance.debts.map((d: any) => `
                <li class="${d.is_delinquent ? 'sensitive' : ''}">
                  <strong>${d.creditor_name}</strong> - ${d.debt_type.replace(/_/g, ' ')}
                  <br><small>Balance: $${parseFloat(d.current_balance).toLocaleString()} | Monthly: $${parseFloat(d.monthly_payment).toLocaleString()}</small>
                  ${d.is_delinquent ? '<span class="badge sensitive">Delinquent</span>' : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${finance.transactions.length > 0 ? `
          <div class="finance-section">
            <h4>Recent Transactions (${finance.transactions.length})</h4>
            <ul class="finance-list">
              ${finance.transactions.slice(0, 10).map((t: any) => `
                <li class="${t.is_sensitive ? 'sensitive' : ''}">
                  <strong>${new Date(t.transaction_date).toLocaleDateString()}</strong> - ${t.merchant_name}
                  <br><small>${t.category} | $${parseFloat(t.amount).toFixed(2)}</small>
                  ${t.is_sensitive ? '<span class="badge sensitive">Sensitive</span>' : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    contentDiv.innerHTML = html;
  }

  private renderJudicialTab(contentDiv: Element) {
    const judicial = this.npcData!.domains.judicial as any;

    if (!judicial) {
      contentDiv.innerHTML = '<p class="hint">Enable Judicial domain to see legal records</p>';
      return;
    }

    const html = `
      <div class="judicial-domain">
        <h3>Judicial Records</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Criminal Record:</span>
            <span class="value">${judicial.has_criminal_record ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="label">Civil Cases:</span>
            <span class="value">${judicial.has_civil_cases ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="label">Traffic Violations:</span>
            <span class="value">${judicial.has_traffic_violations ? 'Yes' : 'No'}</span>
          </div>
        </div>

        ${judicial.criminal_records.length > 0 ? `
          <div class="judicial-section">
            <h4>Criminal Records</h4>
            <ul class="judicial-list">
              ${judicial.criminal_records.map((c: any) => `
                <li class="sensitive">
                  <strong>${c.charge}</strong>
                  <br><small>Case: ${c.case_number} | Convicted: ${new Date(c.conviction_date).toLocaleDateString()}</small>
                  <br><small>Sentence: ${c.sentence}</small>
                  ${c.is_felony ? '<span class="badge sensitive">Felony</span>' : '<span class="badge">Misdemeanor</span>'}
                  ${c.is_sealed ? '<span class="badge">Sealed</span>' : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${judicial.civil_cases.length > 0 ? `
          <div class="judicial-section">
            <h4>Civil Cases</h4>
            <ul class="judicial-list">
              ${judicial.civil_cases.map((c: any) => `
                <li>
                  <strong>${c.case_type}</strong>
                  <br><small>Case: ${c.case_number} | Filed: ${new Date(c.filing_date).toLocaleDateString()}</small>
                  <br><small>${c.plaintiff_defendant} | ${c.resolution}</small>
                  ${c.is_public ? '<span class="badge">Public</span>' : '<span class="badge">Sealed</span>'}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${judicial.traffic_violations.length > 0 ? `
          <div class="judicial-section">
            <h4>Traffic Violations</h4>
            <ul class="judicial-list">
              ${judicial.traffic_violations.map((t: any) => `
                <li class="${t.is_serious ? 'sensitive' : ''}">
                  <strong>${t.violation_type}</strong> - ${t.violation_description}
                  <br><small>${new Date(t.violation_date).toLocaleDateString()} | ${t.location}</small>
                  <br><small>Fine: $${parseFloat(t.fine_amount).toFixed(2)} | Points: ${t.points}</small>
                  ${t.is_serious ? '<span class="badge sensitive">Serious</span>' : ''}
                  ${t.is_paid ? '<span class="badge">Paid</span>' : '<span class="badge">Unpaid</span>'}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${!judicial.has_criminal_record && !judicial.has_civil_cases && !judicial.has_traffic_violations ? `
          <div class="hint">
            <p>✅ No judicial records found - clean record</p>
          </div>
        ` : ''}
      </div>
    `;

    contentDiv.innerHTML = html;
  }

  private renderLocationTab(contentDiv: Element) {
    const location = this.npcData!.domains.location as any;

    if (!location) {
      contentDiv.innerHTML = '<p class="hint">Enable Location domain to see tracking data</p>';
      return;
    }

    if (!location.tracking_enabled) {
      contentDiv.innerHTML = `
        <div class="hint">
          <p>🔒 This person has disabled location tracking</p>
          <p><small>Privacy-conscious users can opt out of location services</small></p>
        </div>
      `;
      return;
    }

    const html = `
      <div class="location-domain">
        <h3>Location Tracking</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Tracking Status:</span>
            <span class="value">${location.tracking_enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div class="info-item">
            <span class="label">Data Retention:</span>
            <span class="value">${location.data_retention_days} days</span>
          </div>
          <div class="info-item">
            <span class="label">Inferred Locations:</span>
            <span class="value">${location.inferred_locations.length}</span>
          </div>
        </div>

        ${location.inferred_locations.length > 0 ? `
          <div class="location-section">
            <h4>Inferred Locations</h4>
            <ul class="location-list">
              ${location.inferred_locations.map((loc: any) => `
                <li class="${loc.is_sensitive ? 'sensitive' : ''}">
                  <strong>${loc.location_type.replace(/_/g, ' ')}</strong> - ${loc.location_name}
                  <br><small>${loc.street_address}, ${loc.city}, ${loc.state} ${loc.zip_code}</small>
                  <br><small>Visits: ${loc.visit_frequency} | ${loc.typical_days}</small>
                  ${loc.inferred_relationship ? `<br><small>Relationship: ${loc.inferred_relationship}</small>` : ''}
                  <br><small class="privacy-note">⚠️ ${loc.privacy_implications}</small>
                  <br><small>Confidence: ${loc.confidence_score}%</small>
                  ${loc.is_sensitive ? '<span class="badge sensitive">Sensitive</span>' : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    contentDiv.innerHTML = html;
  }

  private renderSocialTab(contentDiv: Element) {
    const social = this.npcData!.domains.social as any;

    if (!social) {
      contentDiv.innerHTML = '<p class="hint">Enable Social domain to see social media data</p>';
      return;
    }

    if (social.uses_end_to_end_encryption) {
      const html = `
        <div class="social-domain">
          <h3>Social Media</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Public Profile:</span>
              <span class="value">${social.has_public_profile ? 'Yes' : 'No'}</span>
            </div>
            ${social.primary_platform ? `
            <div class="info-item">
              <span class="label">Primary Platform:</span>
              <span class="value">${social.primary_platform}</span>
            </div>
            ` : ''}
            ${social.follower_count ? `
            <div class="info-item">
              <span class="label">Followers:</span>
              <span class="value">${social.follower_count.toLocaleString()}</span>
            </div>
            ` : ''}
          </div>

          <div class="hint">
            <p>🔒 ${social.encryption_explanation}</p>
          </div>

          ${social.public_inferences.length > 0 ? `
            <div class="social-section">
              <h4>Public Profile Analysis</h4>
              <ul class="social-list">
                ${social.public_inferences.map((inf: any) => `
                  <li>
                    <strong>${inf.category.replace(/_/g, ' ')}</strong>
                    <br><small>${inf.inference_text}</small>
                    <br><small>Evidence: ${inf.supporting_evidence}</small>
                    <br><small>Potential Harm: ${inf.potential_harm}</small>
                    <br><small>Confidence: ${inf.confidence_score}% (${inf.data_points_analyzed} data points analyzed)</small>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
      contentDiv.innerHTML = html;
      return;
    }

    const html = `
      <div class="social-domain">
        <h3>Social Media</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Public Profile:</span>
            <span class="value">${social.has_public_profile ? 'Yes' : 'No'}</span>
          </div>
          ${social.primary_platform ? `
          <div class="info-item">
            <span class="label">Primary Platform:</span>
            <span class="value">${social.primary_platform}</span>
          </div>
          ` : ''}
          ${social.follower_count !== null ? `
          <div class="info-item">
            <span class="label">Followers:</span>
            <span class="value">${social.follower_count.toLocaleString()}</span>
          </div>
          ` : ''}
          ${social.post_frequency ? `
          <div class="info-item">
            <span class="label">Post Frequency:</span>
            <span class="value">${social.post_frequency}</span>
          </div>
          ` : ''}
        </div>

        ${social.public_inferences.length > 0 ? `
          <div class="social-section">
            <h4>Public Profile Analysis</h4>
            <ul class="social-list">
              ${social.public_inferences.map((inf: any) => `
                <li>
                  <strong>${inf.category.replace(/_/g, ' ')}</strong>
                  <br><small>${inf.inference_text}</small>
                  <br><small>Evidence: ${inf.supporting_evidence}</small>
                  <br><small>Potential Harm: ${inf.potential_harm}</small>
                  <br><small>Source: ${inf.source_platform} | Confidence: ${inf.confidence_score}% (${inf.data_points_analyzed} data points)</small>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${social.private_inferences.length > 0 ? `
          <div class="social-section">
            <h4>Private Message Analysis</h4>
            <p class="warning">⚠️ This data was obtained through unauthorized access to private communications</p>
            <ul class="social-list">
              ${social.private_inferences.map((inf: any) => `
                <li class="sensitive">
                  <strong>${inf.category.replace(/_/g, ' ')}</strong>
                  <br><small>${inf.inference_text}</small>
                  <br><small>Evidence: ${inf.supporting_evidence}</small>
                  <br><small>Potential Harm: ${inf.potential_harm}</small>
                  <br><small>Confidence: ${inf.confidence_score}% (${inf.data_points_analyzed} data points analyzed)</small>
                  <span class="badge sensitive">Private</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    contentDiv.innerHTML = html;
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
