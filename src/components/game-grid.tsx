"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GameCard } from "@/components/game-card";
import { GameGridSkeleton } from "@/components/game-card-skeleton";
import { useGamesToday } from "@/hooks/use-games-today";
import { isGameLive, isGameFinished, isGameFuture } from "@/utils/game-status";
import type { GameRow } from "@/types/database";

interface GameGridProps {
  initialGames: GameRow[];
  date: string;
}

/** Shift an ISO date string by n days */
function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Format ISO date to readable label */
function formatDateLabel(iso: string, todayIso: string): string {
  if (iso === todayIso) return "Today";

  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getTodayET(): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function SectionHeading({
  children,
  count,
}: {
  children: React.ReactNode;
  count: number;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-sh-text-muted">
        {children}
      </h2>
      <span className="text-xs text-sh-text-muted tabular-nums">
        {count}
      </span>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  );
}

export function GameGrid({ initialGames, date }: GameGridProps) {
  const router = useRouter();
  const { games } = useGamesToday(initialGames);
  const todayET = getTodayET();

  const [liveOnly, setLiveOnly] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = games;

    if (liveOnly) {
      result = result.filter((g) => isGameLive(g.game_state));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (g) =>
          g.home_team_abbrev.toLowerCase().includes(q) ||
          g.away_team_abbrev.toLowerCase().includes(q) ||
          g.home_team_name.toLowerCase().includes(q) ||
          g.away_team_name.toLowerCase().includes(q),
      );
    }

    return result;
  }, [games, liveOnly, search]);

  const liveGames = filtered.filter((g) => isGameLive(g.game_state));
  const scheduledGames = filtered.filter((g) => isGameFuture(g.game_state));
  const finalGames = filtered.filter((g) => isGameFinished(g.game_state));

  const hasAnyLive = games.some((g) => isGameLive(g.game_state));

  function navigateDate(offset: number) {
    const next = shiftDate(date, offset);
    router.push(`/?date=${next}`);
  }

  return (
    <div className="space-y-6">
      {/* ── Controls bar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Date selector */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigateDate(-1)}
            className="glass-pill px-2.5 py-1.5 text-sh-text-muted hover:text-sh-text transition-colors"
            aria-label="Previous day"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 3.5L5 7l3.5 3.5" />
            </svg>
          </button>
          <span className="glass-pill glass-pill-active px-4 py-1.5 text-sm font-medium text-sh-text tabular-nums min-w-[110px] text-center">
            {formatDateLabel(date, todayET)}
            {date !== todayET && (
              <span className="text-sh-text-muted ml-1">
                {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => navigateDate(1)}
            className="glass-pill px-2.5 py-1.5 text-sh-text-muted hover:text-sh-text transition-colors"
            aria-label="Next day"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5.5 3.5L9 7l-3.5 3.5" />
            </svg>
          </button>
          {date !== todayET && (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="ml-1 glass-pill px-3 py-1.5 text-xs font-medium text-sh-accent hover:text-white transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Live toggle */}
          <button
            type="button"
            onClick={() => setLiveOnly((v) => !v)}
            className={`glass-pill px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${
              liveOnly
                ? "glass-pill-live"
                : hasAnyLive
                  ? "text-sh-text-muted hover:text-sh-live"
                  : "text-sh-text-muted opacity-50 cursor-default"
            }`}
            disabled={!hasAnyLive}
            aria-pressed={liveOnly}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`inline-flex h-full w-full rounded-full ${
                  liveOnly || hasAnyLive ? "bg-sh-live" : "bg-sh-text-muted"
                }`}
              />
            </span>
            Live
          </button>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sh-text-muted pointer-events-none"
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="6" cy="6" r="4.5" />
              <path d="M9.5 9.5L13 13" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams…"
              className="glass-pill py-1.5 pl-8 pr-3 text-xs font-medium text-sh-text placeholder:text-sh-text-muted w-36 sm:w-40 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all bg-transparent"
              aria-label="Search teams"
            />
          </div>
        </div>
      </div>

      {/* ── Game sections ────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="glass-card px-6 py-10 text-center">
          <p className="text-sh-text-muted text-sm">
            {search.trim()
              ? `No games matching "${search.trim()}"`
              : liveOnly
                ? "No live games right now"
                : "No games scheduled for this date"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Live Now */}
          {liveGames.length > 0 && (
            <section>
              <SectionHeading count={liveGames.length}>
                Live Now
              </SectionHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {liveGames.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </section>
          )}

          {/* Scheduled */}
          {scheduledGames.length > 0 && (
            <section>
              <SectionHeading count={scheduledGames.length}>
                Scheduled
              </SectionHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {scheduledGames.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </section>
          )}

          {/* Final */}
          {finalGames.length > 0 && (
            <section>
              <SectionHeading count={finalGames.length}>
                Final
              </SectionHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {finalGames.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
