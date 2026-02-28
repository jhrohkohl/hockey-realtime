import type {
  NhlScoreResponse,
  NhlPlayByPlayResponse,
  NhlPlayEvent,
} from "@/types/nhl-api";
import type { ShotEventInsert } from "@/types/database";
import { ALL_SHOT_TYPE_CODES } from "@/utils/shot-types";

const NHL_API_BASE = "https://api-web.nhle.com";

/** Fetches today's scoreboard from the NHL API */
export async function fetchTodaysGames(): Promise<NhlScoreResponse> {
  const response = await fetch(`${NHL_API_BASE}/v1/score/now`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`NHL API error: ${response.status}`);
  return response.json();
}

/** Fetches scoreboard for a specific date */
export async function fetchScoreByDate(
  date: string
): Promise<NhlScoreResponse> {
  const response = await fetch(`${NHL_API_BASE}/v1/score/${date}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`NHL API error: ${response.status}`);
  return response.json();
}

/** Fetches full play-by-play for a specific game */
export async function fetchPlayByPlay(
  gameId: number
): Promise<NhlPlayByPlayResponse> {
  const response = await fetch(
    `${NHL_API_BASE}/v1/gamecenter/${gameId}/play-by-play`,
    { cache: "no-store" }
  );
  if (!response.ok) throw new Error(`NHL API error: ${response.status}`);
  return response.json();
}

/** Extracts shot-related events from play-by-play data */
export function extractShotEvents(
  plays: NhlPlayEvent[],
  gameId: number
): ShotEventInsert[] {
  return plays
    .filter(
      (play) =>
        ALL_SHOT_TYPE_CODES.includes(play.typeCode as 505 | 506 | 507) &&
        play.details?.xCoord != null &&
        play.details?.yCoord != null
    )
    .map((play) => ({
      game_id: gameId,
      event_id: play.eventId,
      type_code: play.typeCode,
      type_desc_key: play.typeDescKey,
      x_coord: play.details!.xCoord!,
      y_coord: play.details!.yCoord!,
      zone_code: play.details?.zoneCode ?? null,
      shot_type: play.details?.shotType ?? null,
      period_number: play.periodDescriptor.number,
      period_type: play.periodDescriptor.periodType,
      time_in_period: play.timeInPeriod,
      team_id: play.details!.eventOwnerTeamId,
      shooter_player_id:
        play.details?.shootingPlayerId ??
        play.details?.scoringPlayerId ??
        null,
      goalie_player_id: play.details?.goalieInNetId ?? null,
      home_team_defending_side: play.homeTeamDefendingSide ?? null,
    }));
}
