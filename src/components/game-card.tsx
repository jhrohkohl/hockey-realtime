"use client";

import Link from "next/link";
import type { GameRow } from "@/types/database";
import { getGameStatusLabel, isGameLive } from "@/utils/game-status";

interface GameCardProps {
  game: GameRow;
}

export function GameCard({ game }: GameCardProps) {
  const live = isGameLive(game.game_state);

  return (
    <Link href={`/game/${game.id}`}>
      <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
        <div className="card-body p-4">
          {/* Status badge */}
          <div className="flex justify-between items-center mb-2">
            <span
              className={`badge ${live ? "badge-error animate-pulse" : "badge-ghost"}`}
            >
              {getGameStatusLabel(game)}
            </span>
            {game.time_remaining && live && (
              <span className="text-sm opacity-70">
                P{game.period_number} - {game.time_remaining}
              </span>
            )}
          </div>
          {/* Teams row */}
          <div className="flex items-center justify-between">
            {/* Away team */}
            <div className="flex items-center gap-2">
              <img
                src={`/team-logos/${game.away_team_abbrev}.png`}
                alt={game.away_team_name}
                width={40}
                height={40}
              />
              <span className="font-semibold">{game.away_team_abbrev}</span>
            </div>
            {/* Score */}
            <div className="text-2xl font-bold">
              {game.away_score} - {game.home_score}
            </div>
            {/* Home team */}
            <div className="flex items-center gap-2">
              <span className="font-semibold">{game.home_team_abbrev}</span>
              <img
                src={`/team-logos/${game.home_team_abbrev}.png`}
                alt={game.home_team_name}
                width={40}
                height={40}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
