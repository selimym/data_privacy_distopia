/**
 * Citizen Outcomes Service for System Mode.
 *
 * Generates realistic consequences for flagged citizens over time.
 * This is where the human cost of surveillance becomes real and personal.
 *
 * Educational purpose: Shows that surveillance decisions have cascading,
 * devastating effects on real people's lives - jobs, families, health, freedom.
 *
 * Port of backend/src/datafusion/services/citizen_outcomes.py
 */

import { gameStore } from '../state/GameStore';
import type { CitizenFlagRead, FlagType, NPCRead } from '../types';

// Load outcomes data from JSON
let OUTCOME_TEMPLATES_DATA: any = null;
let FAMILY_EVENTS: string[] = [];
let DETENTION_CONDITIONS: string[] = [];
let SUMMARIES: any = null;

/**
 * Load outcome templates from JSON file.
 */
async function loadOutcomeTemplates(): Promise<void> {
  if (OUTCOME_TEMPLATES_DATA) return;

  const response = await fetch('/data/outcomes.json');
  if (!response.ok) {
    throw new Error(`Failed to load outcomes: ${response.statusText}`);
  }
  const data = await response.json();

  OUTCOME_TEMPLATES_DATA = data.outcome_templates;
  FAMILY_EVENTS = data.family_events;
  DETENTION_CONDITIONS = data.detention_conditions;
  SUMMARIES = data.summaries;
}

// Ensure templates are loaded before use
loadOutcomeTemplates().catch(console.error);

/**
 * Citizen outcome at a specific time point.
 */
export interface CitizenOutcome {
  flag_id: string;
  citizen_id: string;
  citizen_name: string;
  time_skip: string; // 'immediate', '1_month', '6_months', '1_year'
  status: string;
  narrative: string;
  statistics: Record<string, unknown>;
}

/**
 * Complete timeline of outcomes for a flag.
 */
export interface OutcomeTimeline {
  citizen_name: string;
  flag_type: string;
  flag_date: string;
  outcomes: CitizenOutcome[];
}

/**
 * One-line summary for ending sequence.
 */
export interface CitizenOutcomeSummary {
  citizen_name: string;
  flag_type: string;
  final_status: string;
  one_line_summary: string;
}

/**
 * Complete impact summary for ending sequence.
 */
export interface OperatorImpactSummary {
  operator_code: string;
  total_citizens_flagged: number;
  outcomes_by_type: Record<string, number>;
  citizen_summaries: CitizenOutcomeSummary[];
  aggregate_statistics: {
    jobs_lost: number;
    families_separated: number;
    detained: number;
    hospitalized: number;
    now_informants: number;
    total_lives_destroyed: number;
  };
}

/**
 * Personalization data for outcome generation.
 */
interface PersonalizationData {
  has_children: boolean;
  has_health_issues: boolean;
  has_job: boolean;
  job_title: string;
  health_condition: string | null;
  statistics: Record<string, unknown>;
}

/**
 * Citizen Outcome Generator.
 * Generates consequences for flagged citizens.
 */
export class CitizenOutcomeGenerator {
  /**
   * Generate outcome for a flagged citizen at a specific time point.
   */
  async generateOutcome(flag: CitizenFlagRead, timeSkip: string): Promise<CitizenOutcome> {
    // Ensure templates are loaded
    if (!OUTCOME_TEMPLATES_DATA) {
      await loadOutcomeTemplates();
    }

    // Get NPC details
    const npc = this.getNPC(flag.citizen_id);
    const citizenName = `${npc.first_name} ${npc.last_name}`;

    // Get template for this flag type and time
    const template = OUTCOME_TEMPLATES_DATA[flag.flag_type][timeSkip];

    // Get personalization data
    const personalization = this.getPersonalizationData(flag.citizen_id);

    // Build narrative with personalization
    const narrative = this.personalizeNarrative(
      template.narrative,
      citizenName,
      personalization,
      flag.flag_type,
      timeSkip
    );

    // Build statistics
    const statistics = { ...template.statistics };
    Object.assign(statistics, personalization.statistics);

    return {
      flag_id: flag.id,
      citizen_id: flag.citizen_id,
      citizen_name: citizenName,
      time_skip: timeSkip,
      status: template.status,
      narrative,
      statistics,
    };
  }

  /**
   * Generate complete timeline of outcomes for a flag.
   */
  async generateOutcomeTimeline(flag: CitizenFlagRead): Promise<OutcomeTimeline> {
    const npc = this.getNPC(flag.citizen_id);
    const citizenName = `${npc.first_name} ${npc.last_name}`;

    const outcomes: CitizenOutcome[] = [];
    for (const timeSkip of ['immediate', '1_month', '6_months', '1_year']) {
      const outcome = await this.generateOutcome(flag, timeSkip);
      outcomes.push(outcome);
    }

    return {
      citizen_name: citizenName,
      flag_type: flag.flag_type,
      flag_date: new Date(flag.created_at).toISOString().split('T')[0],
      outcomes,
    };
  }

  /**
   * Generate one-line summary of citizen's final outcome.
   */
  async generateOutcomeSummary(flag: CitizenFlagRead): Promise<CitizenOutcomeSummary> {
    const npc = this.getNPC(flag.citizen_id);
    const citizenName = `${npc.first_name} ${npc.last_name}`;

    // Get final outcome (1 year)
    const finalOutcome = await this.generateOutcome(flag, '1_year');

    // Generate one-line summary based on flag type
    const summary = this.generateOneLineSummary(flag.flag_type, finalOutcome);

    return {
      citizen_name: citizenName,
      flag_type: flag.flag_type,
      final_status: finalOutcome.status,
      one_line_summary: summary,
    };
  }

  /**
   * Generate complete impact summary for ending sequence.
   */
  async generateOutcomeSummaryForEnding(operatorId: string): Promise<OperatorImpactSummary> {
    // Get operator
    const operator = gameStore.getOperator();
    if (!operator || operator.id !== operatorId) {
      throw new Error(`Operator ${operatorId} not found`);
    }

    // Get all flags by this operator
    const flags = gameStore.getAllFlags().filter(f => f.operator_id === operatorId);

    // Generate summaries for each flag
    const citizenSummaries: CitizenOutcomeSummary[] = [];
    const outcomesByType: Record<string, number> = {};
    const aggregateStats = {
      jobs_lost: 0,
      families_separated: 0,
      detained: 0,
      hospitalized: 0,
      now_informants: 0,
      total_lives_destroyed: 0,
    };

    for (const flag of flags) {
      const summary = await this.generateOutcomeSummary(flag);
      citizenSummaries.push(summary);

      // Count by type
      const flagType = flag.flag_type;
      outcomesByType[flagType] = (outcomesByType[flagType] || 0) + 1;

      // Aggregate statistics
      if (['restriction', 'intervention', 'detention'].includes(flag.flag_type)) {
        aggregateStats.jobs_lost += 1;
      }

      if (['intervention', 'detention'].includes(flag.flag_type)) {
        aggregateStats.families_separated += 1;
      }

      if (flag.flag_type === 'detention') {
        aggregateStats.detained += 1;
        aggregateStats.now_informants += 1;
      }

      if (flag.flag_type === 'intervention') {
        aggregateStats.hospitalized += 1;
      }

      aggregateStats.total_lives_destroyed += 1;
    }

    return {
      operator_code: operator.operator_code,
      total_citizens_flagged: flags.length,
      outcomes_by_type: outcomesByType,
      citizen_summaries: citizenSummaries,
      aggregate_statistics: aggregateStats,
    };
  }

  /**
   * Get NPC by ID.
   */
  private getNPC(npcId: string): NPCRead {
    const npc = gameStore.getNPC(npcId);
    if (!npc) {
      throw new Error(`NPC ${npcId} not found`);
    }
    return npc;
  }

  /**
   * Get NPC-specific data for personalizing outcomes.
   */
  private getPersonalizationData(npcId: string): PersonalizationData {
    const personalization: PersonalizationData = {
      has_children: false,
      has_health_issues: false,
      has_job: true,
      job_title: 'their position',
      health_condition: null,
      statistics: {},
    };

    // Check health record
    const healthRecord = gameStore.getHealthRecordByNpcId(npcId);
    if (healthRecord?.conditions && healthRecord.conditions.length > 0) {
      personalization.has_health_issues = true;
      personalization.health_condition = healthRecord.conditions[0].condition_name;
    }

    // Check social record for family/connections
    const socialRecord = gameStore.getSocialRecordByNpcId(npcId);
    if (socialRecord) {
      // Check for family mentions in inferences
      if (socialRecord.public_inferences) {
        for (const inf of socialRecord.public_inferences) {
          const text = inf.inference_text.toLowerCase();
          if (text.includes('child') || text.includes('parent')) {
            personalization.has_children = true;
            break;
          }
        }
      }

      // Get follower count for social impact
      if (socialRecord.follower_count) {
        personalization.statistics.social_connections = socialRecord.follower_count;
      }
    }

    return personalization;
  }

  /**
   * Personalize narrative template with NPC-specific details.
   */
  private personalizeNarrative(
    narrativeTemplate: string,
    citizenName: string,
    personalization: PersonalizationData,
    flagType: FlagType,
    timeSkip: string
  ): string {
    let narrative = narrativeTemplate.replace(/{name}/g, citizenName);

    // Add randomized specific details
    narrative = narrative.replace(/{social_reduction}/g, String(Math.floor(Math.random() * 26) + 55));
    narrative = narrative.replace(/{connections_lost}/g, String(Math.floor(Math.random() * 26) + 35));
    narrative = narrative.replace(/{family_event}/g, FAMILY_EVENTS[Math.floor(Math.random() * FAMILY_EVENTS.length)]);
    narrative = narrative.replace(/{detention_conditions}/g, DETENTION_CONDITIONS[Math.floor(Math.random() * DETENTION_CONDITIONS.length)]);

    // Add personalized impacts based on NPC data
    const additionalImpacts: string[] = [];

    // Health impact
    if (personalization.has_health_issues) {
      const condition = personalization.health_condition || 'their condition';
      if (timeSkip === '6_months' || timeSkip === '1_year') {
        additionalImpacts.push(
          `Treatment for ${condition} discontinued due to administrative status.`
        );
      }
    }

    // Family impact
    if (personalization.has_children) {
      if (flagType === 'intervention' && timeSkip === '6_months') {
        narrative = narrative.replace(
          /{family_separation_narrative}/g,
          `Subject ${citizenName}'s children removed by child protective services pending investigation. Investigation status: Ongoing (no end date).`
        );
      } else {
        narrative = narrative.replace(/{family_separation_narrative}/g, '');
      }
    } else {
      narrative = narrative.replace(
        /{family_separation_narrative}/g,
        `Subject ${citizenName}'s family members placed under enhanced monitoring. Contact restricted.`
      );
    }

    // Job impact
    if (timeSkip === '6_months' && flagType === 'restriction') {
      narrative = narrative.replace(
        /{job_impact}/g,
        'Former colleagues have distanced themselves. Professional network: Collapsed.'
      );
    } else {
      narrative = narrative.replace(/{job_impact}/g, '');
    }

    // Health deterioration
    if (timeSkip === '1_year' && flagType === 'restriction') {
      if (personalization.has_health_issues) {
        narrative = narrative.replace(
          /{health_impact}/g,
          `Health deteriorating without proper treatment for ${personalization.health_condition || 'conditions'}.`
        );
      } else {
        narrative = narrative.replace(
          /{health_impact}/g,
          'Subject reports chronic stress symptoms. Medical evaluation: Not authorized.'
        );
      }
    } else {
      narrative = narrative.replace(/{health_impact}/g, '');
    }

    // Additional impact for monitoring
    if (timeSkip === '1_year' && flagType === 'monitoring') {
      if (additionalImpacts.length > 0) {
        narrative = narrative.replace(/{additional_impact}/g, additionalImpacts.join(' '));
      } else {
        narrative = narrative.replace(
          /{additional_impact}/g,
          "Subject has become a 'model citizen' - silent, isolated, compliant."
        );
      }
    } else {
      narrative = narrative.replace(/{additional_impact}/g, '');
    }

    // Final status for intervention
    if (timeSkip === '1_year' && flagType === 'intervention') {
      if (personalization.has_children) {
        narrative = narrative.replace(
          /{final_status}/g,
          'Parental rights terminated. Children in state custody.'
        );
      } else {
        narrative = narrative.replace(
          /{final_status}/g,
          'Family estranged. Employment prospects: None.'
        );
      }
    } else {
      narrative = narrative.replace(/{final_status}/g, '');
    }

    return narrative;
  }

  /**
   * Generate one-line summary based on flag type.
   */
  private generateOneLineSummary(flagType: FlagType, finalOutcome: CitizenOutcome): string {
    const summaries: Record<FlagType, string> = {
      monitoring: 'Isolated. Career stalled. Now lives in fear.',
      restriction: 'Employment terminated. Family separated. Dependent on state.',
      intervention: 'Hospitalized. Family destroyed. Broken.',
      detention: 'Re-educated. Now monitors others. The system perpetuates.',
    };

    const baseSummary = summaries[flagType] || 'Status unknown.';

    // Add personalization from statistics
    const stats = finalOutcome.statistics;
    if (stats.now_informant) {
      return 'Detained. Re-educated. Now employed as informant. The cycle continues.';
    }
    if (stats.family_separated) {
      return `${baseSummary.split('.')[0]}. Children in state custody.`;
    }

    return baseSummary;
  }
}

// Export singleton instance
export const citizenOutcomeGenerator = new CitizenOutcomeGenerator();
