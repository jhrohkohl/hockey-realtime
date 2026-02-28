import { createSupabaseServerClient } from "@/services/supabase-server";
import { GameHeader } from "@/components/game-header";
import { HexHeatmap } from "@/components/hex-heatmap";
import {
  fetchPlayByPlay,
  extractGoalEvents,
  extractPenaltyEvents,
  buildShotEnrichmentMap,
  type GoalEvent,
  type PenaltyEvent,
  type ShotEnrichment,
} from "@/services/nhl-api";
import type { ShiftRow } from "@/types/database";
import type { NhlRosterSpot } from "@/types/nhl-api";
import type { RosterPlayer } from "@/types/roster";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface GamePageProps {
  params: Promise<{ gameId: string }>;
}

export default async function GamePage(props: GamePageProps) {
  const params = await props.params;
  const gameId = Number(params.gameId);
  if (Number.isNaN(gameId)) return notFound();

  const supabase = createSupabaseServerClient();

  const [gameResult, shotsResult, shiftsResult] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).single(),
    supabase.from("shot_events").select("*").eq("game_id", gameId),
    supabase.from("shifts").select("*").eq("game_id", gameId),
  ]);

  if (!gameResult.data) return notFound();

  const game = gameResult.data;

  // Fetch goal + penalty events from NHL API (best-effort)
  let goalEvents: GoalEvent[] = [];
  let penaltyEvents: PenaltyEvent[] = [];
  let shotEnrichmentMap = new Map<number, ShotEnrichment>();
  let rosterSpots: NhlRosterSpot[] | undefined;
  try {
    const pbp = await fetchPlayByPlay(gameId);
    goalEvents = extractGoalEvents(pbp);
    penaltyEvents = extractPenaltyEvents(pbp);
    shotEnrichmentMap = buildShotEnrichmentMap(pbp);
    rosterSpots = pbp.rosterSpots;
  } catch {
    // NHL API unavailable — proceed without details
  }

  // Convert Map → plain object for serialization to client component
  const shotEnrichment = Object.fromEntries(shotEnrichmentMap);

  // Build roster from shifts + rosterSpots (for position/sweater number)
  const shifts = (shiftsResult.data ?? []) as ShiftRow[];
  const roster = buildRoster(shifts, rosterSpots);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-4">
      <GameHeader initialGame={game} />
      <HexHeatmap
        gameId={gameId}
        initialShots={shotsResult.data ?? []}
        shifts={shifts}
        roster={roster}
        goalEvents={goalEvents}
        penaltyEvents={penaltyEvents}
        shotEnrichment={shotEnrichment}
        homeTeamAbbrev={game.home_team_abbrev}
        awayTeamAbbrev={game.away_team_abbrev}
        homeTeamName={game.home_team_name}
        awayTeamName={game.away_team_name}
        homeTeamId={game.home_team_id ?? 0}
        awayTeamId={game.away_team_id ?? 0}
      />
    </main>
  );
}

function buildRoster(
  shifts: ShiftRow[],
  rosterSpots: NhlRosterSpot[] | undefined,
): RosterPlayer[] {
  const spotMap = new Map<number, NhlRosterSpot>();
  for (const spot of rosterSpots ?? []) {
    spotMap.set(spot.playerId, spot);
  }

  const seen = new Set<number>();
  const roster: RosterPlayer[] = [];

  for (const shift of shifts) {
    if (seen.has(shift.player_id)) continue;
    seen.add(shift.player_id);

    const spot = spotMap.get(shift.player_id);
    roster.push({
      playerId: shift.player_id,
      firstName: shift.first_name,
      lastName: shift.last_name,
      fullName: `${shift.first_name} ${shift.last_name}`,
      teamId: shift.team_id,
      teamAbbrev: shift.team_abbrev,
      sweaterNumber: spot?.sweaterNumber ?? null,
      positionCode: spot?.positionCode ?? null,
    });
  }

  // Sort: by team, goalies last, then by sweater number
  return roster.sort((a, b) => {
    if (a.teamId !== b.teamId) return a.teamId - b.teamId;
    const posOrder = (p: string | null) => (p === "G" ? 1 : 0);
    if (posOrder(a.positionCode) !== posOrder(b.positionCode))
      return posOrder(a.positionCode) - posOrder(b.positionCode);
    return (a.sweaterNumber ?? 99) - (b.sweaterNumber ?? 99);
  });
}
