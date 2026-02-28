"use client";

import { useMemo } from "react";
import Image from "next/image";
import { SHOT_TYPE_CODES } from "@/utils/shot-types";
import type { ShotEventRow } from "@/types/database";
import type { GoalEvent, GoalStrength, PenaltyEvent } from "@/services/nhl-api";

interface GameStatsProps {
  shots: ShotEventRow[];
  goalEvents: GoalEvent[];
  penaltyEvents: PenaltyEvent[];
  homeTeamId: number;
  awayTeamId: number;
  homeTeamAbbrev: string;
  awayTeamAbbrev: string;
}

const SHOT_TYPE_LABELS: Record<string, string> = {
  wrist: "Wrist",
  slap: "Slap",
  snap: "Snap",
  "tip-in": "Tip-In",
  deflected: "Deflected",
  backhand: "Backhand",
  "wrap-around": "Wrap",
  bat: "Batted",
  poke: "Poke",
  cradle: "Cradle",
};

const BADGE_STYLES: Record<string, string> = {
  EV: "text-sh-text-muted border-white/[0.08]",
  PP: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  SH: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  EN: "text-orange-400 border-orange-400/30 bg-orange-400/10",
};

/** Split combo strengths like "PP/EN" into two separate badges */
function StrengthBadges({ strength }: { strength: GoalStrength }) {
  const parts = strength.includes("/")
    ? strength.split("/")
    : [strength];

  return (
    <span className="inline-flex items-center gap-0.5">
      {parts.map((part) => (
        <span
          key={part}
          className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wide px-1 py-px rounded border leading-none ${BADGE_STYLES[part] ?? BADGE_STYLES.EV}`}
        >
          {part}
        </span>
      ))}
    </span>
  );
}

function periodLabel(period: number): string {
  if (period > 3) return period === 4 ? "OT" : `${period - 3}OT`;
  return `${period}P`;
}

function periodHeading(period: number, periodType?: string): string {
  if (periodType === "SO") return "Shootout";
  if (period > 3) return period === 4 ? "Overtime" : `${period - 3}OT`;
  return `Period ${period}`;
}

function isSog(s: ShotEventRow): boolean {
  return (
    s.type_code === SHOT_TYPE_CODES.GOAL ||
    s.type_code === SHOT_TYPE_CODES.SHOT_ON_GOAL
  );
}

export function GameStats({
  shots,
  goalEvents,
  penaltyEvents,
  homeTeamId,
  awayTeamId,
  homeTeamAbbrev,
  awayTeamAbbrev,
}: GameStatsProps) {
  // ── SOG + missed per period ───────────────────────────
  const {
    periods,
    awaySogByPeriod,
    homeSogByPeriod,
    awaySogTotal,
    homeSogTotal,
    awayMissedTotal,
    homeMissedTotal,
  } = useMemo(() => {
    const periodsSet = new Set<number>();
    const awaySog = new Map<number, number>();
    const homeSog = new Map<number, number>();
    let awaySogT = 0;
    let homeSogT = 0;
    let awayMissedT = 0;
    let homeMissedT = 0;

    for (const s of shots) {
      periodsSet.add(s.period_number);
      const isAway = s.team_id === awayTeamId;
      const isHome = s.team_id === homeTeamId;

      if (isSog(s)) {
        if (isAway) {
          awaySog.set(s.period_number, (awaySog.get(s.period_number) ?? 0) + 1);
          awaySogT++;
        } else if (isHome) {
          homeSog.set(s.period_number, (homeSog.get(s.period_number) ?? 0) + 1);
          homeSogT++;
        }
      } else {
        if (isAway) awayMissedT++;
        else if (isHome) homeMissedT++;
      }
    }

    // Always show 1P, 2P, 3P; add OT+ only if data exists
    const basePeriods = [1, 2, 3];
    const extraPeriods = Array.from(periodsSet)
      .filter((p) => p > 3)
      .sort((a, b) => a - b);

    return {
      periods: [...basePeriods, ...extraPeriods],
      awaySogByPeriod: awaySog,
      homeSogByPeriod: homeSog,
      awaySogTotal: awaySogT,
      homeSogTotal: homeSogT,
      awayMissedTotal: awayMissedT,
      homeMissedTotal: homeMissedT,
    };
  }, [shots, awayTeamId, homeTeamId]);

  // ── Goals grouped by period (chronological) ───────────
  const goalsByPeriod = useMemo(() => {
    const map = new Map<number, GoalEvent[]>();
    for (const g of goalEvents) {
      const list = map.get(g.period) ?? [];
      list.push(g);
      map.set(g.period, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [goalEvents]);

  // ── Penalties grouped by period (chronological) ───────
  const penaltiesByPeriod = useMemo(() => {
    const map = new Map<number, PenaltyEvent[]>();
    for (const p of penaltyEvents) {
      const list = map.get(p.period) ?? [];
      list.push(p);
      map.set(p.period, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [penaltyEvents]);

  const teamAbbrevFor = (teamId: number) =>
    teamId === homeTeamId ? homeTeamAbbrev : awayTeamAbbrev;

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start">
      {/* SOG Summary */}
      <div className="glass-panel px-3 py-2.5 shrink-0">
        <h3 className="text-[9px] font-medium text-sh-text-muted/60 uppercase tracking-widest mb-1.5">
          Shots on Goal
        </h3>
        <table className="text-xs">
          <thead>
            <tr className="text-sh-text-muted/70 text-[9px] uppercase tracking-widest">
              <th className="text-left pr-3 pb-1 font-medium" />
              {periods.map((p) => (
                <th key={p} className="text-center px-1.5 pb-1 font-medium">
                  {periodLabel(p)}
                </th>
              ))}
              <th className="text-center pl-2 pb-1 font-semibold">T</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-white/[0.06]">
              <td className="py-1 pr-3">
                <div className="flex items-center gap-1.5">
                  <Image
                    src={`/team-logos/${awayTeamAbbrev}.png`}
                    alt={awayTeamAbbrev}
                    width={14}
                    height={14}
                  />
                  <span className="font-semibold text-sh-text">
                    {awayTeamAbbrev}
                  </span>
                </div>
              </td>
              {periods.map((p) => (
                <td
                  key={p}
                  className="text-center px-1.5 py-1 tabular-nums text-sh-text"
                >
                  {awaySogByPeriod.get(p) ?? 0}
                </td>
              ))}
              <td className="text-center pl-2 py-1 tabular-nums font-bold text-sh-text">
                {awaySogTotal}
              </td>
            </tr>
            <tr className="border-t border-white/[0.06]">
              <td className="py-1 pr-3">
                <div className="flex items-center gap-1.5">
                  <Image
                    src={`/team-logos/${homeTeamAbbrev}.png`}
                    alt={homeTeamAbbrev}
                    width={14}
                    height={14}
                  />
                  <span className="font-semibold text-sh-text">
                    {homeTeamAbbrev}
                  </span>
                </div>
              </td>
              {periods.map((p) => (
                <td
                  key={p}
                  className="text-center px-1.5 py-1 tabular-nums text-sh-text"
                >
                  {homeSogByPeriod.get(p) ?? 0}
                </td>
              ))}
              <td className="text-center pl-2 py-1 tabular-nums font-bold text-sh-text">
                {homeSogTotal}
              </td>
            </tr>
          </tbody>
        </table>
        {(awayMissedTotal > 0 || homeMissedTotal > 0) && (
          <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] text-[10px] text-sh-text-muted">
            Missed: {awayTeamAbbrev} {awayMissedTotal}, {homeTeamAbbrev}{" "}
            {homeMissedTotal}
          </div>
        )}
      </div>

      {/* Scoring */}
      <div className="glass-panel px-3 py-2.5 flex-1 min-w-0">
        <h3 className="text-[9px] font-medium text-sh-text-muted/60 uppercase tracking-widest mb-1.5">
          Scoring
        </h3>

        {goalEvents.length === 0 ? (
          <p className="text-xs text-sh-text-muted">No goals scored</p>
        ) : (
          <div className="space-y-2.5">
            {goalsByPeriod.map(([period, goals], idx) => (
              <div key={period}>
                <div className="flex items-center gap-2 mb-1.5">
                  {idx > 0 && (
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  )}
                  <span className="text-[9px] font-medium text-sh-text-muted/70 uppercase tracking-widest shrink-0">
                    {periodHeading(period, goals[0]?.periodType)}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                <div className="space-y-1">
                  {goals.map((goal) => (
                    <div
                      key={goal.eventId}
                      className="flex items-start gap-2 text-xs"
                    >
                      <Image
                        src={`/team-logos/${teamAbbrevFor(goal.teamId)}.png`}
                        alt={teamAbbrevFor(goal.teamId)}
                        width={13}
                        height={13}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sh-text leading-snug flex items-center gap-1.5">
                          <span>
                            <span className="font-semibold">
                              {goal.scorerName}
                            </span>
                            {goal.assists.length > 0 ? (
                              <span className="text-sh-text-muted">
                                {" "}
                                ({goal.assists.join(", ")})
                              </span>
                            ) : (
                              <span className="text-sh-text-muted">
                                {" "}
                                (unassisted)
                              </span>
                            )}
                          </span>
                          <StrengthBadges strength={goal.strength} />
                        </div>
                        <div className="text-[10px] text-sh-text-muted flex items-center gap-1.5">
                          {goal.shotType && (
                            <>
                              <span>
                                {SHOT_TYPE_LABELS[goal.shotType] ??
                                  goal.shotType}
                              </span>
                              <span className="opacity-40">·</span>
                            </>
                          )}
                          <span className="tabular-nums">
                            {goal.timeInPeriod}
                          </span>
                          <span className="opacity-40">·</span>
                          <span className="tabular-nums">
                            {goal.awayScore}–{goal.homeScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Penalties */}
      {penaltyEvents.length > 0 && (
        <div className="glass-panel px-3 py-2.5 flex-1 min-w-0">
          <h3 className="text-[9px] font-medium text-sh-text-muted/60 uppercase tracking-widest mb-1.5">
            Penalties
          </h3>
          <div className="space-y-2.5">
            {penaltiesByPeriod.map(([period, penalties], idx) => (
              <div key={period}>
                <div className="flex items-center gap-2 mb-1.5">
                  {idx > 0 && (
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  )}
                  <span className="text-[9px] font-medium text-sh-text-muted/70 uppercase tracking-widest shrink-0">
                    {periodHeading(period, penalties[0]?.periodType)}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                <div className="space-y-1">
                  {penalties.map((pen) => (
                    <div
                      key={pen.eventId}
                      className="flex items-start gap-2 text-xs"
                    >
                      <Image
                        src={`/team-logos/${teamAbbrevFor(pen.teamId)}.png`}
                        alt={teamAbbrevFor(pen.teamId)}
                        width={13}
                        height={13}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sh-text leading-snug">
                          <span className="font-semibold">
                            {pen.playerName}
                          </span>
                          <span className="text-sh-text-muted">
                            {" "}— {pen.infraction}
                          </span>
                        </div>
                        <div className="text-[10px] text-sh-text-muted flex items-center gap-1.5">
                          <span>{pen.minutes} min</span>
                          <span className="opacity-40">·</span>
                          <span className="tabular-nums">
                            {pen.timeInPeriod}
                          </span>
                          {pen.drawnByName && (
                            <>
                              <span className="opacity-40">·</span>
                              <span>Drawn by {pen.drawnByName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
