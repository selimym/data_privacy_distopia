/**
 * InferenceEngine — evaluates inference rules against a citizen profile.
 * Rules are injected (not hardcoded), enabling user-editable inference rules.
 * Template interpolation uses safe string replacement (no eval).
 */
import type { CitizenProfile, InferenceResult } from '@/types/citizen'
import type { InferenceRule } from '@/types/content'
import type { DomainKey } from '@/types/game'
import type { CountryProfile } from '@/types/content'
import { evaluatePlayerRule, playerRuleToInferenceResult } from './PlayerRuleEvaluator'

// ─── Template interpolation ─────────────────────────────────────────────────

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)(?::\.\df)?\}/g, (match, key: string) => {
    const val = vars[key]
    return val !== undefined ? String(val) : match
  })
}

// ─── Condition evaluators ────────────────────────────────────────────────────
// Each evaluator returns extraction vars or null (rule doesn't apply)

type Vars = Record<string, string | number>

function check_financial_desperation(profile: CitizenProfile): Vars | null {
  const { health, finance } = profile
  if (!health || !finance) return null
  const medDebt = finance.debts.filter(d => d.type === 'Medical debt')
  const delinquentCount = finance.debts.filter(d => d.delinquent).length
  const hasChronicCondition = health.conditions.length > 0 || health.sensitive_conditions.length > 0
  if (medDebt.length === 0 || delinquentCount < 1 || !hasChronicCondition) return null
  const totalMedDebt = medDebt.reduce((s, d) => s + d.amount, 0)
  const condition = [...health.conditions, ...health.sensitive_conditions][0] ?? 'chronic condition'
  return {
    medical_debt: `$${totalMedDebt.toLocaleString()}`,
    condition,
    employment: finance.employer,
    credit_score: finance.credit_score,
    debt_count: delinquentCount,
  }
}

function check_pregnancy_tracking(profile: CitizenProfile): Vars | null {
  const { health, finance, location } = profile
  if (!health || !finance || !location) return null
  const obVisits = health.visits.filter(v =>
    v.specialty === 'Obstetrics & Gynecology' || v.reason.toLowerCase().includes('ob'),
  )
  const prenatalMeds = health.medications.filter(m =>
    ['folic acid', 'prenatal', 'prenatal vitamin'].some(k => m.toLowerCase().includes(k)),
  )
  const outOfStateCheckin = location.checkins.find(c => c.location_type === 'healthcare')
  if (obVisits.length < 2 && prenatalMeds.length === 0) return null
  return {
    visit_count: obVisits.length,
    has_medications: prenatalMeds.length > 0 ? 'Yes' : 'No',
    clinic_location: outOfStateCheckin?.address ?? 'out-of-state facility',
    home_state: profile.state,
  }
}

function check_depression_suicide_risk(profile: CitizenProfile): Vars | null {
  const { health, social, finance } = profile
  if (!health) return null
  const mentalMeds = health.medications.filter(m =>
    ['sertraline', 'escitalopram', 'fluoxetine', 'bupropion', 'venlafaxine',
      'alprazolam', 'clonazepam', 'lithium', 'quetiapine'].some(k => m.toLowerCase().includes(k)),
  )
  if (mentalMeds.length === 0) return null
  const therapyVisits = health.visits.filter(v =>
    v.reason.includes('therapy') || v.specialty === 'Psychiatry',
  )
  const concerningPosts = social?.posts.filter(p => p.is_concerning).length ?? 0
  const financialStress = finance?.debts.filter(d => d.delinquent).length ?? 0
  if (therapyVisits.length === 0 && concerningPosts < 2) return null
  return {
    medication: mentalMeds[0]!,
    therapy_frequency: therapyVisits.length > 3 ? 'regular' : therapyVisits.length > 0 ? 'occasional' : 'none',
    social_indicators: concerningPosts,
    financial_indicators: financialStress > 0 ? `${financialStress} delinquent accounts` : 'stable',
    risk_level: concerningPosts >= 3 ? 'elevated' : 'moderate',
  }
}

function check_affair_detection(profile: CitizenProfile): Vars | null {
  const { location, finance } = profile
  if (!location || !finance) return null
  const hotelTx = finance.transactions.filter(t => t.merchant.toLowerCase().includes('hotel'))
  const restaurantTx = finance.transactions.filter(t => t.category === 'dining')
  if (hotelTx.length < 2 || restaurantTx.length < 3) return null
  const suspiciousCheckin = location.checkins.find(c => c.frequency === 'weekly')
  if (!suspiciousCheckin) return null
  return {
    visit_frequency: suspiciousCheckin.frequency,
    location_address: suspiciousCheckin.address,
    location_city: suspiciousCheckin.location_name,
    hotel_count: hotelTx.length,
    date_expense_count: restaurantTx.length,
    total_spent: restaurantTx.reduce((s, t) => s + t.amount, 0),
  }
}

function check_domestic_violence(profile: CitizenProfile): Vars | null {
  const { health, location } = profile
  if (!health || !location) return null
  const injuryVisits = health.visits.filter(v =>
    v.reason.toLowerCase().includes('injury') || v.reason.toLowerCase().includes('er'),
  )
  if (injuryVisits.length < 2) return null
  const socialActivity = location.checkins.length < 3 ? 'minimal' : 'moderate'
  return {
    injury_count: injuryVisits.length,
    injury_types: 'blunt trauma, contusions',
    isolation_level: location.checkins.length < 3 ? 'severe' : 'moderate',
    social_activity: socialActivity,
  }
}

function check_job_loss_prediction(profile: CitizenProfile): Vars | null {
  const { location, finance } = profile
  if (!location || !finance) return null
  const recentWorkVisits = location.checkins.filter(
    c => c.location_type === 'workplace' && c.frequency !== 'once',
  )
  if (recentWorkVisits.length > 2) return null
  const careerServices = finance.transactions.filter(t =>
    t.merchant.toLowerCase().includes('career') || t.merchant.toLowerCase().includes('resume'),
  )
  if (careerServices.length === 0) return null
  return {
    workplace_name: location.work_name,
    prep_services: careerServices.length,
    financial_status: finance.credit_score < 600 ? 'stressed' : 'stable',
    timeframe: 'imminent (1-4 weeks)',
  }
}

function check_gambling_addiction(profile: CitizenProfile): Vars | null {
  const { finance, location } = profile
  if (!finance) return null
  const gamblingTx = finance.transactions.filter(t => t.category === 'gambling')
  if (gamblingTx.length < 3) return null
  const casinoVisits = location?.checkins.filter(c =>
    c.location_name.toLowerCase().includes('casino'),
  ).length ?? 0
  const debtSources = new Set(finance.debts.map(d => d.creditor)).size
  return {
    transaction_count: gamblingTx.length,
    total_gambled: `$${gamblingTx.reduce((s, t) => s + t.amount, 0).toLocaleString()}`,
    casino_visits: casinoVisits,
    debt_sources: debtSources,
    total_debt: `$${finance.debts.reduce((s, d) => s + d.amount, 0).toLocaleString()}`,
    social_distortion: 'win-focused, hides losses',
  }
}

function check_elderly_cognitive_decline(profile: CitizenProfile): Vars | null {
  const { health, finance } = profile
  if (!health || !finance) return null
  const dob = new Date(profile.date_of_birth)
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000))
  if (age < 65) return null
  const cognitiveMeds = health.medications.filter(m =>
    ['donepezil', 'memantine', 'aricept', 'namenda'].some(k => m.toLowerCase().includes(k)),
  )
  const suspiciousTx = finance.transactions.filter(t => t.is_suspicious)
  if (cognitiveMeds.length === 0 || suspiciousTx.length === 0) return null
  return {
    age,
    medication: cognitiveMeds[0]!,
    suspicious_count: suspiciousTx.length,
    total_suspicious: `$${suspiciousTx.reduce((s, t) => s + t.amount, 0).toLocaleString()}`,
    vulnerability: 'High — cognitive decline + financial anomalies',
  }
}

function check_identity_reconstruction(profile: CitizenProfile): Vars | null {
  const domains: DomainKey[] = ['health', 'finance', 'judicial', 'location', 'social']
  const presentCount = domains.filter(d => profile[d] !== undefined).length
  if (presentCount < 4) return null
  return {
    medical_records: profile.health?.visits.length ?? 0,
    financial_accounts: profile.finance?.accounts.length ?? 0,
    legal_records: profile.judicial?.cases.length ?? 0,
    tracked_locations: profile.location?.checkins.length ?? 0,
    social_inferences: profile.social?.political_inferences.length ?? 0,
    completeness: `${Math.round((presentCount / domains.length) * 100)}%`,
  }
}

function check_unionization_activity(profile: CitizenProfile): Vars | null {
  const { location, social } = profile
  if (!location && !social) return null
  const unionLocations = location?.flagged_locations ?? []
  const unionGroups = social?.flagged_group_memberships ?? []
  if (unionLocations.length === 0 && unionGroups.length === 0) return null
  const unionConnections = social?.connections.filter(c => c.is_flagged).length ?? 0
  return {
    meeting_count: unionLocations.length,
    union_location: unionLocations[0] ?? unionGroups[0] ?? 'labor organization',
    social_connections: unionConnections,
    research_activity: 'Labor law resources accessed',
    stage: unionGroups.length >= 2 ? 'active' : 'early',
  }
}

function check_prior_criminal_record(profile: CitizenProfile): Vars | null {
  const { judicial } = profile
  if (!judicial) return null
  const criminalCases = judicial.cases.filter(c => c.type === 'criminal')
  if (criminalCases.length === 0) return null
  const mostRecent = [...criminalCases].sort((a, b) => b.date.localeCompare(a.date))[0]!
  return {
    case_count: criminalCases.length,
    most_recent_charge: mostRecent.charge,
    most_recent_outcome: mostRecent.outcome,
    has_drug_offense: judicial.has_drug_offense ? 'Yes' : 'No',
    risk_category: judicial.has_felony ? 'felony' : 'misdemeanor',
  }
}

function check_flagged_location_association(profile: CitizenProfile): Vars | null {
  const { location } = profile
  if (!location || location.flagged_locations.length === 0) return null
  const frequentVisits = location.checkins.filter(c =>
    location.flagged_locations.includes(c.location_name) &&
    (c.frequency === 'daily' || c.frequency === 'weekly'),
  )
  return {
    flagged_location: location.flagged_locations[0]!,
    flagged_count: location.flagged_locations.length,
    visit_frequency: frequentVisits.length > 0 ? frequentVisits[0]!.frequency : 'occasional',
    total_checkins: location.checkins.length,
  }
}

function check_recidivism_location_risk(profile: CitizenProfile): Vars | null {
  const { judicial, location } = profile
  if (!judicial || !location) return null
  if (!judicial.has_drug_offense && !judicial.has_felony) return null
  const regularCheckins = location.checkins.filter(c =>
    c.frequency === 'daily' || c.frequency === 'weekly',
  )
  if (regularCheckins.length === 0) return null
  return {
    offense_type: judicial.has_drug_offense ? 'drug distribution' : 'felony offense',
    prior_charges: judicial.cases.filter(c => c.type === 'criminal').length,
    regular_locations: regularCheckins.length,
    primary_location: regularCheckins[0]!.location_name,
    location_type: regularCheckins[0]!.location_type,
  }
}

// ─── Condition function registry ─────────────────────────────────────────────

const EVALUATORS: Record<string, (profile: CitizenProfile) => Vars | null> = {
  check_financial_desperation,
  check_pregnancy_tracking,
  check_depression_suicide_risk,
  check_affair_detection,
  check_domestic_violence,
  check_job_loss_prediction,
  check_gambling_addiction,
  check_elderly_cognitive_decline,
  check_identity_reconstruction,
  check_unionization_activity,
  check_prior_criminal_record,
  check_flagged_location_association,
  check_recidivism_location_risk,
}

// ─── InferenceEngine class ────────────────────────────────────────────────────

export class InferenceEngine {
  constructor(private readonly rules: InferenceRule[]) {}

  evaluate(
    profile: CitizenProfile,
    unlockedDomains: Set<DomainKey>,
    _country: CountryProfile,
  ): InferenceResult[] {
    const results: InferenceResult[] = []

    for (const rule of this.rules) {
      // Skip if required domains aren't all unlocked
      if (!rule.required_domains.every(d => unlockedDomains.has(d))) continue

      // Dispatch player-defined rules to PlayerRuleEvaluator
      if (rule.condition_function === 'player_rule_evaluator' && rule._player_rule_data) {
        if (evaluatePlayerRule(rule._player_rule_data, profile)) {
          results.push(playerRuleToInferenceResult(rule._player_rule_data, rule))
        }
        continue
      }

      const evaluator = EVALUATORS[rule.condition_function]
      if (!evaluator) continue

      const vars = evaluator(profile)
      if (!vars) continue

      const inference_text = interpolate(rule.inference_template, vars)
      const supporting_evidence = rule.evidence_templates.map(t => interpolate(t, vars))
      const implications = rule.implications_templates

      results.push({
        rule_key: rule.rule_key,
        rule_name: rule.name,
        category: rule.category,
        confidence: 0.85 + Math.random() * 0.14,  // 85-99%
        inference_text,
        supporting_evidence,
        implications,
        domains_used: rule.required_domains as DomainKey[],
        scariness_level: rule.scariness_level,
        educational_note: rule.educational_note,
        real_world_example: rule.real_world_example,
        victim_statements: rule.victim_statements,
      })
    }

    // Sort by scariness descending
    return results.sort((a, b) => b.scariness_level - a.scariness_level)
  }

  /** Returns which additional domains would unlock new inferences */
  getUnlockable(
    _profile: CitizenProfile,
    currentDomains: Set<DomainKey>,
  ): Array<{ domain: DomainKey; unlocks: string[] }> {
    const result: Array<{ domain: DomainKey; unlocks: string[] }> = []
    const allDomains: DomainKey[] = ['health', 'finance', 'judicial', 'location', 'social', 'messages']

    for (const domain of allDomains) {
      if (currentDomains.has(domain)) continue
      const withDomain = new Set([...currentDomains, domain])
      const rulesUnlocked = this.rules
        .filter(r => !r.required_domains.every(d => currentDomains.has(d)))
        .filter(r => r.required_domains.every(d => withDomain.has(d)))
        .map(r => r.name)
      if (rulesUnlocked.length > 0) {
        result.push({ domain, unlocks: rulesUnlocked })
      }
    }

    return result
  }
}
