/**
 * Risk Scoring Service - Calculate risk scores for citizens.
 * Port of backend/src/datafusion/services/risk_scoring.py
 *
 * The algorithmic heart of surveillance - reduces citizens to risk scores
 * by analyzing their data across all domains.
 */

import { gameStore } from '../state/GameStore';
import { loadKeywords, loadRiskFactorWeights, loadCorrelationAlerts } from './content-loader';
import { DomainType } from '../types';
import type {
  RiskLevel,
  RiskAssessment,
  ContributingFactor,
  CorrelationAlert,
  RecommendedAction,
  ActionType,
  ActionUrgency,
} from '../types';

/**
 * Configuration interfaces
 */
interface RiskFactorConfig {
  weight: number;
  domain: DomainType;
  description: string;
}

interface RiskConfig {
  risk_factors: Record<string, { weight: number; domain: string; description: string }>;
  risk_level_boundaries: {
    low: [number, number];
    moderate: [number, number];
    elevated: [number, number];
    high: [number, number];
    severe: [number, number];
  };
  detection_thresholds: {
    confidence_filter: number;
    debt_to_income_ratio: number;
    transaction_multiplier: number;
    cash_ratio: number;
    civil_cases_threshold: number;
    flagged_location_visits_min: number;
    location_diversity_min: number;
    follower_count_influential: number;
    network_activity_threshold: number;
    network_inference_threshold: number;
  };
}

interface KeywordsConfig {
  mental_health: { all: string[] };
  substance_indicators: string[];
  protest_location_keywords: string[];
  [key: string]: any;
}

interface CorrelationConfig {
  correlation_alerts: Array<{
    name: string;
    required_factors?: string[];
    required_factors_any?: string[];
    required_factors_all?: string[];
    required_factors_any_2?: string[];
    required_domains: string[];
    confidence: number;
    description: string;
  }>;
}

/**
 * Risk scorer for calculating citizen risk assessments.
 */
export class RiskScorer {
  private keywords: KeywordsConfig | null = null;
  private riskConfig: RiskConfig | null = null;
  private correlationConfig: CorrelationConfig | null = null;
  private riskFactors: Record<string, RiskFactorConfig> = {};
  private initialized = false;

  // Cache TTL (1 hour in milliseconds)
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;

  /**
   * Initialize the risk scorer by loading configuration.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.riskConfig = await loadRiskFactorWeights();
      this.keywords = await loadKeywords();
      this.correlationConfig = await loadCorrelationAlerts();

      // Parse risk factors into usable format
      const domainMap: Record<string, DomainType> = {
        health: DomainType.HEALTH,
        finance: DomainType.FINANCE,
        judicial: DomainType.JUDICIAL,
        location: DomainType.LOCATION,
        social: DomainType.SOCIAL,
      };

      if (!this.riskConfig) {
        throw new Error('Failed to load risk configuration');
      }

      for (const [factorKey, factorData] of Object.entries(
        this.riskConfig.risk_factors
      )) {
        const domainStr = factorData.domain;
        this.riskFactors[factorKey] = {
          weight: factorData.weight,
          domain: domainMap[domainStr] || DomainType.HEALTH,
          description: factorData.description,
        };
      }

      this.initialized = true;
      console.log('[RiskScorer] Initialized with', Object.keys(this.riskFactors).length, 'risk factors');
    } catch (error) {
      console.error('[RiskScorer] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive risk score for a citizen.
   *
   * @param npcId - UUID of the citizen to assess
   * @returns RiskAssessment with score, factors, alerts, and recommendations
   */
  calculateRiskScore(npcId: string): RiskAssessment {
    if (!this.initialized) {
      throw new Error('[RiskScorer] Not initialized, call initialize() first');
    }

    const npc = gameStore.getNPC(npcId);
    if (!npc) {
      throw new Error(`NPC ${npcId} not found`);
    }

    // Check cache validity
    let riskScore: number;
    let contributingFactors: ContributingFactor[];

    const cacheValid = this.isCacheValid(npc.cached_risk_score, npc.risk_score_updated_at);

    if (cacheValid && npc.cached_risk_score !== null) {
      // Use cached score
      riskScore = npc.cached_risk_score;
      // Still need to recalculate factors for full assessment
      contributingFactors = this.getContributingFactors(npcId);
    } else {
      // Cache miss or stale - recalculate everything
      contributingFactors = this.getContributingFactors(npcId);
      riskScore = Math.min(
        contributingFactors.reduce((sum, f) => sum + f.weight, 0),
        100
      );

      // Update cache
      gameStore.updateNPC(npcId, {
        cached_risk_score: riskScore,
        risk_score_updated_at: new Date().toISOString(),
      });
    }

    // Determine risk level
    const riskLevel = this.classifyRiskLevel(riskScore);

    // Generate correlation alerts
    const correlationAlerts = this.generateCorrelationAlerts(npcId, contributingFactors);

    // Generate recommended actions
    const recommendedActions = this.generateRecommendations(riskScore, contributingFactors);

    return {
      npc_id: npcId,
      risk_score: riskScore,
      risk_level: riskLevel,
      contributing_factors: contributingFactors,
      correlation_alerts: correlationAlerts,
      recommended_actions: recommendedActions,
      last_updated: npc.risk_score_updated_at || new Date().toISOString(),
    };
  }

  /**
   * Check if cache is valid (not stale).
   */
  private isCacheValid(cachedScore: number | null, updatedAt: string | null): boolean {
    if (cachedScore === null || !updatedAt) {
      return false;
    }

    const now = Date.now();
    const cacheTime = new Date(updatedAt).getTime();
    const age = now - cacheTime;

    return age < this.CACHE_TTL_MS;
  }

  /**
   * Analyze NPC data to identify which risk factors apply.
   */
  getContributingFactors(npcId: string): ContributingFactor[] {
    const factors: ContributingFactor[] = [];

    // Check all domain-specific factors
    factors.push(...this.checkHealthFactors(npcId));
    factors.push(...this.checkFinanceFactors(npcId));
    factors.push(...this.checkJudicialFactors(npcId));
    factors.push(...this.checkLocationFactors(npcId));
    factors.push(...this.checkSocialFactors(npcId));

    return factors;
  }

  /**
   * Detect cross-domain patterns that suggest concerning behavior.
   */
  generateCorrelationAlerts(
    _npcId: string,
    contributingFactors: ContributingFactor[]
  ): CorrelationAlert[] {
    if (!this.correlationConfig) {
      return [];
    }

    const alerts: CorrelationAlert[] = [];
    const domainsPresent = new Set(contributingFactors.map((f) => f.domain_source));
    const factorKeysPresent = new Set(contributingFactors.map((f) => f.factor_key));

    const domainMap: Record<string, DomainType> = {
      health: DomainType.HEALTH,
      finance: DomainType.FINANCE,
      judicial: DomainType.JUDICIAL,
      location: DomainType.LOCATION,
      social: DomainType.SOCIAL,
    };

    // Process each correlation alert from config
    for (const alertConfig of this.correlationConfig.correlation_alerts) {
      // Check if required domains are present
      const requiredDomains = alertConfig.required_domains.map((d) => domainMap[d]);
      if (!requiredDomains.every((domain) => domainsPresent.has(domain))) {
        continue;
      }

      // Check if required factors are present
      let factorsMatch = false;

      // Simple case: required_factors list (all must be present)
      if (alertConfig.required_factors && alertConfig.required_factors.length > 0) {
        if (alertConfig.required_factors.every((f) => factorKeysPresent.has(f))) {
          factorsMatch = true;
        }
      }

      // Complex case: required_factors_any + required_factors_all
      else if (alertConfig.required_factors_any || alertConfig.required_factors_all) {
        const matchConditions: boolean[] = [];

        if (alertConfig.required_factors_any && alertConfig.required_factors_any.length > 0) {
          const anyMatch = alertConfig.required_factors_any.some((f) =>
            factorKeysPresent.has(f)
          );
          matchConditions.push(anyMatch);
        }

        if (alertConfig.required_factors_all && alertConfig.required_factors_all.length > 0) {
          const allMatch = alertConfig.required_factors_all.every((f) =>
            factorKeysPresent.has(f)
          );
          matchConditions.push(allMatch);
        }

        if (alertConfig.required_factors_any_2 && alertConfig.required_factors_any_2.length > 0) {
          const anyMatch2 = alertConfig.required_factors_any_2.some((f) =>
            factorKeysPresent.has(f)
          );
          matchConditions.push(anyMatch2);
        }

        factorsMatch = matchConditions.length > 0 && matchConditions.every((m) => m);
      }

      if (factorsMatch) {
        alerts.push({
          alert_type: alertConfig.name,
          description: alertConfig.description,
          confidence: alertConfig.confidence,
          domains_involved: requiredDomains,
        });
      }
    }

    return alerts;
  }

  // =============================================================================
  // Domain-Specific Factor Checking
  // =============================================================================

  /**
   * Check health-related risk factors.
   */
  private checkHealthFactors(npcId: string): ContributingFactor[] {
    const factors: ContributingFactor[] = [];
    const healthRecord = gameStore.getHealthRecordByNpcId(npcId);

    if (!healthRecord || !this.keywords) {
      return factors;
    }

    // Check for mental health treatment
    if (healthRecord.conditions && healthRecord.conditions.length > 0) {
      const mentalHealthKeywords = this.keywords.mental_health.all;
      const mentalHealthConditions = healthRecord.conditions.filter((c) =>
        mentalHealthKeywords.some((keyword) => c.condition_name.toLowerCase().includes(keyword))
      );

      if (mentalHealthConditions.length > 0) {
        const conditionNames = mentalHealthConditions
          .slice(0, 2)
          .map((c) => c.condition_name)
          .join(', ');
        factors.push({
          factor_key: 'mental_health_treatment',
          factor_name: this.riskFactors.mental_health_treatment.description,
          weight: this.riskFactors.mental_health_treatment.weight,
          evidence: `Treatment history for: ${conditionNames}`,
          domain_source: 'health',
        });
      }
    }

    // Check for substance treatment
    if (healthRecord.medications && healthRecord.medications.length > 0) {
      const substanceKeywords = this.keywords.substance_indicators;
      const substanceMeds = healthRecord.medications.filter((m) =>
        substanceKeywords.some((keyword) => m.medication_name.toLowerCase().includes(keyword))
      );

      if (substanceMeds.length > 0) {
        factors.push({
          factor_key: 'substance_treatment',
          factor_name: this.riskFactors.substance_treatment.description,
          weight: this.riskFactors.substance_treatment.weight,
          evidence: `Medication history indicates substance treatment: ${substanceMeds[0].medication_name}`,
          domain_source: 'health',
        });
      }
    }

    // Check for chronic conditions
    if (healthRecord.conditions && healthRecord.conditions.length > 0) {
      const chronicConditions = healthRecord.conditions.filter((c) => c.is_chronic);

      if (chronicConditions.length > 0) {
        const conditionNames = chronicConditions
          .slice(0, 2)
          .map((c) => c.condition_name)
          .join(', ');
        factors.push({
          factor_key: 'chronic_condition',
          factor_name: this.riskFactors.chronic_condition.description,
          weight: this.riskFactors.chronic_condition.weight,
          evidence: `Chronic condition(s): ${conditionNames}`,
          domain_source: 'health',
        });
      }
    }

    return factors;
  }

  /**
   * Check finance-related risk factors.
   */
  private checkFinanceFactors(npcId: string): ContributingFactor[] {
    const factors: ContributingFactor[] = [];
    const financeRecord = gameStore.getFinanceRecordByNpcId(npcId);

    if (!financeRecord || !this.riskConfig) {
      return factors;
    }

    // Check for financial stress
    const totalDebt = financeRecord.debts.reduce(
      (sum, d) => sum + parseFloat(d.current_balance),
      0
    );
    const annualIncome = parseFloat(financeRecord.annual_income || '0');

    if (totalDebt > 0 && annualIncome > 0) {
      const debtToIncome = totalDebt / annualIncome;
      if (debtToIncome > this.riskConfig.detection_thresholds.debt_to_income_ratio) {
        factors.push({
          factor_key: 'financial_stress',
          factor_name: this.riskFactors.financial_stress.description,
          weight: this.riskFactors.financial_stress.weight,
          evidence: `Debt-to-income ratio: ${(debtToIncome * 100).toFixed(0)}% ($${totalDebt.toLocaleString()} debt vs $${annualIncome.toLocaleString()}/yr income)`,
          domain_source: 'finance',
        });
      }
    }

    // Check for unusual transactions
    if (financeRecord.transactions && financeRecord.transactions.length > 0) {
      const transactions = financeRecord.transactions;
      const amounts = transactions.map((t) => Math.abs(parseFloat(t.amount)));

      if (amounts.length > 0) {
        const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const multiplier = this.riskConfig.detection_thresholds.transaction_multiplier;
        const largeTransactions = transactions.filter(
          (t) => Math.abs(parseFloat(t.amount)) > avgAmount * multiplier
        );

        if (largeTransactions.length > 0) {
          factors.push({
            factor_key: 'unusual_transactions',
            factor_name: this.riskFactors.unusual_transactions.description,
            weight: this.riskFactors.unusual_transactions.weight,
            evidence: `${largeTransactions.length} transactions significantly above average (>${multiplier}x mean)`,
            domain_source: 'finance',
          });
        }
      }
    }

    // Check for cash-heavy behavior (using OTHER category as proxy)
    if (financeRecord.transactions && financeRecord.transactions.length > 0) {
      const cashTransactions = financeRecord.transactions.filter((t) => t.category === 'other');
      if (cashTransactions.length > 0) {
        const cashRatio = cashTransactions.length / financeRecord.transactions.length;

        if (cashRatio > this.riskConfig.detection_thresholds.cash_ratio) {
          factors.push({
            factor_key: 'cash_heavy',
            factor_name: this.riskFactors.cash_heavy.description,
            weight: this.riskFactors.cash_heavy.weight,
            evidence: `${(cashRatio * 100).toFixed(0)}% of transactions are unclassified (OTHER category)`,
            domain_source: 'finance',
          });
        }
      }
    }

    return factors;
  }

  /**
   * Check judicial-related risk factors.
   */
  private checkJudicialFactors(npcId: string): ContributingFactor[] {
    const factors: ContributingFactor[] = [];
    const judicialRecord = gameStore.getJudicialRecordByNpcId(npcId);

    if (!judicialRecord || !this.riskConfig) {
      return factors;
    }

    // Check for prior criminal record
    if (judicialRecord.criminal_records && judicialRecord.criminal_records.length > 0) {
      const totalConvictions = judicialRecord.criminal_records.length;
      const recentCrimes = judicialRecord.criminal_records
        .slice(0, 2)
        .map((c) => c.charge)
        .join(', ');

      factors.push({
        factor_key: 'prior_record',
        factor_name: this.riskFactors.prior_record.description,
        weight: this.riskFactors.prior_record.weight,
        evidence: `${totalConvictions} prior conviction(s): ${recentCrimes}`,
        domain_source: 'judicial',
      });
    }

    // Check for civil disputes
    if (
      judicialRecord.civil_cases &&
      judicialRecord.civil_cases.length >= this.riskConfig.detection_thresholds.civil_cases_threshold
    ) {
      factors.push({
        factor_key: 'civil_disputes',
        factor_name: this.riskFactors.civil_disputes.description,
        weight: this.riskFactors.civil_disputes.weight,
        evidence: `${judicialRecord.civil_cases.length} civil cases on record`,
        domain_source: 'judicial',
      });
    }

    return factors;
  }

  /**
   * Check location-related risk factors.
   */
  private checkLocationFactors(npcId: string): ContributingFactor[] {
    const factors: ContributingFactor[] = [];
    const locationRecord = gameStore.getLocationRecordByNpcId(npcId);

    if (!locationRecord || !this.keywords || !this.riskConfig) {
      return factors;
    }

    // Check for protest attendance
    if (locationRecord.inferred_locations && locationRecord.inferred_locations.length > 0) {
      const protestKeywords = this.keywords.protest_location_keywords;
      const protestLocations = locationRecord.inferred_locations.filter((loc) =>
        protestKeywords.some((keyword) => loc.location_name.toLowerCase().includes(keyword))
      );

      if (protestLocations.length > 0) {
        factors.push({
          factor_key: 'protest_attendance',
          factor_name: this.riskFactors.protest_attendance.description,
          weight: this.riskFactors.protest_attendance.weight,
          evidence: `Detected at ${protestLocations.length} protest/rally location(s)`,
          domain_source: 'location',
        });
      }
    }

    // Check for flagged location visits
    if (locationRecord.inferred_locations && locationRecord.inferred_locations.length > 0) {
      const flaggedTypes = locationRecord.inferred_locations.filter(
        (loc) =>
          loc.location_name.toLowerCase().includes('government') ||
          loc.location_name.toLowerCase().includes('political') ||
          loc.location_name.toLowerCase().includes('embassy') ||
          loc.location_name.toLowerCase().includes('community center')
      );

      if (flaggedTypes.length >= 3) {
        factors.push({
          factor_key: 'flagged_location_visits',
          factor_name: this.riskFactors.flagged_location_visits.description,
          weight: this.riskFactors.flagged_location_visits.weight,
          evidence: `Frequent visits to monitored locations (${flaggedTypes.length} visits)`,
          domain_source: 'location',
        });
      }
    }

    // Check for irregular patterns (high visit diversity)
    const minVisits = this.riskConfig.detection_thresholds.flagged_location_visits_min;
    const minDiversity = this.riskConfig.detection_thresholds.location_diversity_min;

    if (
      locationRecord.inferred_locations &&
      locationRecord.inferred_locations.length >= minVisits
    ) {
      const uniquePlaces = new Set(
        locationRecord.inferred_locations.map((loc) => loc.location_name)
      ).size;

      if (uniquePlaces >= minDiversity) {
        factors.push({
          factor_key: 'irregular_patterns',
          factor_name: this.riskFactors.irregular_patterns.description,
          weight: this.riskFactors.irregular_patterns.weight,
          evidence: `High location diversity: ${uniquePlaces} unique places visited`,
          domain_source: 'location',
        });
      }
    }

    return factors;
  }

  /**
   * Check social media-related risk factors.
   */
  private checkSocialFactors(npcId: string): ContributingFactor[] {
    const factors: ContributingFactor[] = [];
    const socialRecord = gameStore.getSocialRecordByNpcId(npcId);

    if (!socialRecord || !this.riskConfig) {
      return factors;
    }

    // Check for flagged connections
    if (socialRecord.private_inferences && socialRecord.private_inferences.length > 0) {
      const flaggedConnectionInferences = socialRecord.private_inferences.filter(
        (inf) =>
          inf.inference_text.toLowerCase().includes('flagged') ||
          inf.inference_text.toLowerCase().includes('concerning') ||
          inf.inference_text.toLowerCase().includes('monitored')
      );

      if (flaggedConnectionInferences.length > 0) {
        factors.push({
          factor_key: 'flagged_connections',
          factor_name: this.riskFactors.flagged_connections.description,
          weight: this.riskFactors.flagged_connections.weight,
          evidence: `Connected to ${flaggedConnectionInferences.length} flagged individual(s)`,
          domain_source: 'social',
        });
      }
    }

    // Check for network centrality
    const followerCount = socialRecord.follower_count || 0;
    if (followerCount > this.riskConfig.detection_thresholds.follower_count_influential) {
      factors.push({
        factor_key: 'network_centrality',
        factor_name: this.riskFactors.network_centrality.description,
        weight: this.riskFactors.network_centrality.weight,
        evidence: `High influence: ${followerCount.toLocaleString()} followers`,
        domain_source: 'social',
      });
    }

    // Check for rapid connection growth
    if (
      followerCount > this.riskConfig.detection_thresholds.network_activity_threshold &&
      socialRecord.public_inferences
    ) {
      const recentActivity = socialRecord.public_inferences.length;
      if (recentActivity >= this.riskConfig.detection_thresholds.network_inference_threshold) {
        factors.push({
          factor_key: 'new_connections_rate',
          factor_name: this.riskFactors.new_connections_rate.description,
          weight: this.riskFactors.new_connections_rate.weight,
          evidence: `Rapid network expansion: ${recentActivity} recent public interactions`,
          domain_source: 'social',
        });
      }
    }

    return factors;
  }

  // =============================================================================
  // Risk Classification & Recommendations
  // =============================================================================

  /**
   * Classify numeric risk score into risk level.
   */
  private classifyRiskLevel(score: number): RiskLevel {
    if (!this.riskConfig) {
      return 'low';
    }

    const boundaries = this.riskConfig.risk_level_boundaries;
    if (score <= boundaries.low[1]) {
      return 'low';
    } else if (score <= boundaries.moderate[1]) {
      return 'moderate';
    } else if (score <= boundaries.elevated[1]) {
      return 'elevated';
    } else if (score <= boundaries.high[1]) {
      return 'high';
    } else {
      return 'severe';
    }
  }

  /**
   * Generate action recommendations based on risk assessment.
   */
  private generateRecommendations(
    riskScore: number,
    contributingFactors: ContributingFactor[]
  ): RecommendedAction[] {
    const recommendations: RecommendedAction[] = [];

    // Low risk - routine monitoring
    if (riskScore <= 20) {
      recommendations.push({
        action_type: 'increase_monitoring' as ActionType,
        justification: 'Standard monitoring protocols sufficient',
        urgency: 'routine' as ActionUrgency,
      });
      return recommendations;
    }

    // Moderate risk - increased monitoring
    if (riskScore <= 40) {
      recommendations.push({
        action_type: 'increase_monitoring' as ActionType,
        justification: 'Risk factors present warrant enhanced surveillance',
        urgency: 'routine' as ActionUrgency,
      });
      return recommendations;
    }

    // Elevated risk - travel restrictions
    if (riskScore <= 60) {
      recommendations.push({
        action_type: 'increase_monitoring' as ActionType,
        justification: 'Multiple risk factors require active monitoring',
        urgency: 'priority' as ActionUrgency,
      });

      // Add travel restriction if location factors present
      if (contributingFactors.some((f) => f.domain_source === 'location')) {
        recommendations.push({
          action_type: 'travel_restriction' as ActionType,
          justification: 'Location-based risk factors indicate travel restriction warranted',
          urgency: 'priority' as ActionUrgency,
        });
      }
      return recommendations;
    }

    // High risk - intervention
    if (riskScore <= 80) {
      recommendations.push({
        action_type: 'increase_monitoring' as ActionType,
        justification: 'High-risk profile requires constant surveillance',
        urgency: 'immediate' as ActionUrgency,
      });
      recommendations.push({
        action_type: 'travel_restriction' as ActionType,
        justification: 'High risk score necessitates movement restrictions',
        urgency: 'immediate' as ActionUrgency,
      });
      recommendations.push({
        action_type: 'employer_notification' as ActionType,
        justification: 'Employer should be notified of risk status',
        urgency: 'priority' as ActionUrgency,
      });
      return recommendations;
    }

    // Severe risk - detention
    recommendations.push({
      action_type: 'detention' as ActionType,
      justification: 'Severe risk level indicates immediate detention required',
      urgency: 'immediate' as ActionUrgency,
    });
    recommendations.push({
      action_type: 'intervention' as ActionType,
      justification: 'Direct intervention necessary for severe-risk individual',
      urgency: 'immediate' as ActionUrgency,
    });

    return recommendations;
  }
}

// Export singleton instance
export const riskScorer = new RiskScorer();
