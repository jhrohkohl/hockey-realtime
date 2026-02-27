/** Top-level response from /v1/score/now */
export interface NhlScoreResponse {
  prevDate: string;
  currentDate: string;
  nextDate: string;
  games: NhlGame[];
  gameWeek: NhlGameWeekDay[];
}

export interface NhlGameWeekDay {
  date: string;
  dayAbbrev: string;
  numberOfGames: number;
}

export interface NhlGame {
  id: number;
  season: number;
  gameType: number;
  gameDate: string;
  startTimeUTC: string;
  gameState: string;
  gameScheduleState: string;
  venue: { default: string };
  homeTeam: NhlTeam;
  awayTeam: NhlTeam;
  clock?: {
    timeRemaining: string;
    secondsRemaining: number;
    running: boolean;
    inIntermission: boolean;
  };
  periodDescriptor?: {
    number: number;
    periodType: string;
    maxRegulationPeriods: number;
  };
  tvBroadcasts: NhlBroadcast[];
}

export interface NhlTeam {
  id: number;
  abbrev: string;
  commonName: { default: string };
  score?: number;
  sog?: number;
  logo: string;
  record?: string;
}

export interface NhlBroadcast {
  id: number;
  market: string;
  countryCode: string;
  network: string;
}

/** Top-level response from /v1/gamecenter/{id}/play-by-play */
export interface NhlPlayByPlayResponse {
  id: number;
  season: number;
  gameType: number;
  gameDate: string;
  gameState: string;
  awayTeam: NhlTeam & { score: number; sog: number };
  homeTeam: NhlTeam & { score: number; sog: number };
  clock: {
    timeRemaining: string;
    secondsRemaining: number;
    running: boolean;
    inIntermission: boolean;
  };
  plays: NhlPlayEvent[];
}

export interface NhlPlayEvent {
  eventId: number;
  periodDescriptor: {
    number: number;
    periodType: string;
    maxRegulationPeriods: number;
  };
  timeInPeriod: string;
  timeRemaining: string;
  situationCode: string;
  homeTeamDefendingSide: string;
  typeCode: number;
  typeDescKey: string;
  sortOrder: number;
  details?: NhlPlayDetails;
}

export interface NhlPlayDetails {
  xCoord?: number;
  yCoord?: number;
  zoneCode?: string;
  shotType?: string;
  reason?: string;
  shootingPlayerId?: number;
  scoringPlayerId?: number;
  scoringPlayerTotal?: number;
  assist1PlayerId?: number;
  assist1PlayerTotal?: number;
  assist2PlayerId?: number;
  assist2PlayerTotal?: number;
  goalieInNetId?: number;
  eventOwnerTeamId: number;
  awayScore?: number;
  homeScore?: number;
  awaySOG?: number;
  homeSOG?: number;
}

/** Discriminated type for shot-related plays */
export interface NhlShotPlay extends NhlPlayEvent {
  typeCode: 505 | 506 | 507;
  details: NhlPlayDetails & {
    xCoord: number;
    yCoord: number;
    eventOwnerTeamId: number;
  };
}
