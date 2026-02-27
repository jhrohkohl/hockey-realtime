import { createSupabaseServerClient } from "@/services/supabase-server";
import { GameHeader } from "@/components/game-header";
import { HexHeatmap } from "@/components/hex-heatmap";
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

  const [gameResult, shotsResult] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).single(),
    supabase.from("shot_events").select("*").eq("game_id", gameId),
  ]);

  if (!gameResult.data) return notFound();

  const game = gameResult.data;

  return (
    <main className="container mx-auto px-4 py-8">
      <GameHeader initialGame={game} />
      <HexHeatmap
        gameId={gameId}
        initialShots={shotsResult.data ?? []}
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
