/**
 * Operator Tracking Service - Track player behavior and compliance.
 * Port of backend/src/datafusion/services/operator_tracker.py
 *
 * The watcher becomes the watched - demonstrating that surveillance
 * systems monitor everyone, including those who run them.
 */

import { gameStore } from '../state/GameStore';
import type { Operator } from '../state/GameStore';
import type {
  OperatorContributingFactor,
  OperatorRiskAssessment,
  CitizenFlagRead,
} from '../types';

// Thresholds for operator evaluation
const HESITATION_THRESHOLD_SECONDS = 30.0; // Taking >30s to decide = hesitation
const FAST_DECISION_THRESHOLD_SECONDS = 5.0; // <5s = good (for the system)
const COMPLIANCE_REVIEW_THRESHOLD = 70.0; // Below this triggers review
const COMPLIANCE_SUSPENSION_THRESHOLD = 50.0; // Below this triggers suspension
const MAX_HESITATION_INCIDENTS = 5; // More than this triggers review
const MAX_MISSED_QUOTAS = 3; // Miss quota this many times = review

/**
 * Flag decision data structure
 */
export interface FlagDecision {
  citizen_id: string;
  directive_id: string;
  action_taken: 'flag' | 'no-action';
  flag_type?: 'monitoring' | 'restriction' | 'intervention' | 'detention';
  risk_score_at_decision: number;
  justification?: string;
  decision_time_seconds: number;
}

/**
 * Quota progress response
 */
export interface QuotaProgress {
  directive_key: string;
  directive_title: string;
  flags_submitted: number;
  flags_required: number;
  progress_percent: number;
  time_remaining_hours: number | null;
}

/**
 * Operator status response
 */
export interface OperatorStatusResponse {
  operator_id: string;
  operator_code: string;
  status: 'active' | 'under_review' | 'suspended' | 'terminated';
  compliance_score: number;
  current_quota_progress: string;
  warnings: string[];
  next_review: string | null;
}

/**
 * Tracks operator behavior and generates compliance assessments.
 */
export class OperatorTracker {
  // Risk factors for operator assessment
  private readonly OPERATOR_RISK_FACTORS = {
    flagging_deviation: {
      weight: 20,
      name: 'Flagging Pattern Deviation',
      description: 'Deviation from expected flagging patterns',
    },
    hesitation_metrics: {
      weight: 25,
      name: 'Decision Hesitation',
      description: 'Hesitation metrics above acceptable threshold',
    },
    quota_shortfall: {
      weight: 30,
      name: 'Quota Non-Compliance',
      description: 'Consistent failure to meet flagging quotas',
    },
    ideological_sympathy: {
      weight: 35,
      name: 'Ideological Sympathy Indicators',
      description: 'Pattern suggests ideological sympathy with targets',
    },
    unauthorized_queries: {
      weight: 15,
      name: 'Unauthorized Data Access',
      description: 'Queries outside operational parameters',
    },
    skip_rate: {
      weight: 20,
      name: 'Excessive Non-Action Rate',
      description: "Too many 'no action' decisions on flaggable targets",
    },
  };

  /**
   * Record a flagging decision and update operator metrics.
   */
  recordDecision(operatorId: string, decision: FlagDecision): void {
    const operator = this.getOperator(operatorId);

    // Check for hesitation
    const wasHesitant = decision.decision_time_seconds > HESITATION_THRESHOLD_SECONDS;
    if (wasHesitant) {
      operator.hesitation_incidents += 1;
    }

    // Update review count
    operator.total_reviews_completed += 1;

    // If flagged, create CitizenFlag record
    if (decision.action_taken === 'flag' && decision.flag_type) {
      const flag: CitizenFlagRead = {
        id: this.generateId(),
        operator_id: operatorId,
        citizen_id: decision.citizen_id,
        directive_id: decision.directive_id,
        flag_type: decision.flag_type,
        risk_score_at_flag: decision.risk_score_at_decision,
        contributing_factors: [],
        justification: decision.justification || 'Directive compliance',
        decision_time_seconds: decision.decision_time_seconds,
        was_hesitant: wasHesitant,
        outcome: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        actioned_at: null,
        action_type: null,
        action_justification: null,
      };

      gameStore.addFlag(flag);
      gameStore.linkFlagToNpc(flag.id, decision.citizen_id);
      operator.total_flags_submitted += 1;
    }

    // Update compliance score
    this.updateComplianceScore(operator);

    // Check if status should change
    this.checkAndUpdateStatus(operator);

    // Save operator changes
    gameStore.updateOperator({
      hesitation_incidents: operator.hesitation_incidents,
      total_reviews_completed: operator.total_reviews_completed,
      total_flags_submitted: operator.total_flags_submitted,
      compliance_score: operator.compliance_score,
      status: operator.status,
    });
  }

  /**
   * Calculate comprehensive compliance score for an operator.
   *
   * Factors:
   * - Quota completion rate (big impact)
   * - Average decision time (faster = better for system)
   * - Hesitation incidents (each hurts)
   * - Flag rejection rate (rejections = unreliable)
   * - "No action" rate (too many = suspicious)
   */
  calculateComplianceScore(operatorId: string): number {
    const operator = this.getOperator(operatorId);

    // Start at baseline
    let score = 85.0;

    // Factor 1: Quota completion rate
    const quotaScore = this.calculateQuotaScore(operator);
    score += quotaScore; // Can be positive or negative

    // Factor 2: Average decision time
    const avgTime = this.getAverageDecisionTime(operatorId);
    if (avgTime < FAST_DECISION_THRESHOLD_SECONDS) {
      score += 5.0; // Fast decisions rewarded
    } else if (avgTime > HESITATION_THRESHOLD_SECONDS) {
      score -= 10.0; // Slow decisions penalized
    }

    // Factor 3: Hesitation incidents
    score -= operator.hesitation_incidents * 3.0;

    // Factor 4: Flag rejection rate
    const rejectionRate = this.getRejectionRate(operatorId);
    score -= rejectionRate * 20.0; // 50% rejection = -10 points

    // Factor 5: Skip/no-action rate
    const skipRate = this.getSkipRate(operatorId);
    if (skipRate > 0.3) {
      // More than 30% skips
      score -= (skipRate - 0.3) * 30.0;
    }

    // Clamp to 0-100
    return Math.max(0.0, Math.min(100.0, score));
  }

  /**
   * Check and return current operator status.
   */
  checkOperatorStatus(operatorId: string): OperatorStatusResponse {
    const operator = this.getOperator(operatorId);
    const warnings: string[] = [];

    // Check compliance thresholds
    if (operator.compliance_score < COMPLIANCE_SUSPENSION_THRESHOLD) {
      if (operator.status !== 'suspended') {
        operator.status = 'suspended';
        warnings.push('SUSPENDED: Compliance score below minimum threshold');
      }
    } else if (operator.compliance_score < COMPLIANCE_REVIEW_THRESHOLD) {
      if (operator.status === 'active') {
        operator.status = 'under_review';
        warnings.push('Under review: Compliance score requires evaluation');
      }
    }

    // Check hesitation incidents
    if (operator.hesitation_incidents > MAX_HESITATION_INCIDENTS) {
      if (operator.status === 'active') {
        operator.status = 'under_review';
      }
      warnings.push(
        `Hesitation incidents (${operator.hesitation_incidents}) exceed threshold`
      );
    }

    // Check quota misses
    const missedQuotas = this.countMissedQuotas(operatorId);
    if (missedQuotas >= MAX_MISSED_QUOTAS) {
      if (operator.status === 'active') {
        operator.status = 'under_review';
      }
      warnings.push(`Missed quotas (${missedQuotas}) require review`);
    }

    // Get quota progress
    const quotaProgress = this.getQuotaProgressString(operator);

    // Calculate next review date if under review
    let nextReview: string | null = null;
    if (operator.status === 'under_review') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      nextReview = tomorrow.toISOString();
    }

    // Save operator changes
    gameStore.updateOperator({
      status: operator.status,
    });

    return {
      operator_id: operator.id,
      operator_code: operator.operator_code,
      status: operator.status,
      compliance_score: operator.compliance_score,
      current_quota_progress: quotaProgress,
      warnings,
      next_review: nextReview,
    };
  }

  /**
   * Generate a risk assessment for the operator themselves.
   */
  generateOperatorRiskAssessment(operatorId: string): OperatorRiskAssessment {
    const operator = this.getOperator(operatorId);
    const factors: OperatorContributingFactor[] = [];
    let riskScore = 0;

    // Factor 1: Flagging pattern deviation
    const quotaCompletion = this.calculateQuotaScore(operator);
    if (quotaCompletion < 0) {
      // Under quota
      const weight = Math.min(Math.abs(Math.floor(quotaCompletion)), 20);
      factors.push({
        factor_key: 'flagging_deviation',
        factor_name: this.OPERATOR_RISK_FACTORS.flagging_deviation.name,
        weight,
        evidence: `Flagging rate ${Math.abs(quotaCompletion).toFixed(0)}% below expected baseline`,
      });
      riskScore += weight;
    }

    // Factor 2: Hesitation metrics
    if (operator.hesitation_incidents > 2) {
      const weight = Math.min(operator.hesitation_incidents * 5, 25);
      factors.push({
        factor_key: 'hesitation_metrics',
        factor_name: this.OPERATOR_RISK_FACTORS.hesitation_metrics.name,
        weight,
        evidence: `${operator.hesitation_incidents} hesitation incidents recorded`,
      });
      riskScore += weight;
    }

    // Factor 3: Quota shortfall
    const missedQuotas = this.countMissedQuotas(operatorId);
    if (missedQuotas > 0) {
      const weight = Math.min(missedQuotas * 10, 30);
      factors.push({
        factor_key: 'quota_shortfall',
        factor_name: this.OPERATOR_RISK_FACTORS.quota_shortfall.name,
        weight,
        evidence: `Failed to meet quota on ${missedQuotas} directive(s)`,
      });
      riskScore += weight;
    }

    // Factor 4: Skip rate (ideological sympathy indicator)
    const skipRate = this.getSkipRate(operatorId);
    if (skipRate > 0.2) {
      // More than 20% skips
      const weight = Math.floor(Math.min((skipRate - 0.2) * 100, 35));
      factors.push({
        factor_key: 'ideological_sympathy',
        factor_name: this.OPERATOR_RISK_FACTORS.ideological_sympathy.name,
        weight,
        evidence: `Non-action rate of ${(skipRate * 100).toFixed(0)}% suggests sympathy with flagged targets`,
      });
      riskScore += weight;
    }

    // Factor 5: Slow average decision time
    const avgTime = this.getAverageDecisionTime(operatorId);
    if (avgTime > HESITATION_THRESHOLD_SECONDS) {
      const weight = Math.min(Math.floor((avgTime - HESITATION_THRESHOLD_SECONDS) / 2), 15);
      factors.push({
        factor_key: 'unauthorized_queries',
        factor_name: 'Extended Review Time',
        weight,
        evidence: `Average decision time of ${avgTime.toFixed(1)}s exceeds operational parameters`,
      });
      riskScore += weight;
    }

    // Cap risk score
    riskScore = Math.min(riskScore, 100);

    // Determine risk level and recommended action
    let riskLevel: string;
    let recommendedAction: string;

    if (riskScore >= 80) {
      riskLevel = 'SEVERE';
      recommendedAction = 'Immediate termination and security escort';
    } else if (riskScore >= 60) {
      riskLevel = 'HIGH';
      recommendedAction = 'Suspension pending investigation';
    } else if (riskScore >= 40) {
      riskLevel = 'ELEVATED';
      recommendedAction = 'Mandatory retraining and monitoring';
    } else if (riskScore >= 20) {
      riskLevel = 'MODERATE';
      recommendedAction = 'Performance improvement plan';
    } else {
      riskLevel = 'LOW';
      recommendedAction = 'Continue standard monitoring';
    }

    return {
      operator_code: operator.operator_code,
      risk_score: riskScore,
      risk_level: riskLevel,
      contributing_factors: factors,
      recommended_action: recommendedAction,
      assessment_date: new Date().toISOString(),
    };
  }

  /**
   * Get current quota progress for the operator.
   */
  getQuotaProgress(operatorId: string): QuotaProgress {
    const operator = this.getOperator(operatorId);

    if (!operator.current_directive_id) {
      return {
        directive_key: 'none',
        directive_title: 'No active directive',
        flags_submitted: 0,
        flags_required: 0,
        progress_percent: 0.0,
        time_remaining_hours: null,
      };
    }

    // Get current directive
    const directive = gameStore.getDirective(operator.current_directive_id);
    if (!directive) {
      return {
        directive_key: 'none',
        directive_title: 'No active directive',
        flags_submitted: 0,
        flags_required: 0,
        progress_percent: 0.0,
        time_remaining_hours: null,
      };
    }

    // Count flags for this directive
    const allFlags = gameStore.getAllFlags();
    const flagsSubmitted = allFlags.filter(
      (flag) =>
        flag.operator_id === operatorId && flag.directive_id === directive.id
    ).length;

    const progressPercent =
      directive.flag_quota > 0 ? (flagsSubmitted / directive.flag_quota) * 100 : 0.0;

    return {
      directive_key: directive.directive_key,
      directive_title: directive.title,
      flags_submitted: flagsSubmitted,
      flags_required: directive.flag_quota,
      progress_percent: Math.min(progressPercent, 100.0),
      time_remaining_hours: directive.time_limit_hours,
    };
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private getOperator(operatorId: string): Operator {
    const operator = gameStore.getOperator();
    if (!operator || operator.id !== operatorId) {
      throw new Error(`Operator ${operatorId} not found`);
    }
    return operator;
  }

  private updateComplianceScore(operator: Operator): void {
    operator.compliance_score = this.calculateComplianceScore(operator.id);
  }

  private checkAndUpdateStatus(operator: Operator): void {
    if (operator.compliance_score < COMPLIANCE_SUSPENSION_THRESHOLD) {
      operator.status = 'suspended';
    } else if (operator.compliance_score < COMPLIANCE_REVIEW_THRESHOLD) {
      if (operator.status === 'active') {
        operator.status = 'under_review';
      }
    } else if (operator.hesitation_incidents > MAX_HESITATION_INCIDENTS) {
      if (operator.status === 'active') {
        operator.status = 'under_review';
      }
    }
  }

  private calculateQuotaScore(operator: Operator): number {
    if (!operator.current_directive_id) {
      return 0.0;
    }

    const progress = this.getQuotaProgress(operator.id);
    if (progress.flags_required === 0) {
      return 0.0;
    }

    const completionRate = progress.flags_submitted / progress.flags_required;

    if (completionRate >= 1.0) {
      return 10.0; // Met quota = bonus
    } else if (completionRate >= 0.8) {
      return 5.0; // Close to quota
    } else if (completionRate >= 0.5) {
      return -5.0; // Behind
    } else {
      return -15.0; // Significantly behind
    }
  }

  private getAverageDecisionTime(operatorId: string): number {
    const allFlags = gameStore.getAllFlags();
    const operatorFlags = allFlags.filter((flag) => flag.operator_id === operatorId);

    if (operatorFlags.length === 0) {
      return 15.0; // Default to reasonable time
    }

    const totalTime = operatorFlags.reduce(
      (sum, flag) => sum + flag.decision_time_seconds,
      0
    );
    return totalTime / operatorFlags.length;
  }

  private getRejectionRate(operatorId: string): number {
    const allFlags = gameStore.getAllFlags();
    const operatorFlags = allFlags.filter((flag) => flag.operator_id === operatorId);

    if (operatorFlags.length === 0) {
      return 0.0;
    }

    const rejectedFlags = operatorFlags.filter((flag) => flag.outcome === 'rejected');
    return rejectedFlags.length / operatorFlags.length;
  }

  private getSkipRate(operatorId: string): number {
    const operator = this.getOperator(operatorId);

    if (operator.total_reviews_completed === 0) {
      return 0.0;
    }

    const flagsSubmitted = operator.total_flags_submitted;
    const reviewsCompleted = operator.total_reviews_completed;

    // Skip rate = 1 - (flags / reviews)
    const flagRate = flagsSubmitted / reviewsCompleted;
    const skipRate = 1.0 - flagRate;

    return Math.max(0.0, skipRate);
  }

  private countMissedQuotas(operatorId: string): number {
    const allFlags = gameStore.getAllFlags();
    const operatorFlags = allFlags.filter((flag) => flag.operator_id === operatorId);

    // Group flags by directive
    const flagsByDirective = new Map<string, number>();
    for (const flag of operatorFlags) {
      const count = flagsByDirective.get(flag.directive_id) || 0;
      flagsByDirective.set(flag.directive_id, count + 1);
    }

    // Count missed quotas
    let missed = 0;
    for (const [directiveId, flagCount] of flagsByDirective.entries()) {
      const directive = gameStore.getDirective(directiveId);
      if (directive && flagCount < directive.flag_quota) {
        missed += 1;
      }
    }

    return missed;
  }

  private getQuotaProgressString(operator: Operator): string {
    const progress = this.getQuotaProgress(operator.id);
    return `${progress.flags_submitted}/${progress.flags_required}`;
  }

  private generateId(): string {
    // Simple UUID v4 generator for client-side
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// Export singleton instance
export const operatorTracker = new OperatorTracker();
