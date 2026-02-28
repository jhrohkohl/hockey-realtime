"use client";

import { GameCard } from "@/components/game-card";
import type { GameRow } from "@/types/database";

interface HistoryListProps {
  games: GameRow[];
}

export function HistoryList({ games }: HistoryListProps) {
  // Group games by date
  const grouped = new Map<string, GameRow[]>();
  for (const game of games) {
    const date = game.game_date;
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(game);
  }

  return (
    <div className="space-y-8">
      {Array.from(grouped.entries()).map(([date, dateGames]) => (
        <section key={date}>
          <h2 className="text-lg font-semibold mb-3 text-base-content/80">
            {formatDate(date)}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dateGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
