"use client";

import { useGamesToday } from "@/hooks/use-games-today";
import { GameCard } from "@/components/game-card";
import type { GameRow } from "@/types/database";

interface GameSelectorProps {
  initialGames: GameRow[];
}

export function GameSelector({ initialGames }: GameSelectorProps) {
  const { games } = useGamesToday(initialGames);

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
