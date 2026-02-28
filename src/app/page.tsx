import { Suspense } from "react";
import { createSupabaseServerClient } from "@/services/supabase-server";
import { GameGrid } from "@/components/game-grid";
import { GameGridSkeleton } from "@/components/game-card-skeleton";
import { fetchScoreByDate } from "@/services/nhl-api";
import type { GameRow } from "@/types/database";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{ date?: string }>;
}

function getTodayET(): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Fetch schedule from the NHL API for a date and upsert into DB */
async function fetchAndSeedSchedule(
  date: string,
): Promise<GameRow[]> {
  const supabase = createSupabaseServerClient();

  try {
    const scoreData = await fetchScoreByDate(date);

    if (scoreData.games.length === 0) return [];

    const gameUpserts = scoreData.games.map((game) => ({
      id: game.id,
      season: game.season,
      game_date: game.gameDate,
      game_state: game.gameState,
      home_team_id: game.homeTeam.id,
      away_team_id: game.awayTeam.id,
      home_team_abbrev: game.homeTeam.abbrev,
      away_team_abbrev: game.awayTeam.abbrev,
      home_team_name: game.homeTeam.name.default,
      away_team_name: game.awayTeam.name.default,
      home_score: game.homeTeam.score ?? 0,
      away_score: game.awayTeam.score ?? 0,
      period_number: game.periodDescriptor?.number ?? null,
      period_type: game.periodDescriptor?.periodType ?? null,
      time_remaining: game.clock?.timeRemaining ?? null,
      start_time_utc: game.startTimeUTC,
      last_polled_at: new Date().toISOString(),
    }));

    await supabase.from("games").upsert(gameUpserts, { onConflict: "id" });

    // Re-query to get the full GameRow shape (with created_at, updated_at)
    const { data } = await supabase
      .from("games")
      .select("*")
      .eq("game_date", date)
      .order("start_time_utc", { ascending: true });

    return (data ?? []) as GameRow[];
  } catch (err) {
    console.warn(`Failed to fetch NHL schedule for ${date}:`, err);
    return [];
  }
}

export default async function HomePage(props: HomePageProps) {
  const searchParams = await props.searchParams;
  const date = searchParams.date || getTodayET();

  const supabase = createSupabaseServerClient();
  const { data: dbGames } = await supabase
    .from("games")
    .select("*")
    .eq("game_date", date)
    .order("start_time_utc", { ascending: true });

  // If DB has no games for this date, try fetching from the NHL API
  let games = (dbGames ?? []) as GameRow[];
  if (games.length === 0) {
    games = await fetchAndSeedSchedule(date);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      <Suspense fallback={<GameGridSkeleton />}>
        <GameGrid key={date} initialGames={games} date={date} />
      </Suspense>
    </main>
  );
}
