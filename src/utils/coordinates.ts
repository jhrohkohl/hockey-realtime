/**
 * Converts NHL API coordinates to SVG rink coordinates.
 * NHL: x in [-100, 100], y in [-42.5, 42.5] with (0,0) at center ice
 * SVG:  x in [0, 200], y in [0, 85] with (0,0) at top-left
 */
export function nhlToSvg(nhlX: number, nhlY: number): [number, number] {
  const svgX = nhlX + 100;
  const svgY = -nhlY + 42.5;
  return [svgX, svgY];
}

/**
 * Normalizes a shot to the offensive (right) half of the rink.
 * Shots from the left side are mirrored to the right.
 * Used for half-rink heatmap views.
 */
export function normalizeToOffensiveZone(
  svgX: number,
  svgY: number
): [number, number] {
  if (svgX < 100) {
    return [200 - svgX, 85 - svgY];
  }
  return [svgX, svgY];
}

/** Half-rink dimensions (offensive zone only) in SVG units */
export const HALF_RINK = {
  /** Full width of half-rink SVG (x: 100 to 200 = 100 units) */
  WIDTH: 100,
  /** Height of rink in SVG units */
  HEIGHT: 85,
  /** X offset where half-rink starts in full rink coords */
  X_OFFSET: 100,
} as const;

/**
 * Reorient NHL coordinates so the given team's offensive zone
 * is always on the RIGHT (positive-x) side.
 *
 * Uses `home_team_defending_side` from the play-by-play event
 * to determine which direction each team attacks.
 *
 * - "left"  → home defends left  → home attacks RIGHT, away attacks LEFT
 * - "right" → home defends right → home attacks LEFT,  away attacks RIGHT
 *
 * When a team attacks LEFT we flip (x → −x, y → −y) so the shot
 * renders as if the team attacks RIGHT on a full-rink SVG.
 */
export function orientToAttackRight(
  nhlX: number,
  nhlY: number,
  teamId: number,
  homeTeamId: number,
  homeTeamDefendingSide: string | null,
): [number, number] {
  if (!homeTeamDefendingSide) return [nhlX, nhlY];

  const isHome = teamId === homeTeamId;
  const homeAttacksRight = homeTeamDefendingSide === "left";
  const teamAttacksRight = isHome ? homeAttacksRight : !homeAttacksRight;

  if (teamAttacksRight) return [nhlX, nhlY];
  return [-nhlX, -nhlY];
}

/** Full rink dimensions in SVG units */
export const FULL_RINK = {
  LENGTH: 200,
  WIDTH: 85,
} as const;
