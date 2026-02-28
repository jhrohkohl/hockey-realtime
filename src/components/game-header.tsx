"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/services/supabase-browser";
import {
  getGameStatusLabel,
  isGameLive,
  isGameFuture,
} from "@/utils/game-status";
import type { GameRow } from "@/types/database";

interface GameHeaderProps {
  initialGame: GameRow;
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-sh-live animate-live-dot" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-sh-live" />
    </span>
  );
}

function ScoreDigit({ score, flash }: { score: number; flash: boolean }) {
  return (
    <span className={`tabular-nums ${flash ? "animate-score-flash" : ""}`}>
      {score}
    </span>
  );
}

function formatStartTime(utc: string): string {
  const d = new Date(utc);
  return (
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    }) + " ET"
  );
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
        (payload) => setGame(payload.new as GameRow),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [game.id]);

  const live = isGameLive(game.game_state);
  const future = isGameFuture(game.game_state);

  // Score flash tracking
  const prevRef = useRef({ home: game.home_score, away: game.away_score });
  const [homeFlash, setHomeFlash] = useState(false);
  const [awayFlash, setAwayFlash] = useState(false);

  useEffect(() => {
    if (game.home_score !== prevRef.current.home) {
      setHomeFlash(true);
      const t = setTimeout(() => setHomeFlash(false), 650);
      return () => clearTimeout(t);
    }
  }, [game.home_score]);

  useEffect(() => {
    if (game.away_score !== prevRef.current.away) {
      setAwayFlash(true);
      const t = setTimeout(() => setAwayFlash(false), 650);
      return () => clearTimeout(t);
    }
  }, [game.away_score]);

  useEffect(() => {
    prevRef.current = { home: game.home_score, away: game.away_score };
  }, [game.home_score, game.away_score]);

  return (
    <div className="glass-card px-4 sm:px-6 py-4">
      <div className="flex items-center justify-center gap-5 sm:gap-8">
        {/* Away team */}
        <div className="flex items-center gap-2.5">
          <Image
            src={`/team-logos/${game.away_team_abbrev}.png`}
            alt={game.away_team_name}
            width={40}
            height={40}
            className="object-contain"
          />
          <div>
            <div className="text-base sm:text-lg font-bold tracking-tight">
              {game.away_team_abbrev}
            </div>
            <div className="text-[11px] text-sh-text-muted hidden sm:block">
              {game.away_team_name}
            </div>
          </div>
        </div>

        {/* Score + Status */}
        <div className="text-center min-w-[100px]">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight">
            {future ? (
              <span className="text-sh-text-muted text-lg font-medium">
                {formatStartTime(game.start_time_utc)}
              </span>
            ) : (
              <>
                <ScoreDigit score={game.away_score} flash={awayFlash} />
                <span className="text-sh-text-muted mx-1.5 sm:mx-2 text-xl sm:text-2xl">
                  –
                </span>
                <ScoreDigit score={game.home_score} flash={homeFlash} />
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 justify-center mt-0.5">
            {live && <LiveDot />}
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                live ? "text-sh-live" : "text-sh-text-muted"
              }`}
            >
              {getGameStatusLabel(game)}
            </span>
            {live && game.time_remaining && (
              <span className="text-[11px] text-sh-text-muted tabular-nums">
                P{game.period_number} · {game.time_remaining}
              </span>
            )}
          </div>
        </div>

        {/* Home team */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="text-base sm:text-lg font-bold tracking-tight">
              {game.home_team_abbrev}
            </div>
            <div className="text-[11px] text-sh-text-muted hidden sm:block">
              {game.home_team_name}
            </div>
          </div>
          <Image
            src={`/team-logos/${game.home_team_abbrev}.png`}
            alt={game.home_team_name}
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
