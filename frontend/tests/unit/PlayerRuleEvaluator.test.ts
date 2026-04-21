import { describe, it, expect } from 'vitest'
import {
  evaluatePlayerRule,
  playerRuleToInferenceResult,
  playerRuleToInferenceRule,
} from '../../src/services/PlayerRuleEvaluator'
import type { PlayerRule } from '../../src/types/content'
import type { CitizenProfile } from '../../src/types/citizen'

const makeRule = (overrides: Partial<PlayerRule> = {}): PlayerRule => ({
  rule_key: 'player_rule_test',
  name: 'Test Rule',
  category: 'behavioral',
  scariness_level: 3,
  evidence_domains: ['health', 'messages'],
  evidence_keys: ['visit_0', 'message_2'],
  evidence_labels: ["ER visit – overdose", "I can't do this anymore"],
  origin: 'player',
  created_at_week: 2,
  ...overrides,
})

const makeProfile = (overrides: Partial<CitizenProfile> = {}): CitizenProfile => ({
  id: 'citizen-001',
  first_name: 'Jane',
  last_name: 'Doe',
  date_of_birth: '1990-01-01',
  ssn: '123-45-6789',
  street_address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zip_code: '62701',
  role: 'citizen',
  sprite_key: 'citizen_1',
  map_x: 10,
  map_y: 10,
  is_scenario_npc: false,
  scenario_key: null,
  appears_at_week: null,
  risk_score_cache: null,
  risk_score_updated_at: null,
  generation_seed: 42,
  health: {
    conditions: [],
    sensitive_conditions: ['depression'],
    medications: [],
    visits: [],
    insurance_provider: 'BlueCross',
  },
  messages: [
    {
      id: 'msg-1',
      date: '2024-01-01',
      contact: 'Friend',
      platform: 'Signal',
      excerpt: "I can't do this anymore",
      is_encrypted: true,
      is_concerning: true,
      category: 'personal_crisis',
    },
  ],
  ...overrides,
})

describe('evaluatePlayerRule', () => {
  it('returns true when citizen has concerning data in all required domains', () => {
    const rule = makeRule({ evidence_domains: ['health', 'messages'] })
    const profile = makeProfile()
    expect(evaluatePlayerRule(rule, profile)).toBe(true)
  })

  it('returns false when citizen is missing a required domain', () => {
    const rule = makeRule({ evidence_domains: ['health', 'judicial'] })
    const profile = makeProfile()
    // profile has no judicial record
    expect(evaluatePlayerRule(rule, profile)).toBe(false)
  })

  it('returns false when citizen has the domain but no concerning data', () => {
    const rule = makeRule({ evidence_domains: ['health', 'messages'] })
    const profile = makeProfile({
      health: {
        conditions: ['hypertension'],
        sensitive_conditions: [],
        medications: [],
        visits: [{ date: '2024-01-01', reason: 'routine checkup', facility: 'Clinic', specialty: 'GP' }],
        insurance_provider: 'BlueCross',
      },
      messages: [
        {
          id: 'msg-2',
          date: '2024-01-02',
          contact: 'Mom',
          platform: 'SMS',
          excerpt: 'See you Sunday!',
          is_encrypted: false,
          is_concerning: false,
          category: 'normal',
        },
      ],
    })
    expect(evaluatePlayerRule(rule, profile)).toBe(false)
  })
})

describe('playerRuleToInferenceResult', () => {
  it('returns a well-shaped InferenceResult with correct fields', () => {
    const rule = makeRule()
    const result = playerRuleToInferenceResult(rule)

    expect(result.rule_key).toBe(rule.rule_key)
    expect(result.rule_name).toBe(rule.name)
    expect(result.category).toBe(rule.category)
    expect(result.confidence).toBeCloseTo(0.65 + rule.evidence_domains.length * 0.05)
    expect(result.inference_text).toContain(rule.name)
    expect(result.inference_text).toContain('health + messages')
    expect(result.supporting_evidence).toEqual(rule.evidence_labels)
    expect(result.implications).toHaveLength(2)
    expect(result.domains_used).toEqual(rule.evidence_domains)
    expect(result.scariness_level).toBe(rule.scariness_level)
    expect(result.origin).toBe('player')
  })
})

describe('playerRuleToInferenceRule', () => {
  it('creates an InferenceRule with sentinel condition_function and player origin', () => {
    const rule = makeRule()
    const inferenceRule = playerRuleToInferenceRule(rule)
    expect(inferenceRule.condition_function).toBe('player_rule_evaluator')
    expect(inferenceRule.origin).toBe('player')
    expect(inferenceRule._player_rule_data).toBe(rule)
    expect(inferenceRule.required_domains).toEqual(['health', 'messages'])
  })
})
