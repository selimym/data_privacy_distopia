/**
 * Event Generation Service - orchestrates all triggered and random events.
 *
 * This service determines when events occur (news articles, protests, etc.) and
 * creates them. Designed to be modular and scale with increased NPCs/city size.
 *
 * Events can be:
 * - Triggered: Occur as a result of an action (probability-based)
 * - Random: Occur on time progression (directive advance)
 *
 * Port of backend/src/datafusion/services/event_generation.py
 */

import { gameStore } from '../state/GameStore';
import type { NPCRead, PublicMetricsRead, SystemActionRead } from '../types';
import { calculateNewsProbability, calculateProtestProbability } from './public-metrics';
import { getSeverityScore } from './severity-scoring';
import { generateTriggeredArticle, generateBackgroundArticle } from './news-system';
import { triggerProtest } from './protest-system';

/**
 * Base class for triggered events.
 */
export interface TriggeredEvent {
  event_type: 'news_article' | 'protest' | 'book_publication' | 'background_news';
  event_id?: string;
  data: Record<string, unknown>;
}

/**
 * Result of detention injury check.
 */
export interface DetentionInjury {
  injury_occurred: boolean;
  citizen_id?: string;
}

/**
 * Check if an action triggers any events (news, protests).
 *
 * This is the main orchestrator called after every action.
 * Modular design: each event type has its own probability check.
 */
export function checkTriggeredEvents(
  action: SystemActionRead,
  publicMetrics: PublicMetricsRead
): TriggeredEvent[] {
  const events: TriggeredEvent[] = [];

  // Check for news article (all non-banned news channels)
  const newsEvents = checkNewsArticleTrigger(action, publicMetrics);
  events.push(...newsEvents);

  // Check for protest
  const protestEvent = checkProtestTrigger(action, publicMetrics);
  if (protestEvent) {
    events.push(protestEvent);
  }

  return events;
}

/**
 * Check if action triggers news articles from various outlets.
 *
 * Multiple channels can cover the same event.
 * Probability varies by channel stance.
 */
export function checkNewsArticleTrigger(
  action: SystemActionRead,
  publicMetrics: PublicMetricsRead
): TriggeredEvent[] {
  const severity = getSeverityScore(action.action_type);
  const awareness = publicMetrics.international_awareness;

  const events: TriggeredEvent[] = [];

  // Get all non-banned news channels
  const channels = gameStore.getAllNewsChannels().filter(c => !c.is_banned);

  // Check each channel independently (scalable to any number of channels)
  for (const channel of channels) {
    const probability = calculateNewsProbability(severity, channel.stance, awareness);

    if (Math.random() < probability) {
      // Generate article immediately
      const article = generateTriggeredArticle(action, channel);

      const event: TriggeredEvent = {
        event_type: 'news_article',
        event_id: article.id,
        data: {
          channel_id: channel.id,
          channel_name: channel.name,
          action_id: action.id,
          severity,
          article,
        },
      };
      events.push(event);
    }
  }

  return events;
}

/**
 * Check if action triggers a protest.
 *
 * Probability based on severity and public anger.
 */
export function checkProtestTrigger(
  action: SystemActionRead,
  publicMetrics: PublicMetricsRead
): TriggeredEvent | null {
  const severity = getSeverityScore(action.action_type);
  const anger = publicMetrics.public_anger;

  const probability = calculateProtestProbability(severity, anger);

  if (Math.random() < probability) {
    // Generate protest immediately
    const protest = triggerProtest(action.operator_id, action, anger);

    const event: TriggeredEvent = {
      event_type: 'protest',
      event_id: protest.id,
      data: {
        action_id: action.id,
        severity,
        anger,
        protest,
      },
    };
    return event;
  }

  return null;
}

/**
 * Check if a DETENTION action causes injury (30% chance).
 *
 * If injury occurs, citizen becomes hospitalized and HOSPITAL_ARREST
 * becomes available as a follow-up action.
 */
export function checkDetentionInjury(
  action: SystemActionRead,
  citizen: NPCRead
): DetentionInjury {
  if (action.action_type !== 'detention') {
    return { injury_occurred: false };
  }

  // 30% chance of injury
  const injuryOccurred = Math.random() < 0.30;

  if (injuryOccurred) {
    // Update citizen status
    gameStore.updateNPC(citizen.id, {
      is_hospitalized: true,
      injury_from_action_id: action.id,
    });
  }

  return {
    injury_occurred: injuryOccurred,
    citizen_id: citizen.id,
  };
}

/**
 * Generate random events that occur on time progression (directive advance).
 *
 * These are not triggered by actions, but by the passage of time.
 * Modular design: easy to add new random event types.
 */
export function generateRandomEvents(operatorId: string, currentWeek: number): TriggeredEvent[] {
  const events: TriggeredEvent[] = [];

  // Random news article (15% chance)
  if (Math.random() < 0.15) {
    const event = generateBackgroundNewsEvent(operatorId);
    if (event) {
      events.push(event);
    }
  }

  // Random book publication (20% chance, weeks 4+)
  if (currentWeek >= 4 && Math.random() < 0.20) {
    const event = generateBookPublicationEvent();
    events.push(event);
  }

  return events;
}

/**
 * Generate a background news article (not triggered by specific action).
 *
 * These are general news articles about the situation, not specific actions.
 */
export function generateBackgroundNewsEvent(operatorId: string): TriggeredEvent | null {
  // Get a random non-banned critical or independent channel
  const channels = gameStore
    .getAllNewsChannels()
    .filter(c => !c.is_banned && (c.stance === 'critical' || c.stance === 'independent'));

  if (channels.length === 0) {
    return null;
  }

  const channel = channels[Math.floor(Math.random() * channels.length)];

  // Generate article immediately
  const article = generateBackgroundArticle(operatorId, channel);

  return {
    event_type: 'background_news',
    event_id: article.id,
    data: {
      channel_id: channel.id,
      channel_name: channel.name,
      operator_id: operatorId,
      article,
    },
  };
}

/**
 * Generate a book publication event.
 *
 * Books are generated with random titles and controversy types.
 * Player can choose to ban them or let them publish.
 */
export function generateBookPublicationEvent(): TriggeredEvent {
  const controversyTypes = ['dissent', 'whistleblower', 'historical_truth'];
  const controversyType = controversyTypes[Math.floor(Math.random() * controversyTypes.length)];

  return {
    event_type: 'book_publication',
    data: {
      controversy_type: controversyType,
    },
  };
}
