"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { FullRink } from "@/components/full-rink";
import { nhlToSvg, orientToAttackRight } from "@/utils/coordinates";
import {
  createAlignedFlatTopGenerator,
  createColorScale,
} from "@/utils/hexbin-config";
import { SHOT_TYPE_CODES } from "@/utils/shot-types";
import type { ShotEventRow } from "@/types/database";
import type { ShotEnrichment } from "@/services/nhl-api";

interface FullRinkHeatmapProps {
  shots: ShotEventRow[];
  teamId: number;
  homeTeamId: number;
  teamAbbrev: string;
  teamName: string;
  shotEnrichment: Record<number, ShotEnrichment>;
  hexRadius?: number;
  globalMaxCount?: number;
}

/** Per-shot detail for the tooltip */
interface ShotDetail {
  playerName: string;
  strength: string;
  time: string;
  period: string;
  isGoal: boolean;
}

interface TooltipData {
  total: number;
  details: ShotDetail[];
  x: number;
  y: number;
}

function periodLabel(p: number, periodType: string): string {
  if (periodType === "SO") return "SO";
  if (p > 3) return p === 4 ? "OT" : `${p - 3}OT`;
  return `${p}P`;
}

type ShotPoint = [number, number] & { _shot: ShotEventRow };

export function FullRinkHeatmap({
  shots,
  teamId,
  homeTeamId,
  teamAbbrev,
  teamName,
  shotEnrichment,
  hexRadius = 4,
  globalMaxCount,
}: FullRinkHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const svgPoints = useMemo(() => {
    return shots.map((shot) => {
      const [ox, oy] = orientToAttackRight(
        shot.x_coord,
        shot.y_coord,
        teamId,
        homeTeamId,
        shot.home_team_defending_side,
      );
      const [sx, sy] = nhlToSvg(ox, oy);
      const point = [sx, sy] as ShotPoint;
      point._shot = shot;
      return point;
    });
  }, [shots, teamId, homeTeamId]);

  // Separate goal points for marker overlay
  const goalPoints = useMemo(
    () => svgPoints.filter((p) => p._shot.type_code === SHOT_TYPE_CODES.GOAL),
    [svgPoints],
  );

  const hexGenerator = useMemo(
    () => createAlignedFlatTopGenerator(hexRadius),
    [hexRadius],
  );

  const bins = useMemo(
    () => hexGenerator(svgPoints),
    [hexGenerator, svgPoints],
  );

  const shrunkHexPath = useMemo(
    () => hexGenerator.hexPath(0.96),
    [hexGenerator],
  );

  const localMaxCount = useMemo(
    () => Math.max(1, ...bins.map((b: { length: number }) => b.length)),
    [bins],
  );

  const effectiveMax = globalMaxCount ?? localMaxCount;
  const colorScale = useMemo(() => createColorScale(effectiveMax), [effectiveMax]);

  const buildDetails = useCallback(
    (binShots: ShotPoint[]): ShotDetail[] =>
      binShots.map((p) => {
        const s = p._shot;
        const enrichment = shotEnrichment[s.event_id];
        return {
          playerName: enrichment?.playerName ?? "Unknown",
          strength: enrichment?.strength ?? "EV",
          time: s.time_in_period,
          period: periodLabel(s.period_number, s.period_type),
          isGoal: s.type_code === SHOT_TYPE_CODES.GOAL,
        };
      }),
    [shotEnrichment],
  );

  const handleMouseEnter = useCallback(
    (bin: (typeof bins)[number], event: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const binShots = bin as unknown as ShotPoint[];

      setTooltip({
        total: bin.length,
        details: buildDetails(binShots),
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    },
    [buildDetails],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!tooltip || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip((prev) =>
        prev
          ? {
              ...prev,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            }
          : null,
      );
    },
    [tooltip],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const STRENGTH_COLORS: Record<string, string> = {
    EV: "text-sh-text-muted",
    PP: "text-amber-400",
    PK: "text-sky-400",
  };

  return (
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        className="relative w-full"
        onMouseMove={handleMouseMove}
      >
        <FullRink>
          {/* Hex density layer — flat-top, two-stroke premium borders */}
          <g className="hex-heatmap">
            {bins.map((bin) => {
              const intensity = bin.length / effectiveMax;
              const opacity = 0.5 + 0.45 * intensity;
              return (
                <g
                  key={`${bin.x}-${bin.y}`}
                  className="hex-cell"
                  transform={`translate(${bin.x},${bin.y})`}
                  onMouseEnter={(e) => handleMouseEnter(bin, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Fill + outer light stroke */}
                  <path
                    d={shrunkHexPath}
                    fill={colorScale(bin.length)}
                    fillOpacity={opacity}
                    className="hex-outer"
                  />
                  {/* Inner dark stroke for edge sharpness */}
                  <path d={shrunkHexPath} className="hex-inner" />
                </g>
              );
            })}
          </g>

          {/* Goal markers layer */}
          <g className="goal-markers">
            {goalPoints.map((pt) => (
              <g
                key={pt._shot.event_id}
                className="goal-marker"
                onMouseEnter={(e) => {
                  const container = containerRef.current;
                  if (!container) return;
                  const rect = container.getBoundingClientRect();
                  setTooltip({
                    total: 1,
                    details: buildDetails([pt]),
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
                onMouseLeave={handleMouseLeave}
              >
                {/* Pulse ring */}
                <circle
                  cx={pt[0]}
                  cy={pt[1]}
                  r={2.5}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={0.3}
                  className="goal-ring"
                />
                {/* Diamond marker */}
                <path
                  d={`M ${pt[0]} ${pt[1] - 1.2} L ${pt[0] + 1} ${pt[1]} L ${pt[0]} ${pt[1] + 1.2} L ${pt[0] - 1} ${pt[1]} Z`}
                  fill="#34d399"
                  fillOpacity={0.9}
                  stroke="#ffffff"
                  strokeWidth={0.2}
                  strokeOpacity={0.5}
                  className="cursor-pointer"
                />
              </g>
            ))}
          </g>
        </FullRink>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-50 glass-tooltip px-3 py-2 text-xs min-w-[160px] max-w-[260px]"
            style={{
              left: Math.min(
                tooltip.x + 14,
                (containerRef.current?.clientWidth ?? 400) - 200,
              ),
              top: tooltip.y - 10,
              transform: "translateY(-100%)",
            }}
          >
            <div className="font-semibold text-[12px] text-sh-text mb-1 tabular-nums">
              {tooltip.total} shot{tooltip.total !== 1 ? "s" : ""}
            </div>
            <div className="flex flex-col gap-1">
              {tooltip.details.map((d, i) => (
                <div
                  key={i}
                  className="flex items-baseline gap-1.5 leading-tight"
                >
                  {d.isGoal && (
                    <span className="text-emerald-400 text-[9px] font-bold shrink-0">
                      G
                    </span>
                  )}
                  <span className={`font-semibold ${d.isGoal ? "text-emerald-300" : "text-sh-text"} truncate`}>
                    {d.playerName}
                  </span>
                  <span className={`text-[10px] font-medium shrink-0 ${STRENGTH_COLORS[d.strength] ?? "text-sh-text-muted"}`}>
                    {d.strength}
                  </span>
                  <span className="text-sh-text-muted tabular-nums text-[10px] shrink-0 ml-auto">
                    {d.time} {d.period}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Team label */}
      <div className="flex items-center gap-1.5 mt-2">
        <img
          src={`/team-logos/${teamAbbrev}.png`}
          alt={teamName}
          width={20}
          height={20}
        />
        <span className="text-[11px] font-semibold text-sh-text tracking-wider uppercase">
          {teamAbbrev}
        </span>
        <span className="text-[10px] tabular-nums font-medium text-sh-text-muted">
          {shots.length} SOG
        </span>
      </div>
    </div>
  );
}
