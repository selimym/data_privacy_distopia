/**
 * contentStore — static game content loaded once at game start.
 * Holds: scenario, country profile, inference rules, data banks, outcome templates.
 */
import { create } from 'zustand'
import { loadScenario, loadCountryProfile, loadInferenceRules, loadOutcomeTemplates, loadDataBanks } from '@/services/ContentLoader'
import { playerRuleToInferenceRule } from '@/services/PlayerRuleEvaluator'
import type { Scenario, CountryProfile, InferenceRule, OutcomeTemplates, DataBanks, PlayerRule } from '@/types/content'
import type { DomainKey } from '@/types/game'

interface ContentState {
  // Loaded content
  scenario: Scenario | null
  country: CountryProfile | null
  inferenceRules: InferenceRule[]
  outcomeTemplates: OutcomeTemplates | null
  dataBanks: DataBanks | null

  // Loading state
  isLoading: boolean
  loadError: string | null

  // Runtime unlocked domains (starts with scenario week-1 domains, grows with contract events)
  unlockedDomains: DomainKey[]

  // Actions
  loadContent: (countryKey: string, scenarioKey?: string) => Promise<void>
  unlockDomain: (domain: DomainKey) => void
  unlockDomains: (domains: DomainKey[]) => void
  updateInferenceRules: (rules: InferenceRule[]) => void
  addPlayerRule: (rule: PlayerRule) => void
  reset: () => void
}

const initialState = {
  scenario: null,
  country: null,
  inferenceRules: [],
  outcomeTemplates: null,
  dataBanks: null,
  isLoading: false,
  loadError: null,
  unlockedDomains: [] as DomainKey[],
}

export const useContentStore = create<ContentState>((set, get) => ({
  ...initialState,

  loadContent: async (countryKey: string, scenarioKey = 'default') => {
    set({ isLoading: true, loadError: null })
    try {
      const [scenario, country, inferenceRules, outcomeTemplates, dataBanks] = await Promise.all([
        loadScenario(scenarioKey),
        loadCountryProfile(countryKey),
        loadInferenceRules(),
        loadOutcomeTemplates(),
        loadDataBanks(),
      ])

      // Initial unlocked domains = week 1 directive required domains + country base
      const week1Directive = scenario.directives.find(d => d.week_number === 1)
      const initialDomains: DomainKey[] = week1Directive
        ? [...new Set([...week1Directive.required_domains])]
        : ['judicial', 'location']

      set({
        scenario,
        country,
        inferenceRules,
        outcomeTemplates,
        dataBanks,
        unlockedDomains: initialDomains,
        isLoading: false,
      })
    } catch (err) {
      set({ isLoading: false, loadError: String(err) })
      throw err
    }
  },

  unlockDomain: (domain) => {
    const { unlockedDomains } = get()
    if (!unlockedDomains.includes(domain)) {
      set({ unlockedDomains: [...unlockedDomains, domain] })
    }
  },

  unlockDomains: (domains) => {
    const { unlockedDomains } = get()
    const newDomains = domains.filter(d => !unlockedDomains.includes(d))
    if (newDomains.length > 0) {
      set({ unlockedDomains: [...unlockedDomains, ...newDomains] })
    }
  },

  updateInferenceRules: (rules) => set({ inferenceRules: rules }),

  addPlayerRule: (rule) =>
    set((state) => {
      if (state.inferenceRules.some((r) => r.rule_key === rule.rule_key)) {
        return state
      }
      return { inferenceRules: [...state.inferenceRules, playerRuleToInferenceRule(rule)] }
    }),

  reset: () => set(initialState),
}))
