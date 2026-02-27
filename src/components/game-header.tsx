"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/services/supabase-browser";
import { getGameStatusLabel, isGameLive } from "@/utils/game-status";
import type { GameRow } from "@/types/database";

interface GameHeaderProps {
  initialGame: GameRow;
}

export function GameHeader({ initialGame }: GameHeaderProps) {
  const [game, setGame] = useState<GameRow>(initialGame);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`game-${game.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${game.id}`,
        },
        (payload) => {
          setGame(payload.new as GameRow);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game.id]);

  const live = isGameLive(game.game_state);

  return (
    <div className="relative mb-8">
      <Link href="/" className="btn btn-ghost btn-sm absolute left-0 top-0">
        &larr; Back
      </Link>

      <div className="flex items-center justify-center gap-8 pt-2">
        {/* Away team */}
        <div className="flex items-center gap-3">
          <img
            src={`/team-logos/${game.away_team_abbrev}.png`}
            alt={game.away_team_name}
            width={56}
            height={56}
          />
          <div className="text-center">
            <div className="text-lg font-bold">{game.away_team_abbrev}</div>
            <div className="text-sm opacity-70">{game.away_team_name}</div>
          </div>
        </div>

        {/* Score and status */}
        <div className="text-center">
          <div className="text-4xl font-bold">
            {game.away_score} - {game.home_score}
          </div>
          <div className="mt-1">
            <span
              className={`badge badge-sm ${live ? "badge-error animate-pulse" : "badge-ghost"}`}
            >
              {getGameStatusLabel(game)}
            </span>
            {game.time_remaining && live && (
              <span className="text-sm opacity-70 ml-2">
                P{game.period_number} {game.time_remaining}
              </span>
            )}
          </div>
        </div>

        {/* Home team */}
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-lg font-bold">{game.home_team_abbrev}</div>
            <div className="text-sm opacity-70">{game.home_team_name}</div>
          </div>
          <img
            src={`/team-logos/${game.home_team_abbrev}.png`}
            alt={game.home_team_name}
            width={56}
            height={56}
          />
        </div>
      </div>
    </div>
  );
}
