/** Row type for the games table */
export interface GameRow {
  id: number;
  season: number;
  game_date: string;
  game_state: string;
  home_team_id: number;
  away_team_id: number;
  home_team_abbrev: string;
  away_team_abbrev: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  period_number: number | null;
  period_type: string | null;
  time_remaining: string | null;
  start_time_utc: string;
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Row type for the shot_events table */
export interface ShotEventRow {
  id: number;
  game_id: number;
  event_id: number;
  type_code: number;
  type_desc_key: string;
  x_coord: number;
  y_coord: number;
  zone_code: string | null;
  shot_type: string | null;
  period_number: number;
  period_type: string;
  time_in_period: string;
  team_id: number;
  shooter_player_id: number | null;
  goalie_player_id: number | null;
  home_team_defending_side: string | null;
  created_at: string;
}

/** Insert type (omit auto-generated fields) */
export type ShotEventInsert = Omit<ShotEventRow, "id" | "created_at">;
export type GameUpsert = Omit<GameRow, "created_at" | "updated_at">;
