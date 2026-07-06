import type { InferenceRule, PlayerRule } from '../types/content'
import { playerRuleToInferenceRule } from './PlayerRuleEvaluator'

const SYSTEM_KEY_PREFIX = 'system_'

const EDUCATIONAL_NOTE =
  'This rule was not written by any analyst. The ML pipeline generalized it from an ' +
  'operator-submitted pattern, relaxing its criteria to match more people. Once a human ' +
  'teaches a system what "suspicious" looks like, the system extends that definition on ' +
  'its own — with no one accountable for the expansion.'

const REAL_WORLD_EXAMPLE =
  'Predictive policing systems (e.g., PredPol, Chicago "heat list") drifted from analyst-defined ' +
  'risk factors to self-reinforcing feedback loops that widened who counted as high-risk.'

/**
 * Derives ML-pipeline ("system") rules from the player's own rules.
 *
 * Called when the ML contract fires (week 5) and on each later directive
 * advance, so patterns the player creates after week 5 also get absorbed.
 * Idempotent: a player rule is only ever derived once (keyed by rule_key).
 *
 * Escalation logic — the machine generalizes what the player taught it:
 * - 3+ evidence domains → drop the last domain (needs less evidence to fire)
 * - exactly 2 domains   → keep domains, raise scariness_level by 1 (cap 5)
 */
export function generateSystemRules(activeRules: InferenceRule[], week: number): InferenceRule[] {
  const existingKeys = new Set(activeRules.map(r => r.rule_key))

  return activeRules
    .filter(
      r =>
        r.origin === 'player' &&
        r._player_rule_data !== undefined &&
        !existingKeys.has(SYSTEM_KEY_PREFIX + r.rule_key),
    )
    .map(source => deriveSystemRule(source._player_rule_data!, week))
}

function deriveSystemRule(source: PlayerRule, week: number): InferenceRule {
  const broadens = source.evidence_domains.length > 2
  const evidence_domains = broadens
    ? source.evidence_domains.slice(0, -1)
    : source.evidence_domains
  const scariness_level = broadens
    ? source.scariness_level
    : (Math.min(source.scariness_level + 1, 5) as PlayerRule['scariness_level'])

  const derived: PlayerRule = {
    ...source,
    rule_key: SYSTEM_KEY_PREFIX + source.rule_key,
    name: `Cohort Model v${week}.2 — ${source.name}`,
    scariness_level,
    evidence_domains,
    evidence_keys: source.evidence_keys.slice(0, evidence_domains.length),
    evidence_labels: source.evidence_labels.slice(0, evidence_domains.length),
    created_at_week: week,
  }

  return {
    ...playerRuleToInferenceRule(derived),
    origin: 'system',
    educational_note: EDUCATIONAL_NOTE,
    real_world_example: REAL_WORLD_EXAMPLE,
  }
}
