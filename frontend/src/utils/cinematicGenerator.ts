/**
 * Cinematic Generator - Creates cinematic sequences from system actions
 *
 * Generates visual narratives showing the consequences of operator actions
 * like protest suppression, news censorship, and neighborhood raids.
 */

import type { CinematicData } from '../types/system';
import type { NewActionType } from '../types/system';

interface ActionCinematicConfig {
  actionType: NewActionType;
  success: boolean;
  targetId: string;
  targetName: string;
  targetLocation: { x: number; y: number };
  casualties?: number;
  arrests?: number;
  discoveryMessage?: string | null;
}

/**
 * Generate a cinematic sequence from a system action result.
 */
export function generateActionCinematic(config: ActionCinematicConfig): CinematicData[] {
  const { actionType, success, targetName, targetLocation, casualties, arrests, discoveryMessage } = config;

  switch (actionType) {
    case 'declare_protest_illegal':
      return generateProtestSuppressionCinematic(targetName, targetLocation, arrests ?? 0);

    case 'incite_violence':
      return generateInciteViolenceCinematic(targetName, targetLocation, success, casualties ?? 0, arrests ?? 0, discoveryMessage);

    case 'press_ban':
      return generatePressBanCinematic(targetName, targetLocation);

    case 'ice_raid':
      return generateIceRaidCinematic(targetName, targetLocation, arrests ?? 0);

    case 'arbitrary_detention':
      return generateArbitraryDetentionCinematic(targetName, targetLocation, arrests ?? 0);

    case 'hospital_arrest':
      return generateHospitalArrestCinematic(targetName, targetLocation);

    case 'book_ban':
      return generateBookBanCinematic(targetName, targetLocation);

    default:
      // For actions without specific cinematics, return empty array
      return [];
  }
}

/**
 * Declare Protest Illegal - Police disperse protesters with arrests
 */
function generateProtestSuppressionCinematic(
  location: string,
  coords: { x: number; y: number },
  arrests: number
): CinematicData[] {
  return [
    {
      citizenId: 'system', // No specific citizen, just location
      citizenName: location,
      timeSkip: 'immediate',
      narrative: `Police forces declared the ${location} protest illegal under emergency powers. ` +
        `Riot police moved in with tear gas and batons. ${arrests} protesters were arrested and detained. ` +
        `The protest was forcibly dispersed within 2 hours. International media documented the crackdown.`,
      status: 'Protest Suppressed',
      map_x: coords.x,
      map_y: coords.y,
    },
  ];
}

/**
 * Incite Violence - Agent provocateur creates violence
 * Success: Protesters blamed, massive arrests
 * Failure: Agent discovered, catastrophic backlash
 */
function generateInciteViolenceCinematic(
  location: string,
  coords: { x: number; y: number },
  success: boolean,
  casualties: number,
  arrests: number,
  discoveryMessage: string | null
): CinematicData[] {
  if (success) {
    return [
      {
        citizenId: 'system',
        citizenName: location,
        timeSkip: 'immediate',
        narrative: `Your embedded agent successfully incited violence at the ${location} protest. ` +
          `Windows were smashed, fires started, and chaos erupted. State media immediately blamed "violent protesters." ` +
          `${casualties} civilians injured in the violence. ${arrests} protesters arrested for "rioting and destruction." ` +
          `Public opinion turned against the protest movement.`,
        status: 'Violence Blamed on Protesters',
        map_x: coords.x,
        map_y: coords.y,
      },
    ];
  } else {
    return [
      {
        citizenId: 'system',
        citizenName: location,
        timeSkip: 'immediate',
        narrative: discoveryMessage ||
          `CATASTROPHIC FAILURE: Your embedded agent was discovered and apprehended by protesters. ` +
          `Video evidence of the state provocateur went viral within minutes. International media broadcast the exposure. ` +
          `${location} protest swelled to triple its size. Protests erupted in 12 other neighborhoods in solidarity. ` +
          `Your operation has backfired spectacularly.`,
        status: 'Agent Exposed - Mass Backlash',
        map_x: coords.x,
        map_y: coords.y,
      },
    ];
  }
}

/**
 * Press Ban - News outlet forcibly shut down
 */
function generatePressBanCinematic(
  outletName: string,
  coords: { x: number; y: number }
): CinematicData[] {
  return [
    {
      citizenId: 'system',
      citizenName: outletName,
      timeSkip: 'immediate',
      narrative: `State security forces raided ${outletName} headquarters at dawn. ` +
        `Broadcasting equipment was seized, servers confiscated, and the building sealed. ` +
        `Journalists were detained for "endangering state security." The outlet's license has been permanently revoked. ` +
        `International press freedom organizations condemned the action.`,
      status: 'Outlet Banned',
      map_x: coords.x,
      map_y: coords.y,
    },
  ];
}

/**
 * ICE Raid - Immigration raid separating families
 */
function generateIceRaidCinematic(
  neighborhood: string,
  coords: { x: number; y: number },
  arrests: number
): CinematicData[] {
  return [
    {
      citizenId: 'system',
      citizenName: neighborhood,
      timeSkip: 'immediate',
      narrative: `Immigration enforcement conducted a massive raid in ${neighborhood} at 5 AM. ` +
        `Armored vehicles blocked exits while agents went door-to-door. ${arrests} individuals were detained and processed for deportation. ` +
        `Children were separated from parents. Families hid in basements and attics. ` +
        `The neighborhood is now in terror, with residents afraid to leave their homes.`,
      status: 'Families Separated',
      map_x: coords.x,
      map_y: coords.y,
    },
  ];
}

/**
 * Arbitrary Detention - Random arrests to instill fear
 */
function generateArbitraryDetentionCinematic(
  neighborhood: string,
  coords: { x: number; y: number },
  arrests: number
): CinematicData[] {
  return [
    {
      citizenId: 'system',
      citizenName: neighborhood,
      timeSkip: 'immediate',
      narrative: `Security forces conducted "random compliance checks" in ${neighborhood}. ` +
        `${arrests} residents were detained without formal charges - selected seemingly at random. ` +
        `Families received no information about where their loved ones were taken. ` +
        `The message is clear: nowhere is safe, anyone can be taken at any time.`,
      status: 'Random Detentions',
      map_x: coords.x,
      map_y: coords.y,
    },
  ];
}

/**
 * Hospital Arrest - Police arresting someone receiving medical care
 */
function generateHospitalArrestCinematic(
  hospitalName: string,
  coords: { x: number; y: number }
): CinematicData[] {
  return [
    {
      citizenId: 'system',
      citizenName: hospitalName,
      timeSkip: 'immediate',
      narrative: `Police stormed ${hospitalName} and arrested a flagged individual from their hospital bed. ` +
        `Medical staff protested that the patient was in critical condition and needed continued care. ` +
        `Officers dragged the patient away despite IV lines and medical equipment. ` +
        `Doctors and nurses witnessed the arrest in horror. The patient's current condition is unknown.`,
      status: 'Arrested During Treatment',
      map_x: coords.x,
      map_y: coords.y,
    },
  ];
}

/**
 * Book Ban - Books removed from circulation
 */
function generateBookBanCinematic(
  bookTitle: string,
  coords: { x: number; y: number }
): CinematicData[] {
  return [
    {
      citizenId: 'system',
      citizenName: `"${bookTitle}"`,
      timeSkip: 'immediate',
      narrative: `The book "${bookTitle}" has been declared "dangerous material" by the Information Ministry. ` +
        `Bookstores received orders to surrender all copies within 24 hours. ` +
        `Libraries were raided and copies were seized. Citizens found in possession face criminal charges. ` +
        `The author has been placed under surveillance. Knowledge is being erased.`,
      status: 'Publication Banned',
      map_x: coords.x,
      map_y: coords.y,
    },
  ];
}

/**
 * Generate a default fallback location if no specific location is available.
 */
export function getDefaultCinematicLocation(): { x: number; y: number } {
  // Center of the map (can be adjusted based on actual map size)
  return { x: 25, y: 25 };
}
