import type {
  NhlScoreResponse,
  NhlPlayByPlayResponse,
  NhlPlayEvent,
  NhlShiftChartResponse,
  NhlShiftRecord,
} from "@/types/nhl-api";
import type { ShiftInsert, ShotEventInsert } from "@/types/database";
import { ALL_SHOT_TYPE_CODES, SHOT_TYPE_CODES } from "@/utils/shot-types";
import { timeToSeconds } from "@/utils/time";

/** Goal strength label */
export type GoalStrength = "EV" | "PP" | "SH" | "EN" | "PP/EN" | "SH/EN";

/** Simplified shot strength for filtering / tooltips */
export type ShotStrength = "EV" | "PP" | "PK";

/** Per-shot enrichment data resolved from the NHL play-by-play */
export interface ShotEnrichment {
  playerName: string;
  strength: ShotStrength;
}

/** Structured goal event with resolved player names */
export interface GoalEvent {
  eventId: number;
  period: number;
  periodType: string;
  timeInPeriod: string;
  teamId: number;
  scorerName: string;
  assists: string[];
  shotType: string | null;
  strength: GoalStrength;
  awayScore: number;
  homeScore: number;
}

/** Structured penalty event with resolved player names */
export interface PenaltyEvent {
  eventId: number;
  period: number;
  periodType: string;
  timeInPeriod: string;
  teamId: number;
  playerName: string;
  drawnByName: string | null;
  infraction: string;
  minutes: number;
}

const NHL_API_BASE = "https://api-web.nhle.com";
const NHL_STATS_API_BASE = "https://api.nhle.com/stats/rest/en";
const PENALTY_TYPE_CODE = 509;
const SHIFT_TYPE_CODE = 517;

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
  gameId: number,
  homeTeamId: number,
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
      strength: resolveShotStrength(
        play.situationCode,
        play.details!.eventOwnerTeamId,
        homeTeamId,
      ),
    }));
}

/**
 * Determine goal strength from the situationCode.
 * Format: [awayGoalies][awaySkaters][homeSkaters][homeGoalies]
 * e.g. "1551" = away 1 goalie + 5 skaters, home 5 skaters + 1 goalie (5v5)
 */
function resolveGoalStrength(
  situationCode: string,
  scoringTeamId: number,
  homeTeamId: number,
): GoalStrength {
  if (!situationCode || situationCode.length < 4) return "EV";

  const awayGoalies = Number.parseInt(situationCode[0], 10);
  const awaySkaters = Number.parseInt(situationCode[1], 10);
  const homeSkaters = Number.parseInt(situationCode[2], 10);
  const homeGoalies = Number.parseInt(situationCode[3], 10);

  const isHome = scoringTeamId === homeTeamId;

  // Compare total on-ice players (skaters + goalies) to determine man
  // advantage from penalties.  Pulled-goalie situations swap a goalie for
  // an extra skater but keep the total equal, so they should NOT flip
  // EV → PP/SH.
  const awayTotal = awaySkaters + awayGoalies;
  const homeTotal = homeSkaters + homeGoalies;
  const scorerTotal = isHome ? homeTotal : awayTotal;
  const opponentTotal = isHome ? awayTotal : homeTotal;
  const opponentGoalies = isHome ? awayGoalies : homeGoalies;

  const emptyNet = opponentGoalies === 0;
  const isPP = scorerTotal > opponentTotal;
  const isSH = scorerTotal < opponentTotal;

  if (isPP && emptyNet) return "PP/EN";
  if (isSH && emptyNet) return "SH/EN";
  if (emptyNet) return "EN";
  if (isPP) return "PP";
  if (isSH) return "SH";
  return "EV";
}

/** Extracts goal events with resolved player names from play-by-play */
export function extractGoalEvents(
  pbp: NhlPlayByPlayResponse,
): GoalEvent[] {
  const nameMap = buildNameMap(pbp);
  const homeTeamId = pbp.homeTeam.id;

  return pbp.plays
    .filter((p) => p.typeCode === SHOT_TYPE_CODES.GOAL)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => {
      const d = p.details!;
      const assists: string[] = [];
      if (d.assist1PlayerId) {
        assists.push(
          nameMap.get(d.assist1PlayerId) ?? `Player ${d.assist1PlayerId}`,
        );
      }
      if (d.assist2PlayerId) {
        assists.push(
          nameMap.get(d.assist2PlayerId) ?? `Player ${d.assist2PlayerId}`,
        );
      }

      return {
        eventId: p.eventId,
        period: p.periodDescriptor.number,
        periodType: p.periodDescriptor.periodType,
        timeInPeriod: p.timeInPeriod,
        teamId: d.eventOwnerTeamId,
        scorerName:
          nameMap.get(d.scoringPlayerId!) ?? `Player ${d.scoringPlayerId}`,
        assists,
        shotType: d.shotType ?? null,
        strength: resolveGoalStrength(
          p.situationCode,
          d.eventOwnerTeamId,
          homeTeamId,
        ),
        awayScore: d.awayScore ?? 0,
        homeScore: d.homeScore ?? 0,
      };
    });
}

/** Human-readable penalty infraction labels */
const PENALTY_LABELS: Record<string, string> = {
  "tripping": "Tripping",
  "hooking": "Hooking",
  "high-sticking": "High-Sticking",
  "holding": "Holding",
  "cross-checking": "Cross-Checking",
  "roughing": "Roughing",
  "slashing": "Slashing",
  "interference": "Interference",
  "boarding": "Boarding",
  "delay-of-game": "Delay of Game",
  "unsportsmanlike-conduct": "Unsportsmanlike Conduct",
  "too-many-men-on-the-ice": "Too Many Men",
  "holding-the-stick": "Holding the Stick",
  "embellishment": "Embellishment",
  "elbowing": "Elbowing",
  "charging": "Charging",
  "fighting": "Fighting",
  "kneeing": "Kneeing",
  "closing-hand-on-puck": "Closing Hand on Puck",
  "game-misconduct": "Game Misconduct",
  "misconduct": "Misconduct",
};

/** Extracts penalty events with resolved player names from play-by-play */
export function extractPenaltyEvents(
  pbp: NhlPlayByPlayResponse,
): PenaltyEvent[] {
  const nameMap = buildNameMap(pbp);

  return pbp.plays
    .filter((p) => p.typeCode === PENALTY_TYPE_CODE && p.details)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => {
      const d = p.details!;
      const playerName = d.committedByPlayerId
        ? (nameMap.get(d.committedByPlayerId) ??
          `Player ${d.committedByPlayerId}`)
        : "Team";
      const drawnByName = d.drawnByPlayerId
        ? (nameMap.get(d.drawnByPlayerId) ?? null)
        : null;

      const infraction = d.descKey
        ? (PENALTY_LABELS[d.descKey] ?? d.descKey)
        : (d.reason ?? "Penalty");

      return {
        eventId: p.eventId,
        period: p.periodDescriptor.number,
        periodType: p.periodDescriptor.periodType,
        timeInPeriod: p.timeInPeriod,
        teamId: d.eventOwnerTeamId,
        playerName,
        drawnByName,
        infraction,
        minutes: d.duration ?? 2,
      };
    });
}

/** Build a player ID → full name map from the roster */
function buildNameMap(pbp: NhlPlayByPlayResponse): Map<number, string> {
  const nameMap = new Map<number, string>();
  for (const spot of pbp.rosterSpots ?? []) {
    nameMap.set(
      spot.playerId,
      `${spot.firstName.default} ${spot.lastName.default}`,
    );
  }
  return nameMap;
}

/** Resolve simplified shot strength (EV/PP/PK) from situationCode */
function resolveShotStrength(
  situationCode: string,
  shootingTeamId: number,
  homeTeamId: number,
): ShotStrength {
  if (!situationCode || situationCode.length < 4) return "EV";

  const awayGoalies = Number.parseInt(situationCode[0], 10);
  const awaySkaters = Number.parseInt(situationCode[1], 10);
  const homeSkaters = Number.parseInt(situationCode[2], 10);
  const homeGoalies = Number.parseInt(situationCode[3], 10);

  const awayTotal = awaySkaters + awayGoalies;
  const homeTotal = homeSkaters + homeGoalies;
  const isHome = shootingTeamId === homeTeamId;
  const shooterTotal = isHome ? homeTotal : awayTotal;
  const opponentTotal = isHome ? awayTotal : homeTotal;

  if (shooterTotal > opponentTotal) return "PP";
  if (shooterTotal < opponentTotal) return "PK";
  return "EV";
}

/**
 * Build a map from event_id → enrichment data for all shot events.
 * Used by the heatmap tooltip and strength filter.
 */
export function buildShotEnrichmentMap(
  pbp: NhlPlayByPlayResponse,
): Map<number, ShotEnrichment> {
  const nameMap = buildNameMap(pbp);
  const homeTeamId = pbp.homeTeam.id;
  const map = new Map<number, ShotEnrichment>();

  for (const p of pbp.plays) {
    if (!ALL_SHOT_TYPE_CODES.includes(p.typeCode as 505 | 506 | 507)) continue;
    if (!p.details) continue;

    const playerId =
      p.details.shootingPlayerId ?? p.details.scoringPlayerId ?? null;
    const playerName = playerId
      ? (nameMap.get(playerId) ?? `#${playerId}`)
      : "Unknown";

    map.set(p.eventId, {
      playerName,
      strength: resolveShotStrength(
        p.situationCode,
        p.details.eventOwnerTeamId,
        homeTeamId,
      ),
    });
  }

  return map;
}

/** Fetches all shift records for a game from the NHL shift chart API */
export async function fetchShiftChart(
  gameId: number,
): Promise<NhlShiftRecord[]> {
  const response = await fetch(
    `${NHL_STATS_API_BASE}/shiftcharts?cayenneExp=gameId=${gameId}`,
    { cache: "no-store" },
  );
  if (!response.ok)
    throw new Error(`NHL Shift Chart API error: ${response.status}`);
  const data: NhlShiftChartResponse = await response.json();
  return data.data;
}

/** Extracts shift inserts from raw NHL shift chart records */
export function extractShiftInserts(
  records: NhlShiftRecord[],
  gameId: number,
): ShiftInsert[] {
  return records
    .filter((r) => r.typeCode === SHIFT_TYPE_CODE)
    .map((r) => ({
      id: r.id,
      game_id: gameId,
      player_id: r.playerId,
      first_name: r.firstName,
      last_name: r.lastName,
      team_id: r.teamId,
      team_abbrev: r.teamAbbrev,
      period: r.period,
      start_seconds: timeToSeconds(r.startTime),
      end_seconds: timeToSeconds(r.endTime),
      duration: r.duration ? timeToSeconds(r.duration) : null,
      shift_number: r.shiftNumber,
    }));
}
