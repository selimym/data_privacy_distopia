import type { InferenceRule, PlayerRule } from '../types/content'
import type { CitizenProfile, InferenceResult } from '../types/citizen'
import type { DomainKey } from '../types/game'

const CRISIS_VISIT_KEYWORDS = ['overdose', 'suicide', 'mental health', 'crisis', 'trauma', 'abuse']

function isDomainConcerning(domain: DomainKey, profile: CitizenProfile): boolean {
  switch (domain) {
    case 'health': {
      const h = profile.health
      if (!h) return false
      if (h.sensitive_conditions.length > 0) return true
      return h.visits.some(v =>
        CRISIS_VISIT_KEYWORDS.some(kw => v.reason.toLowerCase().includes(kw))
      )
    }
    case 'messages': {
      const msgs = profile.messages
      if (!msgs || msgs.length === 0) return false
      return msgs.some(
        m => m.is_concerning || m.category === 'personal_crisis' || m.category === 'organizing'
      )
    }
    case 'finance': {
      const f = profile.finance
      if (!f) return false
      if (f.credit_score < 580) return true
      return f.debts.some(d => d.delinquent)
    }
    case 'judicial': {
      const j = profile.judicial
      if (!j) return false
      return j.cases.length > 0
    }
    case 'location': {
      const l = profile.location
      if (!l) return false
      return l.flagged_locations.length > 0
    }
    case 'social': {
      const s = profile.social
      if (!s) return false
      return s.flagged_group_memberships.length > 0 || s.political_inferences.length > 0
    }
    default:
      return false
  }
}

export function evaluatePlayerRule(rule: PlayerRule, profile: CitizenProfile): boolean {
  return rule.evidence_domains.every(domain => isDomainConcerning(domain, profile))
}

export function playerRuleToInferenceResult(rule: PlayerRule): InferenceResult & { origin: 'player' } {
  const confidence = Math.min(0.65 + rule.evidence_domains.length * 0.05, 0.95)

  return {
    rule_key: rule.rule_key,
    rule_name: rule.name,
    category: rule.category,
    confidence,
    inference_text: `Pattern match: ${rule.name}. Evidence observed across ${rule.evidence_domains.join(' + ')} domains.`,
    supporting_evidence: rule.evidence_labels,
    implications: [
      'Subject exhibits cross-domain behavioral indicators consistent with flagged pattern.',
      'This inference was created by the operator and may reflect operator-defined criteria.',
    ],
    domains_used: rule.evidence_domains,
    scariness_level: rule.scariness_level,
    educational_note: '',
    real_world_example: '',
    victim_statements: [],
    origin: 'player',
  }
}

export function playerRuleToInferenceRule(rule: PlayerRule): InferenceRule {
  return {
    rule_key: rule.rule_key,
    name: rule.name,
    category: rule.category,
    required_domains: rule.evidence_domains,
    scariness_level: rule.scariness_level,
    content_rating: 'moderate',
    condition_function: 'player_rule_evaluator',
    inference_template: `Pattern match: ${rule.name}. Evidence observed across ${rule.evidence_domains.join(' + ')} domains.`,
    evidence_templates: rule.evidence_labels,
    implications_templates: [
      'Subject exhibits cross-domain behavioral indicators consistent with flagged pattern.',
      'This inference was created by the operator and may reflect operator-defined criteria.',
    ],
    educational_note: '',
    real_world_example: '',
    victim_statements: [],
    origin: 'player',
    _player_rule_data: rule,
  }
}
