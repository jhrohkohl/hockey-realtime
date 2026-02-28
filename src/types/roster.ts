/** Roster entry for the player picker dropdown */
export interface RosterPlayer {
  playerId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  teamId: number;
  teamAbbrev: string;
  sweaterNumber: number | null;
  positionCode: string | null;
}
