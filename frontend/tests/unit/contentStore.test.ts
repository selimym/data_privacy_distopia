import { describe, it, expect, beforeEach } from 'vitest'
import { useContentStore } from '../../src/stores/contentStore'
import type { PlayerRule } from '../../src/types/content'

beforeEach(() => {
  useContentStore.setState({ inferenceRules: [] })
})

const makePlayerRule = (): PlayerRule => ({
  rule_key: 'player_rule_1',
  name: 'Test Player Rule',
  category: 'behavioral',
  scariness_level: 3,
  evidence_domains: ['health', 'finance'],
  evidence_keys: ['visit_0', 'debt_1'],
  evidence_labels: ['ER visit', 'Delinquent debt'],
  origin: 'player',
  created_at_week: 2,
})

describe('contentStore.addPlayerRule', () => {
  it('adds a player rule to inferenceRules', () => {
    const initialCount = useContentStore.getState().inferenceRules.length
    useContentStore.getState().addPlayerRule(makePlayerRule())
    expect(useContentStore.getState().inferenceRules).toHaveLength(initialCount + 1)
  })

  it('converts PlayerRule to InferenceRule with condition_function = player_rule_evaluator', () => {
    useContentStore.getState().addPlayerRule(makePlayerRule())
    const rules = useContentStore.getState().inferenceRules
    const added = rules.find((r) => r.rule_key === 'player_rule_1')
    expect(added).toBeDefined()
    expect(added!.condition_function).toBe('player_rule_evaluator')
    expect(added!.origin).toBe('player')
    expect(added!._player_rule_data).toBeDefined()
  })

  it('does not add duplicate rule keys', () => {
    useContentStore.getState().addPlayerRule(makePlayerRule())
    useContentStore.getState().addPlayerRule(makePlayerRule())
    const rules = useContentStore.getState().inferenceRules
    const matches = rules.filter((r) => r.rule_key === 'player_rule_1')
    expect(matches).toHaveLength(1)
  })
})

describe('contentStore.addSystemRules', () => {
  it('appends system rules to inferenceRules', () => {
    useContentStore.getState().addPlayerRule(makePlayerRule())
    const player = useContentStore.getState().inferenceRules[0]!
    const systemRule = { ...player, rule_key: 'system_player_rule_1', origin: 'system' as const }

    useContentStore.getState().addSystemRules([systemRule])

    const rules = useContentStore.getState().inferenceRules
    expect(rules.some((r) => r.rule_key === 'system_player_rule_1' && r.origin === 'system')).toBe(true)
  })

  it('skips rules whose rule_key already exists', () => {
    useContentStore.getState().addPlayerRule(makePlayerRule())
    const player = useContentStore.getState().inferenceRules[0]!
    const systemRule = { ...player, rule_key: 'system_player_rule_1', origin: 'system' as const }

    useContentStore.getState().addSystemRules([systemRule])
    useContentStore.getState().addSystemRules([systemRule])

    const matches = useContentStore.getState().inferenceRules.filter((r) => r.rule_key === 'system_player_rule_1')
    expect(matches).toHaveLength(1)
  })
})
