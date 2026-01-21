/**
 * Message generation for chat control surveillance simulation.
 *
 * Generates realistic private messages and flags them based on keywords
 * and sentiment analysis. Educational purpose: Shows how mass message
 * surveillance works and why it's dangerous.
 */

import { faker } from '@faker-js/faker';

export interface MessageData {
  timestamp: string; // ISO date string
  recipient_id: string | null;
  recipient_name: string;
  recipient_relationship: string;
  content: string;
  is_flagged: boolean;
  flag_reasons: string[];
  sentiment: number; // -1 to 1
  detected_keywords: string[];
}

export interface MessageRecordData {
  npc_id: string;
  total_messages_analyzed: number;
  flagged_message_count: number;
  sentiment_score: number; // Average sentiment
  encryption_attempts: number;
  foreign_contact_count: number;
  messages: MessageData[];
}

// Message templates by category
const MUNDANE_MESSAGES = [
  "Running late, save me a seat",
  "Did you see the game last night?",
  "Mom wants to know if you're coming for dinner Sunday",
  "Thanks for lunch today! Same time next week?",
  "Can you pick up milk on your way home?",
  "Just finished work. Want to grab a drink?",
  "Happy birthday! Hope you have a great day",
  "LOL that video you sent was hilarious",
  "Sorry I missed your call, what's up?",
  "Sounds good, see you then",
  "How was your day?",
  "Got your message, will call you later",
  "Don't forget about the meeting tomorrow",
  "Thanks for helping me move last weekend!",
  "What time does the movie start?",
  "I'm free this weekend if you want to hang out",
  "Congrats on the new job!",
  "Hope you feel better soon",
  "Let me know when you get home safe",
  "Want to order pizza tonight?",
];

const VENTING_MESSAGES = [
  "I can't believe they passed that law. This country is going insane.",
  "Work is killing me. Sometimes I wonder what's the point.",
  "The news is so depressing. I try not to watch anymore.",
  "Everything is so expensive now. I don't know how we're supposed to survive.",
  "I'm so tired of all this. When does it get better?",
  "Another day, another dollar. Except the dollars don't go as far.",
  "I hate that I have to work two jobs just to make rent.",
  "The healthcare system is broken. I can't afford my medications.",
  "Sometimes I feel like giving up on everything.",
  "They keep taking more and more of our rights away.",
  "I'm exhausted. Mentally, physically, emotionally.",
  "This system is designed to crush people like us.",
  "I don't recognize this country anymore.",
  "What's the point of voting when nothing changes?",
  "I'm scared for the future.",
];

const ORGANIZING_MESSAGES = [
  "Are you coming to the protest Saturday? We need everyone.",
  "We should start a group to fight this. I know people who can help.",
  "Don't say too much over text. Let's talk in person.",
  "Meeting at the usual place tomorrow at 7. Spread the word.",
  "Have you thought about what we discussed? Time to act.",
  "Downloaded that encrypted app. You should too.",
  "They can't arrest all of us if we stand together.",
  "We need to organize. Things won't change otherwise.",
  "Can you get 10 people to show up? We need numbers.",
  "Don't use your real name when you sign up.",
  "Bring cash, no digital trail.",
  "Looking into moving abroad. This isn't sustainable.",
  "Know any lawyers? Might need one soon.",
  "Delete this after you read it.",
  "They're watching everything. Be careful what you say.",
];

const WORK_COMPLAINTS = [
  "Boss is being unreasonable again.",
  "They want us to work overtime without pay.",
  "I'm looking for a new job. Can't take this anymore.",
  "HR did nothing about my complaint.",
  "They cut benefits again. How is this legal?",
  "Thinking about reporting them to the labor board.",
];

const MENTAL_HEALTH_MESSAGES = [
  "Having a really rough day. Can we talk?",
  "The anxiety is getting worse again.",
  "I don't want to be a burden but I'm struggling.",
  "Therapy helped but I can't afford to keep going.",
  "I feel so alone sometimes.",
  "It's hard to get out of bed lately.",
  "Thanks for being there for me. I really needed it.",
  "Having dark thoughts again. Sorry to worry you.",
];

const FINANCIAL_STRESS_MESSAGES = [
  "Got another collections call today.",
  "Credit card got declined. So embarrassing.",
  "I don't know how I'm going to make rent this month.",
  "Can I borrow $50 until payday?",
  "Had to pawn my laptop. Things are that bad.",
  "Looking for side gigs if you know of anything.",
];

// Keywords that trigger message flagging
const CONCERNING_KEYWORDS = [
  // Political/activism
  "protest", "organize", "fight back", "resist", "revolution", "overthrow",
  "demonstration", "rally", "activist",
  // Privacy/security
  "encrypt", "encryption", "VPN", "secure app", "burner phone", "delete this",
  // Extreme actions
  "leave the country", "asylum", "flee", "escape", "can't take this",
  // Rights/freedom
  "rights", "freedom", "liberty", "surveillance", "watching us", "privacy", "censorship",
  // System criticism
  "broken system", "corrupt", "injustice", "authoritarian",
];

/**
 * Get probability weights for message categories based on profile
 */
function getMessageWeights(
  hasMentalHealth: boolean,
  hasFinancialStress: boolean,
  isActivist: boolean
): Record<string, number> {
  return {
    mundane: 50.0,  // Most messages are mundane
    venting: 20.0,
    work: 10.0,
    mental_health: hasMentalHealth ? 5.0 : 1.0,
    financial: hasFinancialStress ? 5.0 : 1.0,
    organizing: isActivist ? 10.0 : 2.0,
  };
}

/**
 * Weighted random selection
 */
function weightedChoice<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

/**
 * Generate message content based on category
 */
function generateMessageContent(category: string): string {
  if (category === "mundane") {
    return faker.helpers.arrayElement(MUNDANE_MESSAGES);
  } else if (category === "venting") {
    return faker.helpers.arrayElement(VENTING_MESSAGES);
  } else if (category === "work") {
    return faker.helpers.arrayElement(WORK_COMPLAINTS);
  } else if (category === "mental_health") {
    return faker.helpers.arrayElement(MENTAL_HEALTH_MESSAGES);
  } else if (category === "financial") {
    return faker.helpers.arrayElement(FINANCIAL_STRESS_MESSAGES);
  } else if (category === "organizing") {
    return faker.helpers.arrayElement(ORGANIZING_MESSAGES);
  } else {
    return faker.helpers.arrayElement(MUNDANE_MESSAGES);
  }
}

/**
 * Generate recipient name and relationship
 */
function generateRecipient(): { name: string; relationship: string } {
  const relationships = ["friend", "family", "coworker", "unknown"];
  const names = ["Alex", "Sam", "Jordan", "Morgan", "Casey", "Taylor", "Riley", "Jamie"];

  const relationship = faker.helpers.arrayElement(relationships);
  let name = faker.helpers.arrayElement(names);

  // Personalize based on relationship
  if (relationship === "family") {
    name = faker.helpers.arrayElement(["Mom", "Dad", "Sister", "Brother", "Aunt", "Uncle"]);
  }

  return { name, relationship };
}

/**
 * Analyze message content for sentiment and flagging
 */
function analyzeMessage(content: string): {
  sentiment: number;
  detectedKeywords: string[];
  isFlagged: boolean;
  flagReasons: string[];
} {
  const contentLower = content.toLowerCase();

  // Detect keywords
  const detectedKeywords = CONCERNING_KEYWORDS.filter(kw =>
    contentLower.includes(kw.toLowerCase())
  );

  // Determine sentiment (-1 to 1)
  const negativeWords = [
    "hate", "can't", "won't", "never", "broken", "fail",
    "terrible", "worst", "hopeless"
  ];
  const positiveWords = [
    "love", "great", "thanks", "happy", "wonderful", "amazing", "best"
  ];

  let sentiment = 0.0;
  for (const word of negativeWords) {
    if (contentLower.includes(word)) {
      sentiment -= 0.2;
    }
  }
  for (const word of positiveWords) {
    if (contentLower.includes(word)) {
      sentiment += 0.2;
    }
  }

  sentiment = Math.max(-1.0, Math.min(1.0, sentiment)); // Clamp to -1 to 1

  // Check if flagged
  const { isFlagged, flagReasons } = checkFlags(content, detectedKeywords);

  return { sentiment, detectedKeywords, isFlagged, flagReasons };
}

/**
 * Check if message should be flagged and why
 */
function checkFlags(content: string, detectedKeywords: string[]): {
  isFlagged: boolean;
  flagReasons: string[];
} {
  const flagReasons: string[] = [];
  const contentLower = content.toLowerCase();

  // Flag if contains concerning keywords
  if (detectedKeywords.length > 0) {
    flagReasons.push(`Contains keywords: ${detectedKeywords.slice(0, 3).join(', ')}`);
  }

  // Flag if mentions encryption/privacy tools
  if (["encrypt", "vpn", "secure app", "burner"].some(word => contentLower.includes(word))) {
    flagReasons.push("Privacy tool discussion");
  }

  // Flag if discusses organizing/protests
  if (["protest", "organize", "rally"].some(word => contentLower.includes(word))) {
    flagReasons.push("Organizing activity");
  }

  // Flag if discusses leaving country
  if (["leave the country", "asylum", "flee"].some(word => contentLower.includes(word))) {
    flagReasons.push("Flight risk indicators");
  }

  // Flag if mentions surveillance awareness
  if (["watching", "monitoring", "surveillance"].some(word => contentLower.includes(word))) {
    flagReasons.push("Surveillance awareness");
  }

  const isFlagged = flagReasons.length > 0;
  return { isFlagged, flagReasons };
}

/**
 * Generate complete message history for an NPC
 */
export function generateMessageHistory(
  npcId: string,
  options: {
    hasMentalHealth?: boolean;
    hasFinancialStress?: boolean;
    isActivist?: boolean;
  } = {},
  seed?: number
): MessageRecordData {
  if (seed !== undefined) {
    faker.seed(seed);
  }

  const {
    hasMentalHealth = false,
    hasFinancialStress = false,
    isActivist = false
  } = options;

  // Generate 20-50 messages over past 30 days
  const numMessages = faker.number.int({ min: 20, max: 50 });
  const messages: MessageData[] = [];

  const weights = getMessageWeights(hasMentalHealth, hasFinancialStress, isActivist);
  const categories = Object.keys(weights);
  const categoryWeights = Object.values(weights);

  for (let i = 0; i < numMessages; i++) {
    // Timestamp: Random time in past 30 days
    const daysAgo = faker.number.float({ min: 0, max: 30, fractionDigits: 2 });
    const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Choose message category based on profile
    const category = weightedChoice(categories, categoryWeights);

    // Generate message content
    const content = generateMessageContent(category);

    // Generate recipient
    const recipient = generateRecipient();

    // Analyze message
    const { sentiment, detectedKeywords, isFlagged, flagReasons } = analyzeMessage(content);

    messages.push({
      timestamp: timestamp.toISOString(),
      recipient_id: null, // Could link to other NPCs in future
      recipient_name: recipient.name,
      recipient_relationship: recipient.relationship,
      content,
      is_flagged: isFlagged,
      flag_reasons: flagReasons,
      sentiment,
      detected_keywords: detectedKeywords,
    });
  }

  // Sort messages by timestamp
  messages.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate aggregates
  const flaggedCount = messages.filter(m => m.is_flagged).length;
  const avgSentiment = messages.length > 0
    ? messages.reduce((sum, m) => sum + m.sentiment, 0) / messages.length
    : 0;

  // Count encryption attempts (messages mentioning encryption)
  const encryptionAttempts = messages.filter(m =>
    m.detected_keywords.some(k => k.includes("encrypt"))
  ).length;

  // Foreign contacts (placeholder)
  const foreignContactCount = faker.number.int({ min: 0, max: 3 });

  return {
    npc_id: npcId,
    total_messages_analyzed: messages.length,
    flagged_message_count: flaggedCount,
    sentiment_score: avgSentiment,
    encryption_attempts: encryptionAttempts,
    foreign_contact_count: foreignContactCount,
    messages,
  };
}
