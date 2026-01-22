/**
 * Social media domain types.
 * Mirrors backend/src/datafusion/models/social.py
 */

// === Enums ===

export enum Platform {
  FACEBOOK = "facebook",
  TWITTER = "twitter",
  INSTAGRAM = "instagram",
  LINKEDIN = "linkedin",
  TIKTOK = "tiktok",
  SNAPCHAT = "snapchat",
  REDDIT = "reddit",
  DISCORD = "discord",
}

export enum InferenceCategory {
  POLITICAL_VIEWS = "political_views",
  RELIGIOUS_BELIEFS = "religious_beliefs",
  RELATIONSHIP_STATUS = "relationship_status",
  LIFESTYLE = "lifestyle",
  INTERESTS = "interests",
  EMPLOYMENT = "employment",
  EDUCATION = "education",
  LOCATION_HABITS = "location_habits",
  FAMILY = "family",
  HEALTH = "health",
  FINANCIAL = "financial",
  PERSONAL_CRISIS = "personal_crisis",
  INTIMATE_CONTENT = "intimate_content",
  HARASSMENT = "harassment",
  ILLEGAL_ACTIVITY = "illegal_activity",
}

// === Interfaces ===

export interface SocialMediaRecord {
  id: string;
  npc_id: string;
  has_public_profile: boolean;
  primary_platform: Platform | null;
  account_created_date: string | null;
  follower_count: number | null;
  post_frequency: string | null;
  uses_end_to_end_encryption: boolean;
  encryption_explanation: string | null;
  public_inferences: PublicInference[];
  private_inferences: PrivateInference[];
  created_at: string;
  updated_at: string;
}

export interface PublicInference {
  id: string;
  social_media_record_id: string;
  category: InferenceCategory;
  inference_text: string;
  supporting_evidence: string;
  confidence_score: number;
  source_platform: Platform;
  data_points_analyzed: number;
  potential_harm: string;
  created_at: string;
  updated_at: string;
}

export interface PrivateInference {
  id: string;
  social_media_record_id: string;
  category: InferenceCategory;
  inference_text: string;
  supporting_evidence: string;
  confidence_score: number;
  source_platform: Platform;
  message_count: number;
  involves_other_parties: boolean;
  is_highly_sensitive: boolean;
  potential_harm: string;
  created_at: string;
  updated_at: string;
}
