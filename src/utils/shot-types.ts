/** NHL API type codes for shot-related events */
export const SHOT_TYPE_CODES = {
  GOAL: 505,
  SHOT_ON_GOAL: 506,
  MISSED_SHOT: 507,
} as const;

export type ShotTypeCode = (typeof SHOT_TYPE_CODES)[keyof typeof SHOT_TYPE_CODES];

export const ALL_SHOT_TYPE_CODES: readonly ShotTypeCode[] = [505, 506, 507];

export function isShotTypeCode(code: number): code is ShotTypeCode {
  return code === 505 || code === 506 || code === 507;
}
