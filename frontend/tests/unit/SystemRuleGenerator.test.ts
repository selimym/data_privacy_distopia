import { describe, it, expect } from 'vitest'
import { generateSystemRules } from '../../src/services/SystemRuleGenerator'
import type { InferenceRule, PlayerRule } from '../../src/types/content'

const makePlayerRule = (overrides: Partial<PlayerRule> = {}): PlayerRule => ({
  rule_key: 'player_rule_abc',
  name: 'Mental Health Crisis Risk',
  category: 'behavioral',
  scariness_level: 3,
  evidence_domains: ['health', 'finance'],
  evidence_keys: ['visit_0', 'debt_1'],
  evidence_labels: ['ER visit', 'Delinquent debt'],
  origin: 'player',
  created_at_week: 2,
  ...overrides,
})

const asInferenceRule = (pr: PlayerRule): InferenceRule => ({
  rule_key: pr.rule_key,
  name: pr.name,
  category: pr.category,
  required_domains: pr.evidence_domains,
  scariness_level: pr.scariness_level,
  content_rating: 'moderate',
  condition_function: 'player_rule_evaluator',
  inference_template: '',
  evidence_templates: [],
  implications_templates: [],
  educational_note: '',
  real_world_example: '',
  victim_statements: [],
  origin: 'player',
  _player_rule_data: pr,
})

const legacyRule: InferenceRule = {
  rule_key: 'legacy_criminal_record',
  name: 'Criminal Record Detected',
  category: 'judicial',
  required_domains: ['judicial'],
  scariness_level: 2,
  content_rating: 'moderate',
  condition_function: 'check_criminal_record',
  inference_template: '',
  evidence_templates: [],
  implications_templates: [],
  educational_note: '',
  real_world_example: '',
  victim_statements: [],
  origin: 'legacy',
}

describe('generateSystemRules', () => {
  it('derives one system rule per player rule with origin=system and a derived key', () => {
    const ruleset = [legacyRule, asInferenceRule(makePlayerRule())]
    const derived = generateSystemRules(ruleset, 5)

    expect(derived).toHaveLength(1)
    const rule = derived[0]!
    expect(rule.rule_key).toBe('system_player_rule_abc')
    expect(rule.origin).toBe('system')
    expect(rule.condition_function).toBe('player_rule_evaluator')
    expect(rule._player_rule_data).toBeDefined()
    expect(rule._player_rule_data!.rule_key).toBe('system_player_rule_abc')
  })

  it('names the derived rule in ML-speak while keeping the source pattern name visible', () => {
    const derived = generateSystemRules([asInferenceRule(makePlayerRule())], 5)
    expect(derived[0]!.name).toContain('Mental Health Crisis Risk')
    expect(derived[0]!.name).not.toBe('Mental Health Crisis Risk')
  })

  it('escalates scariness by 1 (capped at 5) when source has only 2 evidence domains', () => {
    const derived = generateSystemRules([asInferenceRule(makePlayerRule({ scariness_level: 3 }))], 5)
    expect(derived[0]!.scariness_level).toBe(4)
    expect(derived[0]!._player_rule_data!.evidence_domains).toEqual(['health', 'finance'])

    const capped = generateSystemRules([asInferenceRule(makePlayerRule({ scariness_level: 5 }))], 5)
    expect(capped[0]!.scariness_level).toBe(5)
  })

  it('broadens by dropping the last evidence domain when source has 3+ domains', () => {
    const source = makePlayerRule({
      evidence_domains: ['health', 'finance', 'location'],
      evidence_keys: ['a', 'b', 'c'],
      evidence_labels: ['A', 'B', 'C'],
      scariness_level: 3,
    })
    const derived = generateSystemRules([asInferenceRule(source)], 5)
    expect(derived[0]!._player_rule_data!.evidence_domains).toEqual(['health', 'finance'])
    expect(derived[0]!.required_domains).toEqual(['health', 'finance'])
    // broadening (needs less evidence) is the escalation — scariness stays
    expect(derived[0]!.scariness_level).toBe(3)
  })

  it('is idempotent — skips player rules whose derived system rule already exists', () => {
    const player = asInferenceRule(makePlayerRule())
    const first = generateSystemRules([player], 5)
    const second = generateSystemRules([player, ...first], 6)
    expect(second).toHaveLength(0)
  })

  it('never derives from legacy or system rules', () => {
    const player = asInferenceRule(makePlayerRule())
    const derived = generateSystemRules([player], 5)
    const again = generateSystemRules([legacyRule, ...derived], 6)
    expect(again).toHaveLength(0)
  })

  it('includes an educational note and real-world example (model drift is a teaching moment)', () => {
    const derived = generateSystemRules([asInferenceRule(makePlayerRule())], 5)
    expect(derived[0]!.educational_note.length).toBeGreaterThan(0)
    expect(derived[0]!.real_world_example.length).toBeGreaterThan(0)
  })
})
