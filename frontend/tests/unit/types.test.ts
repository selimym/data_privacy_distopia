import { describe, it, expectTypeOf } from 'vitest'
import type { InferenceRule, PlayerRule, PinnedDataPoint } from '../../src/types/content'
import type { RuleAttributionRecord, WeeklyRuleStats } from '../../src/types/game'

describe('type contracts', () => {
  it('InferenceRule has origin field', () => {
    expectTypeOf<InferenceRule['origin']>().toEqualTypeOf<'legacy' | 'player' | 'system' | undefined>()
  })

  it('PlayerRule has required shape', () => {
    expectTypeOf<PlayerRule['evidence_domains']>().toEqualTypeOf<import('../../src/types/game').DomainKey[]>()
    expectTypeOf<PlayerRule['evidence_keys']>().toEqualTypeOf<string[]>()
  })

  it('PinnedDataPoint has required shape', () => {
    expectTypeOf<PinnedDataPoint['domain']>().toEqualTypeOf<import('../../src/types/game').DomainKey>()
    expectTypeOf<PinnedDataPoint['id']>().toEqualTypeOf<string>()
    expectTypeOf<PinnedDataPoint['label']>().toEqualTypeOf<string>()
    expectTypeOf<PinnedDataPoint['category']>().toEqualTypeOf<string>()
  })

  it('WeeklyRuleStats has required shape', () => {
    expectTypeOf<WeeklyRuleStats['rule_key']>().toEqualTypeOf<string>()
    expectTypeOf<WeeklyRuleStats['flag_count']>().toEqualTypeOf<number>()
    expectTypeOf<WeeklyRuleStats['rule_origin']>().toEqualTypeOf<'legacy' | 'player' | 'system'>()
  })
})
