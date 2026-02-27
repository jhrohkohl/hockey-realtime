import type { GameRow } from "@/types/database";

const GAME_STATE_LABELS: Record<string, string> = {
  FUT: "Scheduled",
  PRE: "Pre-Game",
  LIVE: "LIVE",
  CRIT: "LIVE - FINAL MIN",
  OFF: "Final",
  FINAL: "Final",
};

export function getGameStatusLabel(game: GameRow): string {
  return GAME_STATE_LABELS[game.game_state] ?? game.game_state;
}

export function isGameLive(state: string): boolean {
  return state === "LIVE" || state === "CRIT";
}

export function isGameFinished(state: string): boolean {
  return state === "OFF" || state === "FINAL";
}

export function isGameFuture(state: string): boolean {
  return state === "FUT" || state === "PRE";
}
