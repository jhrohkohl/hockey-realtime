"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { GameRow } from "@/types/database";
import {
  getGameStatusLabel,
  isGameLive,
  isGameFinished,
  isGameFuture,
} from "@/utils/game-status";

interface GameCardProps {
  game: GameRow;
}

/** Format UTC start time to local HH:MM AM/PM + ET label */
function formatStartTime(utc: string): string {
  const d = new Date(utc);
  const local = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  return `${local} ET`;
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-sh-live animate-live-dot" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-sh-live" />
    </span>
  );
}

function ScoreDigit({
  score,
  flash,
}: {
  score: number;
  flash: boolean;
}) {
  return (
    <span
      className={`tabular-nums font-bold ${flash ? "animate-score-flash" : ""}`}
    >
      {score}
    </span>
  );
}

export function GameCard({ game }: GameCardProps) {
  const live = isGameLive(game.game_state);
  const future = isGameFuture(game.game_state);
  const finished = isGameFinished(game.game_state);

  // Track score changes for flash animation
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

  const cardClasses = [
    "glass-card glass-card-interactive block",
    live ? "glass-card-live" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={`/game/${game.id}`} className={cardClasses}>
      <div className="relative z-10 px-4 py-3">
        {/* Status row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {live && <LiveDot />}
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                live
                  ? "text-sh-live"
                  : finished
                    ? "text-sh-text-muted"
                    : "text-sh-text-muted"
              }`}
            >
              {getGameStatusLabel(game)}
            </span>
          </div>

          <span className="text-xs text-sh-text-muted tabular-nums">
            {live && game.time_remaining
              ? `P${game.period_number} · ${game.time_remaining}`
              : future
                ? formatStartTime(game.start_time_utc)
                : null}
          </span>
        </div>

        {/* Teams + Score row */}
        <div className="flex items-center justify-between gap-2">
          {/* Away team */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Image
              src={`/team-logos/${game.away_team_abbrev}.png`}
              alt={game.away_team_name}
              width={28}
              height={28}
              className="object-contain shrink-0"
            />
            <span className="font-semibold text-sm truncate">
              {game.away_team_abbrev}
            </span>
          </div>

          {/* Score */}
          <div className="text-xl flex items-center gap-1.5 shrink-0 px-2">
            {future ? (
              <span className="text-sh-text-muted text-sm font-medium">
                vs
              </span>
            ) : (
              <>
                <ScoreDigit score={game.away_score} flash={awayFlash} />
                <span className="text-sh-text-muted text-base">–</span>
                <ScoreDigit score={game.home_score} flash={homeFlash} />
              </>
            )}
          </div>

          {/* Home team */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end">
            <span className="font-semibold text-sm truncate">
              {game.home_team_abbrev}
            </span>
            <Image
              src={`/team-logos/${game.home_team_abbrev}.png`}
              alt={game.home_team_name}
              width={28}
              height={28}
              className="object-contain shrink-0"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
