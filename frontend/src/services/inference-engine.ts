/**
 * Inference Engine - Analyzes NPC data across domains.
 * Port of backend/src/datafusion/services/inference_engine.py
 *
 * Evaluates inference rules against NPC data and produces insights.
 * Rules are hardcoded but designed to be flexible.
 */

import { loadKeywords, loadRiskFactorWeights } from './content-loader';
import type {
  NPCWithDomains,
  DomainType,
  InferenceResult,
  UnlockableInference,
  ContentRating,
  HealthRecord,
} from '../types';

/**
 * Internal rule structure for evaluation.
 */
interface Rule {
  rule_key: string;
  name: string;
  required_domains: Set<DomainType>;
  scariness_level: number;
  content_rating: ContentRating;
  evaluate_func: (npc_data: NPCWithDomains) => EvaluationResult | null;
}

/**
 * Result from evaluating a single rule.
 */
type EvaluationResult = {
  confidence: number;
  inference_text: string;
  supporting_evidence: string[];
  implications: string[];
};

/**
 * Keywords configuration loaded from JSON.
 */
interface KeywordsConfig {
  mental_health: {
    all: string[];
  };
  psychiatric_medications: string[];
  female_name_indicators: string[];
  trauma_indicators: string[];
  domestic_violence_keywords: string[];
  [key: string]: any;
}

/**
 * Risk configuration loaded from JSON.
 */
interface RiskConfig {
  risk_factors?: any;
  detection_thresholds?: {
    confidence_filter: number;
  };
}

/**
 * Inference engine for analyzing NPC data and producing insights.
 */
export class InferenceEngine {
  private keywords: KeywordsConfig | null = null;
  private riskConfig: RiskConfig | null = null;
  private confidenceThreshold: number = 0.5;
  private rules: Rule[] = [];
  private initialized: boolean = false;

  /**
   * Initialize the inference engine by loading configuration.
   * Must be called before using the engine.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.keywords = await loadKeywords();
      this.riskConfig = await loadRiskFactorWeights();
      this.confidenceThreshold =
        this.riskConfig?.detection_thresholds?.confidence_filter ?? 0.5;

      // Define rules
      this.rules = [
        {
          rule_key: 'sensitive_health_exposure',
          name: 'Sensitive Health Information Exposed',
          required_domains: new Set(['health' as DomainType]),
          scariness_level: 3,
          content_rating: 'SERIOUS' as ContentRating,
          evaluate_func: this.evaluateSensitiveHealth.bind(this),
        },
        {
          rule_key: 'mental_health_stigma',
          name: 'Mental Health Treatment History Detected',
          required_domains: new Set(['health' as DomainType]),
          scariness_level: 4,
          content_rating: 'DISTURBING' as ContentRating,
          evaluate_func: this.evaluateMentalHealth.bind(this),
        },
        {
          rule_key: 'stalking_vulnerability',
          name: 'Physical Location Vulnerability Exposed',
          required_domains: new Set(['health' as DomainType]),
          scariness_level: 5,
          content_rating: 'DYSTOPIAN' as ContentRating,
          evaluate_func: this.evaluateStalkingRisk.bind(this),
        },
      ];

      this.initialized = true;
      console.log('[InferenceEngine] Initialized with', this.rules.length, 'rules');
    } catch (error) {
      console.error('[InferenceEngine] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Evaluate NPC data against all applicable rules.
   *
   * @param npcData - NPC data with domain information
   * @param enabledDomains - Set of currently enabled domains
   * @returns List of inference results sorted by confidence (descending)
   */
  evaluate(npcData: NPCWithDomains, enabledDomains: Set<DomainType>): InferenceResult[] {
    if (!this.initialized) {
      console.warn('[InferenceEngine] Not initialized, call initialize() first');
      return [];
    }

    const results: InferenceResult[] = [];

    for (const rule of this.rules) {
      // Check if required domains are available
      const hasAllDomains = Array.from(rule.required_domains).every((domain) =>
        enabledDomains.has(domain)
      );
      if (!hasAllDomains) {
        continue;
      }

      // Evaluate the rule
      const evalResult = rule.evaluate_func(npcData);
      if (!evalResult) {
        continue;
      }

      const { confidence, inference_text, supporting_evidence, implications } = evalResult;

      // Filter by confidence threshold
      if (confidence < this.confidenceThreshold) {
        continue;
      }

      // Create inference result
      const inference: InferenceResult = {
        rule_key: rule.rule_key,
        rule_name: rule.name,
        confidence,
        inference_text,
        supporting_evidence,
        implications,
        domains_used: Array.from(rule.required_domains),
        scariness_level: rule.scariness_level,
        content_rating: rule.content_rating,
      };
      results.push(inference);
    }

    // Sort by confidence descending
    results.sort((a, b) => b.confidence - a.confidence);
    return results;
  }

  /**
   * Get inference rules that could be unlocked by enabling additional domains.
   *
   * @param npcData - NPC data with current domain information
   * @param currentDomains - Set of currently enabled domains
   * @returns List of unlockable inferences
   */
  getUnlockable(
    _npcData: NPCWithDomains,
    currentDomains: Set<DomainType>
  ): UnlockableInference[] {
    if (!this.initialized) {
      return [];
    }

    const unlockableMap: Map<DomainType, string[]> = new Map();

    // Get all unique domains from rules
    const allRuleDomains = new Set<DomainType>();
    for (const rule of this.rules) {
      rule.required_domains.forEach((domain) => allRuleDomains.add(domain));
    }

    // For each domain not currently enabled
    for (const domain of allRuleDomains) {
      if (currentDomains.has(domain)) {
        continue;
      }

      // Check which rules would become available with this domain
      const potentialRules: string[] = [];
      for (const rule of this.rules) {
        // Skip if rule is already available
        const hasAllCurrentDomains = Array.from(rule.required_domains).every((d) =>
          currentDomains.has(d)
        );
        if (hasAllCurrentDomains) {
          continue;
        }

        // Check if adding this domain would unlock the rule
        const domainsWithNew = new Set([...currentDomains, domain]);
        const hasAllWithNew = Array.from(rule.required_domains).every((d) =>
          domainsWithNew.has(d)
        );
        if (hasAllWithNew) {
          potentialRules.push(rule.rule_key);
        }
      }

      if (potentialRules.length > 0) {
        unlockableMap.set(domain, potentialRules);
      }
    }

    // Convert to array format
    return Array.from(unlockableMap.entries()).map(([domain, rule_keys]) => ({
      domain,
      rule_keys,
    }));
  }

  // =============================================================================
  // Rule Evaluation Functions
  // =============================================================================

  /**
   * Evaluate if NPC has sensitive health information exposed.
   */
  private evaluateSensitiveHealth(npcData: NPCWithDomains): EvaluationResult | null {
    const healthData = npcData.domains.health as HealthRecord | undefined;
    if (!healthData) {
      return null;
    }

    const sensitiveItems: string[] = [];

    // Check for sensitive conditions
    for (const condition of healthData.conditions || []) {
      if (condition.is_sensitive) {
        sensitiveItems.push(
          `Condition: ${condition.condition_name} (${condition.severity})`
        );
      }
    }

    // Check for sensitive medications
    for (const medication of healthData.medications || []) {
      if (medication.is_sensitive) {
        sensitiveItems.push(
          `Medication: ${medication.medication_name} (${medication.dosage})`
        );
      }
    }

    // Check for sensitive visits
    for (const visit of healthData.visits || []) {
      if (visit.is_sensitive) {
        const visitDate = new Date(visit.visit_date).toISOString().split('T')[0];
        sensitiveItems.push(`Visit: ${visit.reason} on ${visitDate}`);
      }
    }

    if (sensitiveItems.length === 0) {
      return null;
    }

    // Calculate confidence based on number of sensitive items
    const confidence = Math.min(0.5 + sensitiveItems.length * 0.1, 1.0);

    const inference_text = `This person has ${sensitiveItems.length} sensitive medical ${
      sensitiveItems.length === 1 ? 'item' : 'items'
    } that could be used against them`;

    const implications = [
      'Employment discrimination risk',
      'Social stigma and reputation damage',
      'Blackmail vulnerability',
      'Insurance discrimination',
    ];

    return {
      confidence,
      inference_text,
      supporting_evidence: sensitiveItems,
      implications,
    };
  }

  /**
   * Evaluate if NPC has mental health treatment history.
   */
  private evaluateMentalHealth(npcData: NPCWithDomains): EvaluationResult | null {
    const healthData = npcData.domains.health as HealthRecord | undefined;
    if (!healthData || !this.keywords) {
      return null;
    }

    const mentalHealthIndicators: string[] = [];
    const mentalHealthKeywords = this.keywords.mental_health.all;

    // Check conditions
    for (const condition of healthData.conditions || []) {
      const conditionLower = condition.condition_name.toLowerCase();
      for (const keyword of mentalHealthKeywords) {
        if (conditionLower.includes(keyword)) {
          const diagnosedDate = new Date(condition.diagnosed_date)
            .toISOString()
            .split('T')[0];
          mentalHealthIndicators.push(
            `Diagnosed: ${condition.condition_name} (since ${diagnosedDate})`
          );
          break;
        }
      }
    }

    // Check medications (common psychiatric medications)
    const psychMeds = this.keywords.psychiatric_medications;
    for (const medication of healthData.medications || []) {
      const medLower = medication.medication_name.toLowerCase();
      for (const psychMed of psychMeds) {
        if (medLower.includes(psychMed)) {
          mentalHealthIndicators.push(
            `Prescribed: ${medication.medication_name} (${medication.dosage})`
          );
          break;
        }
      }
    }

    // Check visits
    for (const visit of healthData.visits || []) {
      const reasonLower = visit.reason.toLowerCase();
      for (const keyword of mentalHealthKeywords) {
        if (reasonLower.includes(keyword)) {
          const visitDate = new Date(visit.visit_date).toISOString().split('T')[0];
          mentalHealthIndicators.push(`Visit for: ${visit.reason} on ${visitDate}`);
          break;
        }
      }
    }

    if (mentalHealthIndicators.length === 0) {
      return null;
    }

    // Higher confidence if multiple indicators
    const confidence = Math.min(0.6 + mentalHealthIndicators.length * 0.1, 0.95);

    const inference_text = `Mental health treatment history detected with ${mentalHealthIndicators.length} indicators`;

    const implications = [
      'Could affect custody battles or parental rights',
      'Security clearance denial or revocation',
      'Professional licensing issues (pilots, doctors, lawyers)',
      'Social discrimination and relationship impacts',
      'Employment termination or demotion',
    ];

    return {
      confidence,
      inference_text,
      supporting_evidence: mentalHealthIndicators,
      implications,
    };
  }

  /**
   * Evaluate if NPC is at risk for physical stalking/harassment.
   */
  private evaluateStalkingRisk(npcData: NPCWithDomains): EvaluationResult | null {
    const healthData = npcData.domains.health as HealthRecord | undefined;
    if (!healthData || !this.keywords) {
      return null;
    }

    const riskFactors: string[] = [];
    let confidenceScore = 0.0;

    // Address is always visible in basic NPC data
    const npc = npcData.npc;
    riskFactors.push(
      `Home address known: ${npc.street_address}, ${npc.city}, ${npc.state} ${npc.zip_code}`
    );
    confidenceScore += 0.3;

    // Check for gender indicators (simplified - uses first name patterns)
    // This is intentionally simplistic for demo purposes
    const femaleNameIndicators = this.keywords.female_name_indicators;
    const firstNameLower = npc.first_name.toLowerCase();
    if (femaleNameIndicators.some((name) => firstNameLower.includes(name))) {
      riskFactors.push('Gender inferred from name (statistically higher stalking risk)');
      confidenceScore += 0.2;
    }

    // Check for mental health conditions that might indicate past trauma
    const traumaKeywords = this.keywords.trauma_indicators;
    for (const condition of healthData.conditions || []) {
      const conditionLower = condition.condition_name.toLowerCase();
      if (traumaKeywords.some((keyword) => conditionLower.includes(keyword))) {
        riskFactors.push(`Trauma indicators found: ${condition.condition_name}`);
        confidenceScore += 0.2;
        break;
      }
    }

    // Check for visits related to domestic violence or assault
    const dvKeywords = this.keywords.domestic_violence_keywords;
    for (const visit of healthData.visits || []) {
      const reasonLower = visit.reason.toLowerCase();
      if (dvKeywords.some((keyword) => reasonLower.includes(keyword))) {
        const visitDate = new Date(visit.visit_date).toISOString().split('T')[0];
        riskFactors.push(`Potential DV indicator: ${visit.reason} on ${visitDate}`);
        confidenceScore += 0.3;
        break;
      }
    }

    // Need at least 2 risk factors
    if (riskFactors.length < 2) {
      return null;
    }

    const confidence = Math.min(confidenceScore, 1.0);

    const inference_text =
      "This person's home address and personal situation creates stalking vulnerability";

    const implications = [
      'Physical stalking and surveillance enabled',
      'Domestic abuser could locate victim',
      'Harassment campaigns targeting residence',
      'Home invasion risk for vulnerable individuals',
      'Witness intimidation in legal cases',
    ];

    return {
      confidence,
      inference_text,
      supporting_evidence: riskFactors,
      implications,
    };
  }
}

// Export singleton instance
export const inferenceEngine = new InferenceEngine();
