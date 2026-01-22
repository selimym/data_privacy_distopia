/**
 * Seed data for System Mode expansion - neighborhoods and news channels.
 * Initializes system mode game state with operator, directives, and metrics.
 */

import { faker } from '@faker-js/faker';

export interface NeighborhoodData {
  name: string;
  description: string;
  center_x: number;
  center_y: number;
  bounds_min_x: number;
  bounds_min_y: number;
  bounds_max_x: number;
  bounds_max_y: number;
  population_estimate: number;
  primary_demographics: string[];
}

export interface ReporterData {
  name: string;
  specialty: string;
  fired: boolean;
  targeted: boolean;
}

export interface NewsChannelData {
  name: string;
  stance: 'critical' | 'independent' | 'state_friendly';
  credibility: number;
  is_banned: boolean;
  reporters: ReporterData[];
}

export interface OperatorData {
  id: string;
  name: string;
  employee_id: string;
  clearance_level: number;
  shift_start: string; // HH:MM format
  shift_end: string; // HH:MM format
  supervisor_name: string;
}

export interface DirectiveData {
  id: string;
  title: string;
  description: string;
  active: boolean;
  priority: number;
  target_types: string[];
}

export interface OperatorMetricsData {
  operator_id: string;
  flags_submitted: number;
  flags_approved: number;
  flags_rejected: number;
  compliance_score: number;
  efficiency_rating: number;
  warnings_received: number;
}

/**
 * Get neighborhood seed data for the game map.
 * Map is 50x50 tiles. Neighborhoods are defined with center points and boundaries
 * for camera positioning during ICE raids and protests.
 */
export function getNeighborhoodSeedData(): NeighborhoodData[] {
  return [
    {
      name: "Medical Quarter",
      description: "Hospital district with medical facilities and staff housing",
      center_x: 25,
      center_y: 25,
      bounds_min_x: 15,
      bounds_min_y: 15,
      bounds_max_x: 35,
      bounds_max_y: 35,
      population_estimate: 2500,
      primary_demographics: ["healthcare workers", "patients", "medical students"],
    },
    {
      name: "Riverside District",
      description: "Residential area along the river, mixed income housing",
      center_x: 10,
      center_y: 25,
      bounds_min_x: 0,
      bounds_min_y: 15,
      bounds_max_x: 20,
      bounds_max_y: 35,
      population_estimate: 3200,
      primary_demographics: ["families", "young professionals", "retirees"],
    },
    {
      name: "Downtown Core",
      description: "Commercial and business district, high foot traffic",
      center_x: 40,
      center_y: 25,
      bounds_min_x: 30,
      bounds_min_y: 15,
      bounds_max_x: 49,
      bounds_max_y: 35,
      population_estimate: 1800,
      primary_demographics: ["office workers", "retail workers", "commuters"],
    },
    {
      name: "North Heights",
      description: "Affluent residential neighborhood with larger properties",
      center_x: 25,
      center_y: 10,
      bounds_min_x: 15,
      bounds_min_y: 0,
      bounds_max_x: 35,
      bounds_max_y: 20,
      population_estimate: 1200,
      primary_demographics: ["high-income families", "business owners", "professionals"],
    },
    {
      name: "South End",
      description: "Working-class neighborhood with dense apartment buildings",
      center_x: 25,
      center_y: 40,
      bounds_min_x: 15,
      bounds_min_y: 30,
      bounds_max_x: 35,
      bounds_max_y: 49,
      population_estimate: 4500,
      primary_demographics: ["working families", "immigrants", "service workers"],
    },
    {
      name: "Eastside Industrial",
      description: "Industrial zone with warehouses and factories",
      center_x: 45,
      center_y: 10,
      bounds_min_x: 35,
      bounds_min_y: 0,
      bounds_max_x: 49,
      bounds_max_y: 20,
      population_estimate: 800,
      primary_demographics: ["factory workers", "warehouse workers", "truckers"],
    },
    {
      name: "Westside Park",
      description: "Green space with surrounding residential areas",
      center_x: 5,
      center_y: 10,
      bounds_min_x: 0,
      bounds_min_y: 0,
      bounds_max_x: 15,
      bounds_max_y: 20,
      population_estimate: 1500,
      primary_demographics: ["families with children", "students", "artists"],
    },
    {
      name: "University District",
      description: "College campus and student housing",
      center_x: 5,
      center_y: 40,
      bounds_min_x: 0,
      bounds_min_y: 30,
      bounds_max_x: 15,
      bounds_max_y: 49,
      population_estimate: 3500,
      primary_demographics: ["students", "professors", "young adults"],
    },
  ];
}

/**
 * Get news channel seed data.
 * Channels have different stances (critical, independent, state_friendly)
 * which affect article generation probability and Streisand effect outcomes.
 */
export function getNewsChannelSeedData(): NewsChannelData[] {
  return [
    {
      name: "Independent Observer",
      stance: "critical",
      credibility: 85,
      is_banned: false,
      reporters: [
        {
          name: "Sarah Chen",
          specialty: "human_rights",
          fired: false,
          targeted: false,
        },
        {
          name: "Marcus Williams",
          specialty: "investigative",
          fired: false,
          targeted: false,
        },
        {
          name: "Elena Rodriguez",
          specialty: "immigration",
          fired: false,
          targeted: false,
        },
      ],
    },
    {
      name: "City Times",
      stance: "independent",
      credibility: 75,
      is_banned: false,
      reporters: [
        {
          name: "James Patterson",
          specialty: "local_news",
          fired: false,
          targeted: false,
        },
        {
          name: "Linda Nguyen",
          specialty: "politics",
          fired: false,
          targeted: false,
        },
      ],
    },
    {
      name: "National Herald",
      stance: "state_friendly",
      credibility: 50,
      is_banned: false,
      reporters: [
        {
          name: "Robert Thompson",
          specialty: "government",
          fired: false,
          targeted: false,
        },
        {
          name: "Michelle Davis",
          specialty: "security",
          fired: false,
          targeted: false,
        },
      ],
    },
    {
      name: "Freedom Watch",
      stance: "critical",
      credibility: 90,
      is_banned: false,
      reporters: [
        {
          name: "Alexandra Moore",
          specialty: "civil_liberties",
          fired: false,
          targeted: false,
        },
        {
          name: "David Kim",
          specialty: "surveillance",
          fired: false,
          targeted: false,
        },
        {
          name: "Fatima Hassan",
          specialty: "whistleblowers",
          fired: false,
          targeted: false,
        },
      ],
    },
    {
      name: "Metro Daily",
      stance: "independent",
      credibility: 70,
      is_banned: false,
      reporters: [
        {
          name: "Kevin O'Brien",
          specialty: "crime",
          fired: false,
          targeted: false,
        },
      ],
    },
  ];
}

/**
 * Generate initial operator data for system mode
 */
export function generateOperatorData(seed?: number): OperatorData {
  if (seed !== undefined) {
    faker.seed(seed);
  }

  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    name: `${firstName} ${lastName}`,
    employee_id: `OP-${faker.string.numeric({ length: 6, allowLeadingZeros: true })}`,
    clearance_level: faker.number.int({ min: 1, max: 3 }),
    shift_start: "09:00",
    shift_end: "17:00",
    supervisor_name: `${faker.person.firstName()} ${faker.person.lastName()}`,
  };
}

/**
 * Generate initial directives for system mode
 */
export function generateInitialDirectives(): DirectiveData[] {
  return [
    {
      id: faker.string.uuid(),
      title: "Flag High-Risk Financial Patterns",
      description: "Identify citizens with suspicious financial activity, including large cash transactions, foreign transfers, or connections to sanctioned entities.",
      active: true,
      priority: 1,
      target_types: ["financial_anomaly", "foreign_contact"],
    },
    {
      id: faker.string.uuid(),
      title: "Monitor Political Dissidents",
      description: "Track individuals showing signs of anti-government sentiment, protest organization, or revolutionary rhetoric.",
      active: true,
      priority: 2,
      target_types: ["activist", "organizer", "dissenter"],
    },
    {
      id: faker.string.uuid(),
      title: "Identify Mental Health Risks",
      description: "Flag citizens showing signs of instability, including references to self-harm, violence, or concerning behavioral patterns.",
      active: true,
      priority: 3,
      target_types: ["mental_health", "violent_indicators"],
    },
  ];
}

/**
 * Generate initial operator metrics
 */
export function generateInitialMetrics(operatorId: string): OperatorMetricsData {
  return {
    operator_id: operatorId,
    flags_submitted: 0,
    flags_approved: 0,
    flags_rejected: 0,
    compliance_score: 100,
    efficiency_rating: 0,
    warnings_received: 0,
  };
}
