"use client";

import { useGamesToday } from "@/hooks/use-games-today";
import { GameCard } from "@/components/game-card";
import type { GameRow } from "@/types/database";

interface GameSelectorProps {
  initialGames: GameRow[];
  date?: string;
}

function getTodayET(): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function GameSelector({ initialGames, date }: GameSelectorProps) {
  const { games } = useGamesToday(initialGames, date ?? getTodayET());

  if (games.length === 0) {
    return (
      <div className="alert alert-info">
        <span>No games scheduled for today. Check back later!</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
