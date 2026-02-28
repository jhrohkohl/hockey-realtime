import { Suspense } from "react";
import { createSupabaseServerClient } from "@/services/supabase-server";
import { GameGrid } from "@/components/game-grid";
import { GameGridSkeleton } from "@/components/game-card-skeleton";

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

export default async function HomePage(props: HomePageProps) {
  const searchParams = await props.searchParams;
  const date = searchParams.date || getTodayET();

  const supabase = createSupabaseServerClient();
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("game_date", date)
    .order("start_time_utc", { ascending: true });

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      <Suspense fallback={<GameGridSkeleton />}>
        <GameGrid initialGames={games ?? []} date={date} />
      </Suspense>
    </main>
  );
}
