/**
 * Social media data generator for NPCs.
 * Generates social media posts and inferences from public and private data.
 */

import { faker } from '@faker-js/faker';

export enum Platform {
  FACEBOOK = "FACEBOOK",
  TWITTER = "TWITTER",
  INSTAGRAM = "INSTAGRAM",
  LINKEDIN = "LINKEDIN",
  TIKTOK = "TIKTOK",
}

export enum InferenceCategory {
  POLITICAL_VIEWS = "political_views",
  RELIGIOUS_BELIEFS = "religious_beliefs",
  RELATIONSHIP_STATUS = "relationship_status",
  LIFESTYLE = "lifestyle",
  INTERESTS = "interests",
  LOCATION_HABITS = "location_habits",
  INTIMATE_CONTENT = "intimate_content",
  PERSONAL_CRISIS = "personal_crisis",
  HARASSMENT = "harassment",
  ILLEGAL_ACTIVITY = "illegal_activity",
  FINANCIAL = "financial",
}

export interface PublicInferenceData {
  category: InferenceCategory;
  inference_text: string;
  supporting_evidence: string;
  confidence_score: number;
  source_platform: Platform;
  data_points_analyzed: number;
  potential_harm: string;
}

export interface PrivateInferenceData {
  category: InferenceCategory;
  inference_text: string;
  supporting_evidence: string;
  confidence_score: number;
  source_platform: Platform;
  message_count: number;
  involves_other_parties: boolean;
  is_highly_sensitive: boolean;
  potential_harm: string;
}

export interface SocialMediaRecordData {
  npc_id: string;
  has_public_profile: boolean;
  primary_platform: Platform | null;
  account_created_date: string | null; // ISO date string
  follower_count: number | null;
  post_frequency: string | null;
  uses_end_to_end_encryption: boolean;
  encryption_explanation: string | null;
  public_inferences: PublicInferenceData[];
  private_inferences: PrivateInferenceData[];
}

// Reference data - loaded from JSON
let socialRef: any = null;

/**
 * Load social reference data from JSON file
 */
export async function loadSocialReference(): Promise<void> {
  const response = await fetch('/data/reference/social.json');
  socialRef = await response.json();
}

/**
 * Generate a date from relative time string (e.g., "-10y", "-1y")
 */
function getRelativeDate(relative: string): Date {
  const now = new Date();
  const match = relative.match(/^-(\d+)([ymd])$/);
  if (!match) return now;

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  if (unit === 'y') {
    now.setFullYear(now.getFullYear() - value);
  } else if (unit === 'm') {
    now.setMonth(now.getMonth() - value);
  } else if (unit === 'd') {
    now.setDate(now.getDate() - value);
  }

  return now;
}

/**
 * Generate a date between two dates and return as ISO string
 */
function dateBetween(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = endDate === 'today' ? new Date() : new Date(endDate);
  const date = faker.date.between({ from: start, to: end });
  return date.toISOString().split('T')[0];
}

/**
 * Generate a social media record with public and private inferences.
 */
export function generateSocialMediaRecord(npcId: string, seed?: number): SocialMediaRecordData {
  if (!socialRef) {
    throw new Error('Social reference data not loaded. Call loadSocialReference() first.');
  }

  if (seed !== undefined) {
    faker.seed(seed);
  }

  // 15% of people don't have public social media (privacy conscious)
  const hasPublicProfile = Math.random() > 0.15;

  // 20% of messaging users use end-to-end encryption
  const usesEncryption = Math.random() < 0.20;

  const record: SocialMediaRecordData = {
    npc_id: npcId,
    has_public_profile: hasPublicProfile,
    primary_platform: null,
    account_created_date: null,
    follower_count: null,
    post_frequency: null,
    uses_end_to_end_encryption: usesEncryption,
    encryption_explanation: null,
    public_inferences: [],
    private_inferences: [],
  };

  // Generate public inferences if they have public profile
  if (hasPublicProfile) {
    const platform = faker.helpers.arrayElement(Object.values(Platform));
    record.primary_platform = platform;
    record.account_created_date = dateBetween(
      getRelativeDate('-10y').toISOString(),
      getRelativeDate('-1y').toISOString()
    );
    record.follower_count = faker.number.int({ min: 50, max: 2000 });
    record.post_frequency = faker.helpers.arrayElement([
      "Multiple times daily",
      "Daily",
      "Few times a week",
      "Weekly",
      "Rarely"
    ]);

    // Generate 2-5 public inferences
    const numInferences = faker.number.int({ min: 2, max: 5 });
    const availableCategories = Object.keys(socialRef.public_inferences);
    const selectedCategories = faker.helpers.arrayElements(availableCategories, numInferences);

    for (const category of selectedCategories) {
      const inferenceOptions = socialRef.public_inferences[category];
      const inference = faker.helpers.arrayElement(inferenceOptions) as any;

      record.public_inferences.push({
        category: category as InferenceCategory,
        inference_text: inference.inference_text as string,
        supporting_evidence: inference.supporting_evidence as string,
        confidence_score: faker.number.int({ min: 70, max: 95 }),
        source_platform: platform,
        data_points_analyzed: faker.number.int({ min: 10, max: 100 }),
        potential_harm: inference.potential_harm as string,
      });
    }
  }

  // Generate private inferences (requires privileged database access)
  if (usesEncryption) {
    // User uses end-to-end encryption - no private data available
    record.encryption_explanation = "This person uses end-to-end encrypted messaging (Signal, WhatsApp with encryption enabled). No private message content can be analyzed. This demonstrates how encryption protects privacy even when other data is compromised.";
  } else {
    // Generate 1-3 private inferences (sensitive content)
    const numPrivate = faker.number.int({ min: 1, max: 3 });
    const availablePrivateCategories = Object.keys(socialRef.private_inferences);
    const selectedPrivateCategories = faker.helpers.arrayElements(
      availablePrivateCategories,
      numPrivate
    );

    for (const category of selectedPrivateCategories) {
      const inferenceOptions = socialRef.private_inferences[category];
      const inference = faker.helpers.arrayElement(inferenceOptions) as any;

      const platform = faker.helpers.arrayElement(Object.values(Platform));

      record.private_inferences.push({
        category: category as InferenceCategory,
        inference_text: inference.inference_text as string,
        supporting_evidence: inference.supporting_evidence as string,
        confidence_score: faker.number.int({ min: 75, max: 98 }),
        source_platform: platform,
        message_count: faker.number.int({ min: 10, max: 100 }),
        involves_other_parties: faker.helpers.arrayElement([true, true, false]),
        is_highly_sensitive: true,
        potential_harm: inference.potential_harm as string,
      });
    }
  }

  return record;
}
