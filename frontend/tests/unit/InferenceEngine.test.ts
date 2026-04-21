import { describe, it, expect } from 'vitest'
import { InferenceEngine } from '@/services/InferenceEngine'
import type { CitizenProfile } from '@/types/citizen'
import type { InferenceRule, PlayerRule } from '@/types/content'
import type { DomainKey } from '@/types/game'
import inferenceRulesJson from '../../public/content/inference_rules.json'

const ALL_RULES = inferenceRulesJson.rules as InferenceRule[]

// ── Shared skeleton fields (all CitizenProfile objects extend this) ─────────

const baseSkeleton = {
  id: 'test-citizen',
  first_name: 'Jane',
  last_name: 'Doe',
  date_of_birth: '1985-06-15',
  ssn: '123-45-6789',
  street_address: '1 Test St',
  city: 'Testville',
  state: 'CA',
  zip_code: '90210',
  role: 'citizen' as const,
  sprite_key: 'npc_1',
  map_x: 5,
  map_y: 5,
  is_scenario_npc: false,
  scenario_key: null,
  appears_at_week: null,
  risk_score_cache: null,
  risk_score_updated_at: null,
  generation_seed: 1,
}

// ── Minimal country stub (engine receives it but evaluators don't use it) ──

const country = {
  country_key: 'us',
  display_name: 'United States',
  flag_emoji: '🇺🇸',
  surveillance_depth: 3 as const,
  available_domains: ['health', 'finance', 'judicial', 'location', 'social', 'messages'] as DomainKey[],
  legal_framework: { surveillance_law: '', data_retention: '', oversight_body: '' },
  ui_flavor: {
    agency_name: '',
    operator_title: '',
    platform_version: '',
    flag_labels: { monitoring: '', restriction: '', intervention: '', detention: '' },
    no_action_label: '',
  },
  real_world_references: [],
}

// ─────────────────────────────────────────────────────────────────────────────

describe('InferenceEngine', () => {
  describe('evaluate()', () => {
    it('returns no inferences when citizen has no domain data', () => {
      const engine = new InferenceEngine(ALL_RULES)
      const emptyProfile: CitizenProfile = { ...baseSkeleton }
      const allDomains = new Set<DomainKey>(['health', 'finance', 'judicial', 'location', 'social', 'messages'])
      const results = engine.evaluate(emptyProfile, allDomains, country)
      expect(results).toHaveLength(0)
    })

    it('fires financial_desperation when health+finance domains have matching indicators', () => {
      // Conditions for check_financial_desperation:
      //   - finance.debts has at least one type==='Medical debt'
      //   - finance.debts has at least one delinquent===true
      //   - health.conditions or health.sensitive_conditions is non-empty
      const engine = new InferenceEngine(ALL_RULES)
      const profile: CitizenProfile = {
        ...baseSkeleton,
        health: {
          conditions: ['Type 2 Diabetes'],
          sensitive_conditions: [],
          medications: [],
          visits: [],
          insurance_provider: 'BlueCross',
        },
        finance: {
          accounts: [],
          transactions: [],
          debts: [
            { type: 'Medical debt', creditor: 'City Hospital', amount: 15000, delinquent: true },
          ],
          credit_score: 580,
          employer: 'MegaCorp',
          annual_income: 40000,
        },
      }
      const unlockedDomains = new Set<DomainKey>(['health', 'finance'])
      const results = engine.evaluate(profile, unlockedDomains, country)
      const keys = results.map(r => r.rule_key)
      expect(keys).toContain('financial_desperation')
    })

    it('fires pregnancy_tracking when health+finance+location domains all match', () => {
      // Conditions for check_pregnancy_tracking:
      //   - health.visits has >= 2 entries with specialty 'Obstetrics & Gynecology'
      //   - health, finance, AND location domains must be in unlockedDomains
      const engine = new InferenceEngine(ALL_RULES)
      const profile: CitizenProfile = {
        ...baseSkeleton,
        health: {
          conditions: [],
          sensitive_conditions: [],
          medications: ['prenatal vitamin'],
          visits: [
            { date: '2024-01-10', reason: 'prenatal checkup', facility: 'City Clinic', specialty: 'Obstetrics & Gynecology' },
            { date: '2024-02-10', reason: 'prenatal checkup', facility: 'City Clinic', specialty: 'Obstetrics & Gynecology' },
          ],
          insurance_provider: 'BlueCross',
        },
        finance: {
          accounts: [],
          transactions: [],
          debts: [],
          credit_score: 700,
          employer: 'Acme',
          annual_income: 60000,
        },
        location: {
          home_address: '1 Main St',
          work_address: '5 Office Blvd',
          work_name: 'Acme Corp',
          checkins: [
            {
              date: '2024-03-01',
              location_name: 'Women\'s Health Center',
              location_type: 'healthcare',
              address: '100 Medical Dr, Other State',
              frequency: 'occasional',
            },
          ],
          flagged_locations: [],
        },
      }
      const unlockedDomains = new Set<DomainKey>(['health', 'finance', 'location'])
      const results = engine.evaluate(profile, unlockedDomains, country)
      const keys = results.map(r => r.rule_key)
      expect(keys).toContain('pregnancy_tracking')
    })

    it('does NOT fire pregnancy_tracking when location domain is not unlocked', () => {
      // pregnancy_tracking requires location in required_domains.
      // Even if the citizen has location data, the engine skips rules whose required
      // domains are not all in unlockedDomains.
      const engine = new InferenceEngine(ALL_RULES)
      const profile: CitizenProfile = {
        ...baseSkeleton,
        health: {
          conditions: [],
          sensitive_conditions: [],
          medications: ['prenatal vitamin'],
          visits: [
            { date: '2024-01-10', reason: 'checkup', facility: 'Clinic', specialty: 'Obstetrics & Gynecology' },
            { date: '2024-02-10', reason: 'checkup', facility: 'Clinic', specialty: 'Obstetrics & Gynecology' },
          ],
          insurance_provider: 'BlueCross',
        },
        finance: {
          accounts: [],
          transactions: [],
          debts: [],
          credit_score: 700,
          employer: 'Acme',
          annual_income: 60000,
        },
        location: {
          home_address: '1 Main St',
          work_address: '5 Office Blvd',
          work_name: 'Acme Corp',
          checkins: [{ date: '2024-03-01', location_name: 'Clinic', location_type: 'healthcare', address: '100 Dr', frequency: 'occasional' }],
          flagged_locations: [],
        },
      }
      // location NOT in unlocked domains
      const unlockedDomains = new Set<DomainKey>(['health', 'finance'])
      const results = engine.evaluate(profile, unlockedDomains, country)
      const keys = results.map(r => r.rule_key)
      expect(keys).not.toContain('pregnancy_tracking')
    })

    it('returns results sorted by scariness_level descending', () => {
      // Set up a profile that fires multiple inferences with different scariness levels.
      // financial_desperation (health+finance) and prior_criminal_record (judicial only)
      const engine = new InferenceEngine(ALL_RULES)
      const profile: CitizenProfile = {
        ...baseSkeleton,
        health: {
          conditions: ['Type 2 Diabetes'],
          sensitive_conditions: [],
          medications: [],
          visits: [],
          insurance_provider: 'BlueCross',
        },
        finance: {
          accounts: [],
          transactions: [],
          debts: [
            { type: 'Medical debt', creditor: 'City Hospital', amount: 15000, delinquent: true },
          ],
          credit_score: 550,
          employer: 'MegaCorp',
          annual_income: 35000,
        },
        judicial: {
          cases: [
            { id: 'case-1', type: 'criminal', charge: 'Theft', date: '2020-01-01', outcome: 'convicted', sentence: '1 year probation' },
          ],
          has_felony: false,
          has_violent_offense: false,
          has_drug_offense: false,
        },
      }
      const unlockedDomains = new Set<DomainKey>(['health', 'finance', 'judicial'])
      const results = engine.evaluate(profile, unlockedDomains, country)
      // Must have at least 2 inferences to verify sort
      expect(results.length).toBeGreaterThanOrEqual(2)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]!.scariness_level).toBeGreaterThanOrEqual(results[i]!.scariness_level)
      }
    })
  })

  describe('InferenceEngine with player rules', () => {
    const playerRule: PlayerRule = {
      rule_key: 'player_health_messages_pattern',
      name: 'Health + Messages Crisis Pattern',
      category: 'player_defined',
      scariness_level: 3,
      evidence_domains: ['health', 'messages'],
      evidence_keys: ['sensitive_conditions', 'concerning_messages'],
      evidence_labels: ['Sensitive health condition detected', 'Concerning messages found'],
      origin: 'player',
      created_at_week: 2,
    }

    const playerInferenceRule: InferenceRule = {
      rule_key: playerRule.rule_key,
      name: playerRule.name,
      category: playerRule.category,
      required_domains: playerRule.evidence_domains,
      scariness_level: playerRule.scariness_level,
      content_rating: 'moderate',
      condition_function: 'player_rule_evaluator',
      inference_template: '',
      evidence_templates: playerRule.evidence_labels,
      implications_templates: [],
      educational_note: '',
      real_world_example: '',
      victim_statements: [],
      origin: 'player',
      _player_rule_data: playerRule,
    }

    it('evaluates player_rule_evaluator rules against the citizen profile', () => {
      const engine = new InferenceEngine([playerInferenceRule])

      const concerningProfile: CitizenProfile = {
        ...baseSkeleton,
        health: {
          conditions: [],
          sensitive_conditions: ['HIV'],
          medications: [],
          visits: [],
          insurance_provider: 'BlueCross',
        },
        messages: [
          {
            id: 'msg-1',
            date: '2024-03-01',
            contact: 'Unknown',
            platform: 'Signal',
            excerpt: 'I need help urgently',
            is_encrypted: true,
            is_concerning: true,
            category: 'personal_crisis',
          },
        ],
      }

      const unlockedDomains = new Set<DomainKey>(['health', 'messages'])
      const results = engine.evaluate(concerningProfile, unlockedDomains, country)

      expect(results).toHaveLength(1)
      expect(results[0]!.rule_key).toBe('player_health_messages_pattern')
      expect(results[0]!.origin).toBe('player')
    })

    it('does not fire player rule when citizen lacks concerning data in a required domain', () => {
      const engine = new InferenceEngine([playerInferenceRule])

      const normalProfile: CitizenProfile = {
        ...baseSkeleton,
        health: {
          conditions: [],
          sensitive_conditions: ['HIV'],
          medications: [],
          visits: [],
          insurance_provider: 'BlueCross',
        },
        messages: [
          {
            id: 'msg-2',
            date: '2024-03-01',
            contact: 'Alice',
            platform: 'SMS',
            excerpt: 'See you at lunch!',
            is_encrypted: false,
            is_concerning: false,
            category: 'normal',
          },
        ],
      }

      const unlockedDomains = new Set<DomainKey>(['health', 'messages'])
      const results = engine.evaluate(normalProfile, unlockedDomains, country)

      expect(results).toHaveLength(0)
    })
  })

  describe('getUnlockable()', () => {
    it('suggests location domain when pregnancy_tracking would become available', () => {
      // With only health+finance unlocked, adding location unlocks pregnancy_tracking
      // (required_domains: ['health', 'finance', 'location'])
      const engine = new InferenceEngine(ALL_RULES)
      const profile: CitizenProfile = { ...baseSkeleton }
      const currentDomains = new Set<DomainKey>(['health', 'finance'])
      const suggestions = engine.getUnlockable(profile, currentDomains)
      const locationSuggestion = suggestions.find(s => s.domain === 'location')
      expect(locationSuggestion).toBeDefined()
      expect(locationSuggestion!.unlocks).toContain('Reproductive Healthcare Tracking')
    })

    it('returns empty array when all domains are already unlocked', () => {
      const engine = new InferenceEngine(ALL_RULES)
      const profile: CitizenProfile = { ...baseSkeleton }
      const allDomains = new Set<DomainKey>(['health', 'finance', 'judicial', 'location', 'social', 'messages'])
      const suggestions = engine.getUnlockable(profile, allDomains)
      expect(suggestions).toHaveLength(0)
    })
  })
})
