import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabase-server";
import { GameSelector } from "@/components/game-selector";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  // NHL game dates are in Eastern Time
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  )
    .toISOString()
    .split("T")[0];

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("game_date", today)
    .order("start_time_utc", { ascending: true });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold">NHL Shot Heatmap</h1>
        <Link href="/history" className="btn btn-ghost btn-sm">
          All Games &rarr;
        </Link>
      </div>
      <p className="text-base-content/70 mb-8">
        Real-time hexagonal shot charts for today&apos;s games
      </p>
      <GameSelector initialGames={games ?? []} />
    </main>
  );
}
