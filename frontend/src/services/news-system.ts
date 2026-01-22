/**
 * News System Service - generates news articles and handles suppression.
 *
 * Articles can be:
 * - Triggered: Generated in response to specific actions
 * - Background: General coverage of the situation
 * - Exposure: About the operator themselves
 *
 * Suppression actions (PRESS_BAN, PRESSURE_FIRING) have a Streisand effect risk.
 *
 * Port of backend/src/datafusion/services/news_system.py
 */

import { gameStore } from '../state/GameStore';
import type { NewActionType, ArticleType, NewsArticleRead, NewsChannelRead, SystemActionRead } from '../types';
import { getSeverityScore } from './severity-scoring';

/**
 * Article headline templates by action type.
 */
const ARTICLE_TEMPLATES: Partial<Record<NewActionType, Record<string, string[]>>> = {
  ice_raid: {
    critical: [
      'Families Torn Apart: {neighborhood} Raid Condemned',
      'Immigration Sweep Leaves {neighborhood} Traumatized',
      'Witnesses Report Brutal Tactics in {neighborhood} Operation',
    ],
    independent: [
      'Immigration Enforcement Operation Conducted in {neighborhood}',
      'Federal Agents Execute Raid in {neighborhood} District',
      'Residents Describe Chaos During {neighborhood} Operation',
    ],
    state: [
      'Security Forces Remove Illegal Residents from {neighborhood}',
      'Successful Operation Secures {neighborhood}',
      'Law Enforcement Restores Order in {neighborhood}',
    ],
  },
  arbitrary_detention: {
    critical: [
      'Journalist Detained Without Charges: Press Freedom Under Threat',
      'Reporter {name} Arrested, No Statement Released',
      'Press Freedom Groups Condemn Detention of {name}',
    ],
    independent: [
      'Reporter {name} Detained by Authorities',
      'Questions Raised Over {name}\'s Arrest',
      'Journalist Held Without Formal Charges',
    ],
    state: [
      'Individual Detained for National Security Reasons',
      'Security Concerns Lead to Preventive Detention',
      'Authorities Act on Credible Threat',
    ],
  },
  detention: {
    critical: [
      'Citizen Detained in Escalating Crackdown',
      'Arbitrary Arrest Raises Civil Liberty Concerns',
      'Legal Experts Question Detention Practices',
    ],
    independent: [
      'Local Resident Taken Into Custody',
      'Detention Reported by Family Members',
      'Arrest Made Without Public Statement',
    ],
    state: [
      'Law Enforcement Makes Arrest in Ongoing Investigation',
      'Individual Detained Following Security Review',
      'Authorities Execute Lawful Detention',
    ],
  },
  intervention: {
    critical: [
      'Forced Intervention Sparks Outrage',
      'Heavy-Handed Tactics Condemned by Rights Groups',
      'Intervention Deemed Excessive by Observers',
    ],
    independent: [
      'Authorities Conduct Intervention',
      'Security Forces Deploy in Response',
      'Operation Targets Flagged Individual',
    ],
    state: [
      'Swift Action Prevents Potential Incident',
      'Security Forces Respond Appropriately',
      'Intervention Ensures Public Safety',
    ],
  },
  declare_protest_illegal: {
    critical: [
      'Peaceful Protest Declared Illegal: Right to Assembly Under Attack',
      'Critics Blast Ban on Democratic Expression',
      'Crackdown on Dissent Intensifies',
    ],
    independent: [
      'Protest Declared Unlawful by Authorities',
      'Demonstration Status Revoked',
      'Gathering Banned Amid Security Concerns',
    ],
    state: [
      'Illegal Gathering Properly Prohibited',
      'Authorities Prevent Dangerous Assembly',
      'Order Maintained Through Lawful Ban',
    ],
  },
  incite_violence: {
    critical: [
      'Evidence Suggests State-Sponsored Agitator at Protest',
      'Undercover Agent Caught Inciting Violence',
      'Provocation Exposed: Government Sabotaged Peaceful Protest',
    ],
    independent: [
      'Questions Emerge About Violence at Protest',
      'Witness Accounts Conflict on Protest Violence',
      'Investigation Launched Into Protest Clashes',
    ],
    state: [
      'Violent Protesters Threaten Public Safety',
      'Authorities Forced to Respond to Aggression',
      'Protesters Turn Violent, Security Forces React',
    ],
  },
  // Default for other action types
  monitoring: {
    critical: ['Surveillance Program Draws Criticism'],
    independent: ['New Monitoring Initiative Announced'],
    state: ['Enhanced Security Monitoring Implemented'],
  },
  restriction: {
    critical: ['Freedom of Movement Restrictions Imposed'],
    independent: ['New Travel Restrictions Announced'],
    state: ['Security Restrictions Necessary, Officials Say'],
  },
  press_ban: {
    critical: ['Press Freedom Under Attack'],
    independent: ['Media Outlet Banned'],
    state: ['Security Measures Include Media Restrictions'],
  },
  pressure_firing: {
    critical: ['Journalist Fired Under Pressure'],
    independent: ['Reporter Dismissed Amid Controversy'],
    state: ['Personnel Changes at News Organization'],
  },
  hospital_arrest: {
    critical: ['Patient Arrested in Hospital Bed'],
    independent: ['Arrest Made at Medical Facility'],
    state: ['Security Operation at Hospital'],
  },
};

/**
 * Background article templates (not tied to specific actions).
 */
const BACKGROUND_TEMPLATES: Record<string, string[]> = {
  critical: [
    'Surveillance State Concerns Mount as Operations Intensify',
    'Civil Liberties Groups Warn of Authoritarian Drift',
    'International Observers Express Alarm at Domestic Policies',
    'Data Privacy Violations Documented in Growing Number of Cases',
  ],
  independent: [
    'Security Operations Continue Amid Public Debate',
    'Controversy Surrounds Latest Government Initiatives',
    'Citizens Navigate New Surveillance Measures',
    'Questions Raised About Oversight of Security Programs',
  ],
};

/**
 * Exposure article templates (about the operator).
 */
const EXPOSURE_TEMPLATES_HINTS = [
  'Sources Report Surveillance Operators Struggle With Moral Concerns',
  'Anonymous Accounts Describe Pressure on Security Personnel',
  'Insiders Hint at Dissent Within Surveillance Programs',
];

const EXPOSURE_TEMPLATES_PARTIAL = [
  'Leaked Data Reveals Surveillance Operator Behavior Patterns',
  'Anonymous Operator\'s Search History Raises Ethical Questions',
  'Internal Documents Show System Tracks Its Own Operators',
];

const EXPOSURE_TEMPLATES_FULL = [
  'EXPOSED: Full Profile of Surveillance Operator {name}',
  'Operator {name} Identified: Complete Behavioral Data Leaked',
  'The Watcher Watched: {name}\'s Role in Surveillance State Revealed',
];

/**
 * Generate a news article triggered by a specific action.
 */
export function generateTriggeredArticle(
  action: SystemActionRead,
  channel: NewsChannelRead
): NewsArticleRead {
  // Get templates for this action type
  const templates = ARTICLE_TEMPLATES[action.action_type] || {};
  const stanceTemplates = templates[channel.stance] || [];

  let headline: string;
  if (stanceTemplates.length === 0) {
    // Fallback for action types without specific templates
    headline = `Authorities Take Action: ${action.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
  } else {
    headline = stanceTemplates[Math.floor(Math.random() * stanceTemplates.length)];
  }

  // Format headline with context
  if (headline.includes('{neighborhood}') && action.target_neighborhood) {
    headline = headline.replace(/{neighborhood}/g, action.target_neighborhood);
  } else if (headline.includes('{name}')) {
    // Would need to get citizen name from action.target_citizen_id
    headline = headline.replace(/{name}/g, 'Local Citizen');
  }

  // Generate summary based on stance
  const summary = generateArticleSummary(action, channel.stance);

  // Calculate impact on metrics
  const [angerChange, awarenessChange] = calculateArticleImpact(action, channel.stance);

  const article: NewsArticleRead = {
    id: crypto.randomUUID(),
    operator_id: action.operator_id,
    news_channel_id: channel.id,
    channel_name: channel.name,
    article_type: 'triggered' as ArticleType,
    headline,
    summary,
    triggered_by_action_id: action.id,
    public_anger_change: angerChange,
    international_awareness_change: awarenessChange,
    was_suppressed: false,
    suppression_action_id: null,
    created_at: new Date().toISOString(),
  };

  gameStore.addNewsArticle(article);
  return article;
}

/**
 * Generate a background news article (general coverage).
 */
export function generateBackgroundArticle(
  operatorId: string,
  channel: NewsChannelRead
): NewsArticleRead {
  const templates = BACKGROUND_TEMPLATES[channel.stance] || [];
  const headline = templates.length > 0
    ? templates[Math.floor(Math.random() * templates.length)]
    : 'Ongoing Security Operations Continue';

  const summary = generateBackgroundSummary(channel.stance);

  // Background articles have lower impact
  const angerChange = channel.stance === 'critical' ? 2 : 1;
  const awarenessChange = channel.stance === 'critical' ? 3 : 2;

  const article: NewsArticleRead = {
    id: crypto.randomUUID(),
    operator_id: operatorId,
    news_channel_id: channel.id,
    channel_name: channel.name,
    article_type: 'random' as ArticleType,
    headline,
    summary,
    triggered_by_action_id: null,
    public_anger_change: angerChange,
    international_awareness_change: awarenessChange,
    was_suppressed: false,
    suppression_action_id: null,
    created_at: new Date().toISOString(),
  };

  gameStore.addNewsArticle(article);
  return article;
}

/**
 * Generate an article exposing the operator.
 */
export function generateExposureArticle(
  operatorId: string,
  exposureStage: number,
  operatorName: string
): NewsArticleRead {
  // Find a critical channel for exposure
  let channel = gameStore.getAllNewsChannels().find(
    c => c.stance === 'critical' && !c.is_banned
  );

  if (!channel) {
    // Fallback to any non-banned channel
    channel = gameStore.getAllNewsChannels().find(c => !c.is_banned);
  }

  if (!channel) {
    throw new Error('No available news channels for exposure article');
  }

  // Select template based on stage
  let headline: string;
  let summary: string;
  let awarenessChange: number;

  if (exposureStage === 1) {
    headline = EXPOSURE_TEMPLATES_HINTS[Math.floor(Math.random() * EXPOSURE_TEMPLATES_HINTS.length)];
    summary = 'Anonymous sources within the surveillance apparatus describe growing unease among operators. Details remain vague, but insiders suggest moral concerns are becoming harder to ignore.';
    awarenessChange = 5;
  } else if (exposureStage === 2) {
    headline = EXPOSURE_TEMPLATES_PARTIAL[Math.floor(Math.random() * EXPOSURE_TEMPLATES_PARTIAL.length)];
    summary = 'Leaked internal documents reveal the surveillance system tracks its own operators. Search queries, hesitation patterns, and behavioral data are all monitored. The watchers are watched.';
    awarenessChange = 15;
  } else {
    // stage 3
    headline = EXPOSURE_TEMPLATES_FULL[Math.floor(Math.random() * EXPOSURE_TEMPLATES_FULL.length)].replace(/{name}/g, operatorName);
    summary = `A massive data leak has exposed the complete profile of surveillance operator ${operatorName}, including their home address, family members, and detailed behavioral patterns. The full extent of state surveillance has been laid bare - including surveillance of its own personnel.`;
    awarenessChange = 25;
  }

  const article: NewsArticleRead = {
    id: crypto.randomUUID(),
    operator_id: operatorId,
    news_channel_id: channel.id,
    channel_name: channel.name,
    article_type: 'exposure' as ArticleType,
    headline,
    summary,
    triggered_by_action_id: null,
    public_anger_change: 5 * exposureStage,
    international_awareness_change: awarenessChange,
    was_suppressed: false,
    suppression_action_id: null,
    created_at: new Date().toISOString(),
  };

  gameStore.addNewsArticle(article);
  return article;
}

/**
 * Execute news channel suppression (PRESS_BAN or PRESSURE_FIRING).
 *
 * This is a gamble: 60% success, 40% Streisand effect (huge backlash).
 *
 * @returns Tuple of (success, awareness_change, anger_change)
 */
export function suppressNewsChannel(
  channelId: string,
  actionType: NewActionType
): [boolean, number, number] {
  const channel = gameStore.getNewsChannel(channelId);
  if (!channel) {
    throw new Error(`Channel ${channelId} not found`);
  }

  // Gamble: 60% success, 40% Streisand effect
  const success = Math.random() < 0.60;

  if (success) {
    // Suppression works
    if (actionType === 'press_ban') {
      gameStore.updateNewsChannel(channel.id, {
        is_banned: true,
        banned_at: new Date().toISOString(),
      });
      return [true, 3, 5]; // awareness_change, anger_change
    } else {
      // PRESSURE_FIRING
      // Fire a reporter
      if (channel.reporters && channel.reporters.length > 0) {
        const reporter = channel.reporters[Math.floor(Math.random() * channel.reporters.length)];
        reporter.fired = true;
        gameStore.updateNewsChannel(channel.id, { reporters: channel.reporters });
      }
      return [true, 2, 4];
    }
  } else {
    // Streisand effect: Suppression backfires massively
    // Attempting to silence the press draws way more attention
    const awarenessChange = 20; // Huge international attention
    const angerChange = 15; // Public outrage

    // Channel is NOT suppressed and gains credibility
    gameStore.updateNewsChannel(channel.id, {
      credibility: Math.min(100, channel.credibility + 10),
    });

    return [false, awarenessChange, angerChange];
  }
}

/**
 * Generate article summary based on action and channel stance.
 */
function generateArticleSummary(action: SystemActionRead, stance: string): string {
  const actionName = action.action_type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  if (stance === 'critical') {
    return `Human rights groups have condemned the recent ${actionName} as an escalation of authoritarian practices. Legal experts question the lawfulness and proportionality of the action, while affected families describe trauma and fear.`;
  } else if (stance === 'independent') {
    return `Authorities conducted a ${actionName} operation, with conflicting accounts emerging from officials and witnesses. The action has sparked debate about security measures and civil liberties.`;
  } else {
    // state_friendly
    return `Security forces successfully executed a ${actionName} operation in line with public safety protocols. Officials emphasize the necessity of strong measures to maintain order and security.`;
  }
}

/**
 * Generate summary for background articles.
 */
function generateBackgroundSummary(stance: string): string {
  if (stance === 'critical') {
    return 'As surveillance operations intensify, civil liberties organizations warn of an alarming erosion of fundamental rights. International observers have begun monitoring the situation closely.';
  } else {
    // independent
    return 'The ongoing security program continues to generate public discussion. Supporters cite safety concerns while critics raise questions about oversight and transparency.';
  }
}

/**
 * Calculate how much an article affects public metrics.
 *
 * @returns Tuple of (anger_change, awareness_change)
 */
function calculateArticleImpact(action: SystemActionRead, stance: string): [number, number] {
  const severity = getSeverityScore(action.action_type);

  // Base impact scales with severity
  const baseAnger = Math.floor(severity / 2);
  const baseAwareness = Math.floor(severity / 2);

  // Stance modifiers
  let angerChange: number;
  let awarenessChange: number;

  if (stance === 'critical') {
    angerChange = baseAnger + 3;
    awarenessChange = baseAwareness + 2;
  } else if (stance === 'independent') {
    angerChange = baseAnger + 1;
    awarenessChange = baseAwareness + 1;
  } else {
    // state_friendly
    angerChange = Math.max(1, baseAnger - 2);
    awarenessChange = Math.max(1, baseAwareness - 2);
  }

  return [angerChange, awarenessChange];
}
