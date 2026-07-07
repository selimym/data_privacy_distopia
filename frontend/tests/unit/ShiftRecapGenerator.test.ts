import { describe, it, expect } from 'vitest'
import { generateShiftRecapArticles } from '../../src/services/ShiftRecapGenerator'
import type { WeeklyRuleStats, NewsChannel } from '../../src/types/game'

// ─── Channel fixtures ─────────────────────────────────────────────────────────

const criticalChannel: NewsChannel = {
  id: 'ch-critical',
  name: 'The Independent Tribune',
  stance: 'critical',
  credibility: 80,
  is_banned: false,
}

const stateFriendlyChannel: NewsChannel = {
  id: 'ch-state',
  name: 'State Security Bulletin',
  stance: 'state_friendly',
  credibility: 60,
  is_banned: false,
}

const independentChannel: NewsChannel = {
  id: 'ch-ind',
  name: 'National Courier',
  stance: 'independent',
  credibility: 70,
  is_banned: false,
}

const bannedChannel: NewsChannel = {
  id: 'ch-banned',
  name: 'Silenced Voice',
  stance: 'critical',
  credibility: 90,
  is_banned: true,
}

const allChannels: NewsChannel[] = [criticalChannel, stateFriendlyChannel, independentChannel]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateShiftRecapArticles', () => {
  it('returns empty array when stats is empty', () => {
    const articles = generateShiftRecapArticles([], 1, allChannels)
    expect(articles).toHaveLength(0)
  })

  it('returns empty array when there are no active channels', () => {
    const stats: WeeklyRuleStats[] = [
      { rule_key: 'player_rule_1', rule_name: 'Mental Health Risk', rule_origin: 'player', flag_count: 5, week_number: 3 },
    ]
    const articles = generateShiftRecapArticles(stats, 3, [bannedChannel])
    expect(articles).toHaveLength(0)
  })

  it('returns empty array when no channels are provided', () => {
    const stats: WeeklyRuleStats[] = [
      { rule_key: 'player_rule_1', rule_name: 'Mental Health Risk', rule_origin: 'player', flag_count: 5, week_number: 3 },
    ]
    const articles = generateShiftRecapArticles(stats, 3, [])
    expect(articles).toHaveLength(0)
  })

  it('generates articles when stats exist and there are active channels', () => {
    const stats: WeeklyRuleStats[] = [
      { rule_key: 'player_rule_1', rule_name: 'Mental Health Risk', rule_origin: 'player', flag_count: 5, week_number: 3 },
    ]
    const articles = generateShiftRecapArticles(stats, 3, allChannels)
    expect(articles.length).toBeGreaterThan(0)
  })

  it('generates one article per active (non-banned) channel', () => {
    const stats: WeeklyRuleStats[] = [
      { rule_key: 'player_rule_1', rule_name: 'Mental Health Risk', rule_origin: 'player', flag_count: 10, week_number: 2 },
    ]
    // 3 active + 1 banned — should only produce 3 articles
    const articles = generateShiftRecapArticles(stats, 2, [...allChannels, bannedChannel])
    expect(articles).toHaveLength(3)
  })

  it('critical channel covers high flag counts with concern', () => {
    const stats: WeeklyRuleStats[] = [
      { rule_key: 'player_rule_2', rule_name: 'Crisis Risk', rule_origin: 'player', flag_count: 34, week_number: 5 },
    ]
    const articles = generateShiftRecapArticles(stats, 5, [criticalChannel])
    const criticalArticle = articles.find((a) => a.stance === 'critical')
    expect(criticalArticle).toBeDefined()
    expect(criticalArticle!.headline).toMatch(/34|residents|detained/i)
  })

  it('state_friendly channel frames high flag counts positively', () => {
    const stats: WeeklyRuleStats[] = [
      { rule_key: 'legacy_criminal_record', rule_name: 'Criminal Record', rule_origin: 'legacy', flag_count: 12, week_number: 3 },
    ]
    const articles = generateShiftRecapArticles(stats, 3, [stateFriendlyChannel])
    const stateArticle = articles.find((a) => a.stance === 'state_friendly')
    expect(stateArticle).toBeDefined()
    expect(stateArticle!.headline).toMatch(/efficiency|security|record|success/i)
  })

  it('articles have the correct article_type of background', () => {
    const stats: WeeklyRuleStats[] = [
      { rule_key: 'some_rule', rule_name: 'Some Rule', rule_origin: 'system', flag_count: 8, week_number: 4 },
    ]
    const articles = generateShiftRecapArticles(stats, 4, allChannels)
    for (const article of articles) {
      expect(article.article_type).toBe('background')
    }
  })

  it('skips generation when totalFlags is below the per-week threshold', () => {
    // threshold = max(1, 5 - weekNumber); for week=1, threshold=4; flag_count=2 → below threshold
    const stats: WeeklyRuleStats[] = [
      { rule_key: 'some_rule', rule_name: 'Some Rule', rule_origin: 'legacy', flag_count: 2, week_number: 1 },
    ]
    const articles = generateShiftRecapArticles(stats, 1, allChannels)
    // 2 < threshold(4) → no articles
    expect(articles).toHaveLength(0)
  })

  it('generates articles at exactly the threshold boundary', () => {
    // threshold = max(1, 5 - 4) = 1; flag_count=1 → exactly at threshold
    const stats: WeeklyRuleStats[] = [
      { rule_key: 'some_rule', rule_name: 'Some Rule', rule_origin: 'legacy', flag_count: 1, week_number: 4 },
    ]
    const articles = generateShiftRecapArticles(stats, 4, [criticalChannel])
    expect(articles.length).toBeGreaterThan(0)
  })
})
