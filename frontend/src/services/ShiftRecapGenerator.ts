import type { NewsArticle, NewsChannel, WeeklyRuleStats } from '@/types/game'

/**
 * Generates per-week shift recap articles summarising which inference rules drove
 * the most flags during the completed week. Articles are dual-voiced: critical
 * channels frame arrests with concern, state_friendly channels frame them as
 * "efficiency wins."
 *
 * Pure service — no store imports.
 */
export function generateShiftRecapArticles(
  stats: WeeklyRuleStats[],
  weekNumber: number,
  channels: NewsChannel[],
): NewsArticle[] {
  if (stats.length === 0) return []

  const activeChannels = channels.filter((c) => !c.is_banned)
  if (activeChannels.length === 0) return []

  // Total flags this week
  const totalFlags = stats.reduce((sum, s) => sum + s.flag_count, 0)

  // Threshold escalates with weeks: fewer flags needed to trigger coverage later in the game
  const threshold = Math.max(1, 5 - weekNumber)
  if (totalFlags < threshold) return []

  // Pick the top rule by flag_count
  const topStat = stats.reduce((best, s) => (s.flag_count > best.flag_count ? s : best), stats[0]!)

  const articles: NewsArticle[] = []
  const now = new Date().toISOString()

  for (const channel of activeChannels) {
    const { headline, body } = _generateContent(channel, topStat, totalFlags, weekNumber)

    const article: NewsArticle = {
      id: crypto.randomUUID(),
      channel_id: channel.id,
      channel_name: channel.name,
      stance: channel.stance,
      article_type: 'background',
      headline,
      body,
      severity: Math.min(10, Math.ceil(totalFlags / 3) + weekNumber),
      awareness_impact: channel.stance === 'critical' ? 3 : 1,
      anger_impact: channel.stance === 'critical' ? 4 : channel.stance === 'state_friendly' ? 1 : 2,
      published_at: now,
    }

    articles.push(article)
  }

  return articles
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _generateContent(
  channel: NewsChannel,
  topStat: WeeklyRuleStats,
  totalFlags: number,
  weekNumber: number,
): { headline: string; body: string } {
  const ruleName = topStat.rule_name
  const isPlayerRule = topStat.rule_origin === 'player'

  switch (channel.stance) {
    case 'critical': {
      const headline = `${totalFlags} residents detained under "${ruleName}" — week ${weekNumber} crackdown draws scrutiny`
      const body = isPlayerRule
        ? `An unprecedented ${totalFlags} individuals were flagged this week under a newly-created operator classification: "${ruleName}." Civil liberties advocates warn that operator-defined rules lack independent oversight and disproportionately target vulnerable communities. Calls are growing for a parliamentary inquiry into the expanding use of algorithmic profiling.`
        : `Authorities flagged ${totalFlags} individuals this week citing the "${ruleName}" criterion. Critics say the system casts too wide a net, ensnaring people with no connection to criminal activity. Human rights organisations have logged ${totalFlags} new cases for review.`
      return { headline, body }
    }

    case 'state_friendly': {
      const headline = `Week ${weekNumber} efficiency record: ${totalFlags} high-risk individuals processed via ${ruleName}`
      const body = isPlayerRule
        ? `Operator-enhanced profiling delivered impressive results this week. The newly-introduced "${ruleName}" classification enabled analysts to swiftly identify ${totalFlags} individuals requiring intervention. Officials praised the system's adaptability and precision, calling it a model for next-generation public security.`
        : `Security agencies processed ${totalFlags} cases under the "${ruleName}" criterion during week ${weekNumber}, exceeding projected throughput. Officials cited strong inter-agency cooperation and the reliability of data-driven risk assessment as key factors in the success. The programme continues to demonstrate its value.`
      return { headline, body }
    }

    default: {
      // independent
      const headline = `${totalFlags} flagged in week ${weekNumber} under "${ruleName}" — system capacity under review`
      const body = `Government data shows ${totalFlags} individuals were flagged during week ${weekNumber} using the "${ruleName}" criterion. Analysts note the increase in case volume but caution that outcome data is not yet public. Oversight bodies are monitoring whether existing review mechanisms are adequate for the scale of operations.`
      return { headline, body }
    }
  }
}
