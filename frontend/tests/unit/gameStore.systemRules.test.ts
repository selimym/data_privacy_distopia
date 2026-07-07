import { vi, beforeEach, describe, it, expect } from 'vitest'
import type { Directive, OperatorState } from '@/types/game'
import type { PlayerRule } from '@/types/content'

// vi.mock is hoisted by Vitest — this mock is in place before any store is imported.
// Without this, the store tries to open IndexedDB, which doesn't exist in Node.
vi.mock('@/stores/persistence', () => ({
  saveGameState: vi.fn().mockResolvedValue(undefined),
  loadGameState: vi.fn().mockResolvedValue(null),
  clearGameState: vi.fn().mockResolvedValue(undefined),
  hasSavedGame: vi.fn().mockResolvedValue(false),
}))

import { useGameStore } from '@/stores/gameStore'
import { useMetricsStore } from '@/stores/metricsStore'
import { useUIStore } from '@/stores/uiStore'
import { useContentStore } from '@/stores/contentStore'

function makeDirective(week: number): Directive {
  return {
    directive_key: `directive_week_${week}`,
    week_number: week,
    title: `Week ${week} Directive`,
    description: 'Test directive',
    internal_memo: null,
    required_domains: ['judicial', 'location'],
    target_criteria: { pattern: 'any' },
    flag_quota: 0,
    time_limit_hours: null,
    moral_weight: 5,
    content_rating: 'moderate',
    unlock_condition: { type: 'start' },
  }
}

function makeOperator(): OperatorState {
  return {
    id: 'op-test-1',
    operator_code: 'TEST-OP-001',
    compliance_score: 50,
    total_flags_submitted: 0,
    total_reviews_completed: 0,
    hesitation_incidents: 0,
    current_directive_key: 'directive_week_5',
    current_time_period: 'immediate',
    status: 'active',
    shift_start: new Date().toISOString(),
    unlocked_domains: ['judicial', 'location'],
  }
}

const playerRule: PlayerRule = {
  rule_key: 'player_rule_wiring_test',
  name: 'Wiring Test Pattern',
  category: 'behavioral',
  scariness_level: 3,
  evidence_domains: ['health', 'finance'],
  evidence_keys: ['a', 'b'],
  evidence_labels: ['A', 'B'],
  origin: 'player',
  created_at_week: 4,
}

beforeEach(() => {
  useGameStore.getState().reset()
  useMetricsStore.getState().reset()
  useUIStore.getState().reset()
  useContentStore.getState().reset()

  useContentStore.getState().addPlayerRule(playerRule)
  useGameStore.setState({
    operator: makeOperator(),
    currentDirective: makeDirective(5),
    weekNumber: 5,
  })
})

describe('gameStore.advanceDirective — ML pipeline absorption', () => {
  it('derives system rules from player rules on advance when autoflag is available', () => {
    useGameStore.setState(state => ({
      autoFlagState: { ...state.autoFlagState, is_available: true },
    }))

    useGameStore.getState().advanceDirective(makeDirective(6))

    const rules = useContentStore.getState().inferenceRules
    const derived = rules.find(r => r.rule_key === 'system_player_rule_wiring_test')
    expect(derived).toBeDefined()
    expect(derived!.origin).toBe('system')
  })

  it('does not derive system rules before the ML pipeline is unlocked', () => {
    useGameStore.getState().advanceDirective(makeDirective(6))

    const rules = useContentStore.getState().inferenceRules
    expect(rules.some(r => r.rule_key.startsWith('system_'))).toBe(false)
  })

  it('does not re-derive the same player rule on subsequent advances', () => {
    useGameStore.setState(state => ({
      autoFlagState: { ...state.autoFlagState, is_available: true },
    }))

    useGameStore.getState().advanceDirective(makeDirective(6))
    useGameStore.setState({ currentDirective: makeDirective(6), weekNumber: 6 })
    useGameStore.getState().advanceDirective(makeDirective(7))

    const rules = useContentStore.getState().inferenceRules
    const derived = rules.filter(r => r.rule_key === 'system_player_rule_wiring_test')
    expect(derived).toHaveLength(1)
  })
})
