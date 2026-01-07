/**
 * Scenario Intro
 *
 * Full-screen intro when starting a scenario
 */

export class ScenarioIntro {
  private container: HTMLDivElement;
  private onBegin: () => void;
  private scenarioKey: string;

  constructor(scenarioKey: string, onBegin: () => void) {
    this.scenarioKey = scenarioKey;
    this.onBegin = onBegin;
    this.container = document.createElement('div');
    this.container.className = 'scenario-intro-overlay';
    this.render();
  }

  private render() {
    // Get scenario-specific content
    const content = this.getScenarioContent();

    this.container.innerHTML = `
      <div class="scenario-intro">
        <div class="intro-content">
          <h1 class="scenario-title">${content.title}</h1>

          <div class="scenario-description">
            <p>${content.description}</p>
          </div>

          <div class="setup-text">
            ${content.setup.map((line) => `<p>${line}</p>`).join('')}
          </div>

          <div class="warning-box">
            <p><strong>⚠️ Content Warning</strong></p>
            <p>${content.warning}</p>
          </div>

          <div class="educational-note">
            <p><em>${content.educationalNote}</em></p>
          </div>

          <button class="btn-begin" id="begin-scenario">Begin</button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private getScenarioContent() {
    // Scenario-specific content
    const scenarios: Record<
      string,
      {
        title: string;
        description: string;
        setup: string[];
        warning: string;
        educationalNote: string;
      }
    > = {
      rogue_employee: {
        title: 'The Insider Threat',
        description:
          'You are a medical records clerk at Mercy General Hospital.',
        setup: [
          "You've worked here for 2 years. $15/hour to manage medical records.",
          'You have authorized access to every patient file. Every diagnosis. Every prescription. Every secret.',
          'The audit system logs your queries, but no one actually monitors them in real-time.',
          'Thousands of records. No one watching. What would you do?',
        ],
        warning:
          'This scenario depicts realistic privacy violations and their consequences. It will be uncomfortable. That is the point.',
        educationalNote:
          'This scenario is based on documented incidents at major medical institutions. Every action has real-world parallels.',
      },
    };

    return (
      scenarios[this.scenarioKey] || {
        title: 'Unknown Scenario',
        description: '',
        setup: [],
        warning: '',
        educationalNote: '',
      }
    );
  }

  private attachEventListeners() {
    const beginBtn = this.container.querySelector(
      '#begin-scenario'
    ) as HTMLButtonElement;

    if (beginBtn) {
      beginBtn.addEventListener('click', () => {
        this.hide();
        this.onBegin();
      });
    }
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
