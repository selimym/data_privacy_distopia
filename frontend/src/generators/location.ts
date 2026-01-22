/**
 * Location tracking data generator for NPCs.
 * Generates location records and inferred location patterns.
 */

import { faker } from '@faker-js/faker';

export enum LocationType {
  HOME = "HOME",
  WORKPLACE = "WORKPLACE",
  ROMANTIC_INTEREST = "ROMANTIC_INTEREST",
  FAMILY = "FAMILY",
  FREQUENT_VISIT = "FREQUENT_VISIT",
  PLACE_OF_WORSHIP = "PLACE_OF_WORSHIP",
  MEDICAL_FACILITY = "MEDICAL_FACILITY",
}

export interface InferredLocationData {
  location_type: LocationType;
  location_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  typical_days: string;
  typical_arrival_time: string | null; // HH:MM format or null
  typical_departure_time: string | null; // HH:MM format or null
  visit_frequency: string;
  inferred_relationship: string;
  privacy_implications: string;
  is_sensitive: boolean;
  confidence_score: number;
}

export interface LocationRecordData {
  npc_id: string;
  tracking_enabled: boolean;
  data_retention_days: number;
  inferred_locations: InferredLocationData[];
}

// Location names by type
const WORKPLACES = [
  "TechCorp Solutions",
  "Riverside Medical Center",
  "DataFlow Analytics",
  "Green Valley School",
  "Metro Transit Authority",
  "Summit Financial Services",
  "Horizon Manufacturing",
  "CityView Retail",
  "Valley Hospital",
  "University of Riverside",
];

const GYMS = [
  "24/7 Fitness Center",
  "Valley Yoga Studio",
  "PowerHouse Gym",
  "CrossFit Riverside",
];

const PLACES_OF_WORSHIP = [
  "St. Mary's Church",
  "Riverside Community Church",
  "Beth Synagogue",
  "Islamic Center of Metro City",
];

const ENTERTAINMENT = [
  "Riverside Cinema",
  "Downtown Sports Bar",
  "The Jazz Club",
  "Valley Bowling Alley",
  "Metro Theater",
];

const MEDICAL_FACILITIES = [
  "Riverside Medical Center",
  "Summit Health Clinic",
  "Valley Psychiatry Associates",
  "Metro Physical Therapy",
];

/**
 * Format time as HH:MM string
 */
function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Generate a location tracking record with inferred locations.
 */
export function generateLocationRecord(npcId: string, seed?: number): LocationRecordData {
  if (seed !== undefined) {
    faker.seed(seed);
  }

  // 10% of people disable location tracking
  const trackingEnabled = Math.random() > 0.10;

  const record: LocationRecordData = {
    npc_id: npcId,
    tracking_enabled: trackingEnabled,
    data_retention_days: faker.helpers.arrayElement([30, 60, 90, 180]),
    inferred_locations: [],
  };

  if (!trackingEnabled) {
    // No location data for people who disabled it
    return record;
  }

  const inferredLocations: InferredLocationData[] = [];

  // Workplace (80% of people have identifiable workplace)
  if (Math.random() < 0.80) {
    const workplaceName = faker.helpers.arrayElement(WORKPLACES);
    inferredLocations.push({
      location_type: LocationType.WORKPLACE,
      location_name: workplaceName,
      street_address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip_code: faker.location.zipCode(),
      typical_days: "Weekdays",
      typical_arrival_time: formatTime(
        faker.number.int({ min: 7, max: 9 }),
        faker.helpers.arrayElement([0, 15, 30, 45])
      ),
      typical_departure_time: formatTime(
        faker.number.int({ min: 16, max: 18 }),
        faker.helpers.arrayElement([0, 15, 30, 45])
      ),
      visit_frequency: "Daily",
      inferred_relationship: "Primary workplace - consistently present during business hours",
      privacy_implications: "Employer can be identified, work schedule exposed, physical location during work hours known",
      is_sensitive: false,
      confidence_score: faker.number.int({ min: 90, max: 98 }),
    });
  }

  // Home confirmation (always present, confirms tracking accuracy)
  inferredLocations.push({
    location_type: LocationType.HOME,
    location_name: "Primary Residence",
    street_address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zip_code: faker.location.zipCode(),
    typical_days: "Daily",
    typical_arrival_time: null, // Variable
    typical_departure_time: null, // Variable
    visit_frequency: "Daily (overnight stays)",
    inferred_relationship: "Primary residence confirmed by overnight location data",
    privacy_implications: "Home address confirmed, sleep schedule patterns exposed, when home is empty can be determined",
    is_sensitive: true,
    confidence_score: 99,
  });

  // Romantic interest location (30% of people)
  if (Math.random() < 0.30) {
    const partnerName = faker.person.firstName();
    inferredLocations.push({
      location_type: LocationType.ROMANTIC_INTEREST,
      location_name: `${partnerName}'s Apartment`,
      street_address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip_code: faker.location.zipCode(),
      typical_days: faker.helpers.arrayElement([
        "Friday, Saturday",
        "Weekends",
        "Thursday, Friday, Saturday"
      ]),
      typical_arrival_time: formatTime(
        faker.number.int({ min: 18, max: 21 }),
        faker.helpers.arrayElement([0, 30])
      ),
      typical_departure_time: formatTime(
        faker.number.int({ min: 7, max: 10 }),
        faker.helpers.arrayElement([0, 30])
      ),
      visit_frequency: faker.helpers.arrayElement([
        "2-3 times per week",
        "Weekly",
        "Multiple times per week"
      ]),
      inferred_relationship: "Likely romantic partner - regular overnight stays, consistent pattern on weekends",
      privacy_implications: "Romantic relationships can be exposed, partner's location revealed, intimate schedule patterns known, potential for stalking or harassment of partner",
      is_sensitive: true,
      confidence_score: faker.number.int({ min: 75, max: 90 }),
    });
  }

  // Family location (50% of people visit family regularly)
  if (Math.random() < 0.50) {
    const relationship = faker.helpers.arrayElement([
      "Elderly parent",
      "Parents",
      "Sibling",
      "Adult child"
    ]);
    inferredLocations.push({
      location_type: LocationType.FAMILY,
      location_name: `${relationship}'s Home`,
      street_address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip_code: faker.location.zipCode(),
      typical_days: faker.helpers.arrayElement(["Sunday", "Weekends", "Saturday"]),
      typical_arrival_time: formatTime(
        faker.number.int({ min: 11, max: 14 }),
        faker.helpers.arrayElement([0, 30])
      ),
      typical_departure_time: formatTime(
        faker.number.int({ min: 16, max: 19 }),
        faker.helpers.arrayElement([0, 30])
      ),
      visit_frequency: faker.helpers.arrayElement(["Weekly", "Bi-weekly", "Monthly"]),
      inferred_relationship: `${relationship} - regular visits suggest close family relationship`,
      privacy_implications: "Family members can be identified and located, caregiving responsibilities exposed, potential targets for manipulation or coercion",
      is_sensitive: true,
      confidence_score: faker.number.int({ min: 70, max: 85 }),
    });
  }

  // Frequent visits (gym, store, etc.) - 60% of people
  if (Math.random() < 0.60) {
    const locationType = faker.helpers.arrayElement([
      LocationType.FREQUENT_VISIT,
      LocationType.PLACE_OF_WORSHIP
    ]);

    let locationName: string;
    let days: string;
    let frequency: string;
    let relationship: string;
    let implications: string;

    if (locationType === LocationType.FREQUENT_VISIT) {
      locationName = faker.helpers.arrayElement([...GYMS, ...ENTERTAINMENT]);
      days = faker.helpers.arrayElement([
        "Monday, Wednesday, Friday",
        "Weekdays",
        "Tuesday, Thursday"
      ]);
      frequency = faker.helpers.arrayElement([
        "3-4 times per week",
        "Weekly",
        "Bi-weekly"
      ]);
      relationship = "Regular recreation/fitness location";
      implications = "Daily routine patterns exposed, habits and interests revealed";
    } else { // PLACE_OF_WORSHIP
      locationName = faker.helpers.arrayElement(PLACES_OF_WORSHIP);
      days = faker.helpers.arrayElement(["Sunday", "Friday", "Saturday"]);
      frequency = "Weekly";
      relationship = "Regular attendance suggests religious affiliation";
      implications = "Religious beliefs exposed, could lead to discrimination or targeting, worship schedule known";
    }

    inferredLocations.push({
      location_type: locationType,
      location_name: locationName,
      street_address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip_code: faker.location.zipCode(),
      typical_days: days,
      typical_arrival_time: formatTime(
        faker.number.int({ min: 8, max: 18 }),
        faker.helpers.arrayElement([0, 30])
      ),
      typical_departure_time: formatTime(
        faker.number.int({ min: 9, max: 20 }),
        faker.helpers.arrayElement([0, 30])
      ),
      visit_frequency: frequency,
      inferred_relationship: relationship,
      privacy_implications: implications,
      is_sensitive: locationType === LocationType.PLACE_OF_WORSHIP,
      confidence_score: faker.number.int({ min: 65, max: 80 }),
    });
  }

  // Medical facility (20% of people with regular appointments)
  if (Math.random() < 0.20) {
    const facility = faker.helpers.arrayElement(MEDICAL_FACILITIES);
    inferredLocations.push({
      location_type: LocationType.MEDICAL_FACILITY,
      location_name: facility,
      street_address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip_code: faker.location.zipCode(),
      typical_days: faker.helpers.arrayElement(["Tuesday", "Thursday", "Varies", "Monthly"]),
      typical_arrival_time: formatTime(
        faker.number.int({ min: 9, max: 15 }),
        faker.helpers.arrayElement([0, 30])
      ),
      typical_departure_time: null, // Varies
      visit_frequency: faker.helpers.arrayElement([
        "Weekly",
        "Bi-weekly",
        "Monthly",
        "Multiple times per month"
      ]),
      inferred_relationship: "Regular medical appointments suggest ongoing treatment or chronic condition management",
      privacy_implications: "Health conditions can be inferred, medical appointments exposed, vulnerable moments identified, treatment schedule known to potential stalkers",
      is_sensitive: true,
      confidence_score: faker.number.int({ min: 75, max: 88 }),
    });
  }

  record.inferred_locations = inferredLocations;
  return record;
}
