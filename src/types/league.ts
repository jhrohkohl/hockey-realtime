/** Scope determines what data is displayed on the heatmap */
export type Scope = "league" | "team" | "team-vs-league" | "team-vs-team";

export type HexSize = "S" | "M" | "L";

export type StrengthFilter = "ALL" | "EV" | "PP" | "PK";

export const HEX_RADII: Record<HexSize, number> = { S: 3, M: 4, L: 6 };

export interface LeagueShotRow {
  game_id: number;
  x_coord: number;
  y_coord: number;
  type_code: number;
  team_id: number;
  home_team_defending_side: string | null;
  goalie_player_id: number | null;
  strength: string | null;
}

export type LeagueShotPoint = [number, number] & { _shot: LeagueShotRow };

export interface AvailableTeam {
  abbrev: string;
  name: string;
}

/** UI-level view mode (maps to Scope for the data layer) */
export type ViewMode = "league" | "team" | "compare";

/** Comparison baseline */
export type Baseline = "league" | "team";

export interface LeagueViewState {
  view: ViewMode;
  baseline: Baseline;
  hexSize: HexSize;
  strengthFilter: StrengthFilter;
  minSample: number;
  hideLowSample: boolean;
  teamA: string | null;
  teamB: string | null;
}

/** Processed hex bin with pre-computed metrics */
export interface ProcessedBin {
  x: number;
  y: number;
  count: number;
  goals: number;
  shootingPct: number;
  /** Per-game normalized count (for comparisons) */
  perGame: number;
  /** True if this bin has fewer shots than minSample */
  lowSample: boolean;
}

/** Difference bin for comparison modes */
export interface DifferenceBin {
  x: number;
  y: number;
  delta: number;
  /** Absolute value for magnitude sorting */
  absDelta: number;
  countA: number;
  countB: number;
  /** Label for the primary metric (e.g. "2.3 → 4.1 shots/gm") */
  detailA: string;
  detailB: string;
  lowSample: boolean;
}
