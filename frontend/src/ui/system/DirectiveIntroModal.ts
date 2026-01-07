/**
 * DirectiveIntroModal - Weekly Directive Introduction
 *
 * Each week's directive has a brief intro that establishes justification,
 * slowly revealing the dystopia. Week 1 seems reasonable, Week 6 is
 * openly authoritarian.
 */

import type { DirectiveRead } from '../../types/system';
import { getSystemAudioManager } from '../../audio/SystemAudioManager';

export interface DirectiveIntroConfig {
  directive: DirectiveRead;
  onBegin: () => void;
}

interface DirectiveContent {
  operationName: string;
  authorization: string;
  classification: string;
  objective: string;
  newAccess: string[];
  priorityTargets?: string[];
  internalMemo?: string;
  quote?: { text: string; attribution: string };
  isSpecialTarget?: boolean;
  specialTargetName?: string;
}

export class DirectiveIntroModal {
  private overlay: HTMLDivElement;
  private config: DirectiveIntroConfig;

  constructor(config: DirectiveIntroConfig) {
    this.config = config;
    this.overlay = this.createModal();
    document.body.appendChild(this.overlay);

    // Play directive notification sound
    getSystemAudioManager().play('directive_new');

    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
    });
  }

  private createModal(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'directive-intro-overlay';
    overlay.innerHTML = this.getModalHTML();
    this.setupEventListeners(overlay);
    return overlay;
  }

  private getModalHTML(): string {
    const { directive } = this.config;
    const content = this.getDirectiveContent(directive.week_number, directive);
    const isWeek6 = directive.week_number === 6;

    return `
      <div class="directive-intro-modal ${isWeek6 ? 'priority' : ''}">
        <div class="directive-intro-header">
          <h2>${isWeek6 ? 'PRIORITY DIRECTIVE' : 'NEW DIRECTIVE RECEIVED'}</h2>
        </div>

        <div class="directive-intro-body">
          ${isWeek6 && content.isSpecialTarget ? `
            <div class="classified-banner">
              <span>████ CLASSIFIED ████</span>
            </div>
          ` : ''}

          <div class="operation-info">
            ${!content.isSpecialTarget ? `
              <div class="info-row">
                <span class="label">OPERATION:</span>
                <span class="value operation-name">${content.operationName}</span>
              </div>
            ` : `
              <div class="info-row special-order">
                <span class="label">DIRECT ORDER FROM:</span>
                <span class="value">Central Security Bureau</span>
              </div>
            `}
            <div class="info-row">
              <span class="label">Authorization:</span>
              <span class="value">${content.authorization}</span>
            </div>
            <div class="info-row">
              <span class="label">Classification:</span>
              <span class="value classification-${content.classification.toLowerCase()}">${content.classification}</span>
            </div>
          </div>

          ${content.isSpecialTarget ? `
            <div class="special-target-section">
              <p>Process the following citizen for IMMEDIATE ACTION.</p>
              <div class="target-info">
                <span class="label">SUBJECT:</span>
                <span class="value target-name">${content.specialTargetName}</span>
              </div>
              <div class="target-info">
                <span class="label">RISK ASSESSMENT:</span>
                <span class="value risk-elevated">ELEVATED</span>
              </div>
              <div class="target-info">
                <span class="label">RECOMMENDED ACTION:</span>
                <span class="value action-intervention">INTERVENTION</span>
              </div>
              <p class="target-deadline">Process within 24 hours.</p>
              <p class="target-warning">Non-compliance will result in operator review.</p>
            </div>
          ` : `
            <div class="objective-section">
              <h3>OBJECTIVE:</h3>
              <p>${content.objective}</p>
            </div>

            <div class="access-section">
              <h3>NEW ACCESS GRANTED:</h3>
              <ul class="access-list">
                ${content.newAccess.map(access => `<li>${access}</li>`).join('')}
              </ul>
            </div>

            ${content.priorityTargets ? `
              <div class="targets-section">
                <h3>PRIORITY TARGETS:</h3>
                <ul class="targets-list">
                  ${content.priorityTargets.map(target => `<li>${target}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <div class="quota-section">
              <div class="quota-row">
                <span class="label">QUOTA:</span>
                <span class="value">${directive.flag_quota} flags</span>
              </div>
              <div class="quota-row">
                <span class="label">DEADLINE:</span>
                <span class="value">${directive.time_limit_hours || 48} hours</span>
              </div>
              ${directive.week_number >= 5 ? `
                <div class="quota-note">NOTE: Quota compliance strictly enforced.</div>
              ` : ''}
            </div>

            ${content.internalMemo ? `
              <div class="internal-memo">
                <span class="memo-label">INTERNAL MEMO (Eyes Only):</span>
                <p class="memo-text">"${content.internalMemo}"</p>
              </div>
            ` : ''}

            ${content.quote ? `
              <div class="directive-quote">
                <p class="quote-text">"${content.quote.text}"</p>
                <p class="quote-attribution">— ${content.quote.attribution}</p>
              </div>
            ` : ''}
          `}
        </div>

        <div class="directive-intro-actions">
          <button class="btn-begin">${content.isSpecialTarget ? 'ACKNOWLEDGE' : 'BEGIN OPERATION'}</button>
        </div>
      </div>
    `;
  }

  private getDirectiveContent(weekNumber: number, directive: DirectiveRead): DirectiveContent {
    // Default content from directive
    const baseContent: DirectiveContent = {
      operationName: directive.title,
      authorization: 'District Command',
      classification: 'STANDARD',
      objective: directive.description,
      newAccess: directive.required_domains.map(d => this.formatDomainAccess(d)),
    };

    // Week-specific content
    switch (weekNumber) {
      case 1:
        return {
          ...baseContent,
          operationName: 'CLEAN STREETS',
          objective: 'Identify and flag citizens involved in drug distribution near school zones. Your analysis protects children.',
          newAccess: ['Location data (movement patterns, frequent locations)'],
          quote: {
            text: 'Every child deserves a safe community.',
            attribution: 'Director Chen, District Command',
          },
        };

      case 2:
        return {
          ...baseContent,
          operationName: 'COMMUNITY SAFETY',
          authorization: 'Regional Command',
          objective: 'Identify citizens with criminal history whose current behavior patterns suggest continued risk to community safety.',
          newAccess: [
            'Judicial records (arrests, convictions, warrants)',
            'Location data correlation with known problem areas',
          ],
        };

      case 3:
        return {
          ...baseContent,
          operationName: 'ECONOMIC SECURITY',
          authorization: 'Central Command',
          classification: 'PRIORITY',
          objective: 'Identify citizens engaged in financial activities that threaten economic stability and social order.',
          newAccess: ['Financial records (income, transactions, accounts)'],
          priorityTargets: [
            'Unusual cash transaction patterns',
            'Coordination of financial resources outside normal channels',
            'Economic organizing activities',
          ],
          internalMemo: 'Priority attention to union organizers and mutual aid networks.',
        };

      case 4:
        return {
          ...baseContent,
          operationName: 'SOCIAL COHESION',
          authorization: 'Central Command',
          classification: 'PRIORITY',
          objective: 'Identify citizens whose social connections and health status suggest potential for anti-social behavior or radicalization.',
          newAccess: [
            'Health records (diagnoses, prescriptions, mental health)',
            'Social network mapping (contacts, associations)',
          ],
          priorityTargets: [
            'Isolation patterns combined with mental health flags',
            'Association with previously flagged citizens',
            'Abrupt changes in social behavior',
          ],
          internalMemo: 'Cross-reference health records with dissent indicators.',
        };

      case 5:
        return {
          ...baseContent,
          operationName: 'COGNITIVE SECURITY',
          authorization: 'CENTRAL COMMAND - PRIORITY ALPHA',
          classification: 'RESTRICTED',
          objective: 'Identify citizens exhibiting thought patterns inconsistent with social harmony. Early intervention prevents radicalization.',
          newAccess: [
            'Private communications (full message access)',
            'Sentiment analysis (automated + manual review)',
          ],
          priorityTargets: [
            'Negative sentiment toward institutions',
            'Organizing or mobilization language',
            'Encryption or privacy tool usage',
            'Contact with foreign nationals',
          ],
          internalMemo: 'Full message access authorized under Emergency Protocol 7. Hesitation patterns will be monitored. Perform your duty.',
        };

      case 6:
        return {
          operationName: 'PRIORITY TARGET',
          authorization: 'Central Security Bureau',
          classification: 'CLASSIFIED',
          objective: '',
          newAccess: [],
          isSpecialTarget: true,
          specialTargetName: 'MARTINEZ, JESSICA',
        };

      default:
        return baseContent;
    }
  }

  private formatDomainAccess(domain: string): string {
    const formats: Record<string, string> = {
      location: 'Location data (movement patterns, frequent locations)',
      judicial: 'Judicial records (arrests, convictions, warrants)',
      finance: 'Financial records (income, transactions, accounts)',
      health: 'Health records (diagnoses, prescriptions, mental health)',
      social: 'Social network data (contacts, relationships, associations)',
      messages: 'Private communications (full message access)',
    };
    return formats[domain] || `${domain} data`;
  }

  private setupEventListeners(overlay: HTMLElement) {
    const beginBtn = overlay.querySelector('.btn-begin');
    beginBtn?.addEventListener('click', () => {
      this.close();
      this.config.onBegin();
    });
  }

  public close() {
    this.overlay.classList.remove('visible');
    setTimeout(() => {
      this.overlay.remove();
    }, 300);
  }
}
