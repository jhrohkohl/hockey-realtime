"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { HalfRink } from "@/components/half-rink";
import { nhlToSvg, normalizeToOffensiveZone } from "@/utils/coordinates";
import { createHexbinGenerator, createColorScale } from "@/utils/hexbin-config";
import { SHOT_TYPE_CODES } from "@/utils/shot-types";
import type { ShotEventRow } from "@/types/database";

interface HalfRinkHeatmapProps {
  shots: ShotEventRow[];
  teamAbbrev: string;
  teamName: string;
  hexRadius?: number;
}

interface TooltipData {
  total: number;
  goals: number;
  shotsOnGoal: number;
  missed: number;
  shotTypes: Record<string, number>;
  x: number;
  y: number;
}

const SHOT_TYPE_LABELS: Record<string, string> = {
  wrist: "Wrist",
  slap: "Slap",
  snap: "Snap",
  "tip-in": "Tip-In",
  deflected: "Deflected",
  backhand: "Backhand",
  "wrap-around": "Wrap-Around",
  bat: "Batted",
  poke: "Poke",
  cradle: "Cradle",
};

type ShotPoint = [number, number] & { _shot: ShotEventRow };

export function HalfRinkHeatmap({
  shots,
  teamAbbrev,
  teamName,
  hexRadius = 4,
}: HalfRinkHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const svgPoints = useMemo(() => {
    return shots.map((shot) => {
      const [sx, sy] = nhlToSvg(shot.x_coord, shot.y_coord);
      const [nx, ny] = normalizeToOffensiveZone(sx, sy);
      const point = [nx, ny] as ShotPoint;
      point._shot = shot;
      return point;
    });
  }, [shots]);

  const hexbinGenerator = useMemo(
    () => createHexbinGenerator(hexRadius),
    [hexRadius]
  );

  const bins = useMemo(
    () => hexbinGenerator(svgPoints),
    [hexbinGenerator, svgPoints]
  );

  const maxCount = useMemo(
    () => Math.max(1, ...bins.map((b) => b.length)),
    [bins]
  );

  const colorScale = useMemo(() => createColorScale(maxCount), [maxCount]);

  const handleMouseEnter = useCallback(
    (bin: (typeof bins)[number], event: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const binShots = bin as unknown as ShotPoint[];
      const goals = binShots.filter(
        (p) => p._shot.type_code === SHOT_TYPE_CODES.GOAL
      ).length;
      const shotsOnGoal = binShots.filter(
        (p) => p._shot.type_code === SHOT_TYPE_CODES.SHOT_ON_GOAL
      ).length;
      const missed = binShots.filter(
        (p) => p._shot.type_code === SHOT_TYPE_CODES.MISSED_SHOT
      ).length;

      const shotTypes: Record<string, number> = {};
      for (const p of binShots) {
        const st = p._shot.shot_type ?? "unknown";
        shotTypes[st] = (shotTypes[st] ?? 0) + 1;
      }

      setTooltip({ total: bin.length, goals, shotsOnGoal, missed, shotTypes, x, y });
    },
    []
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!tooltip || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip((prev) =>
        prev
          ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top }
          : null
      );
    },
    [tooltip]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        className="relative w-full"
        onMouseMove={handleMouseMove}
      >
        <HalfRink>
          <g className="hex-heatmap">
            {bins.map((bin) => (
              <path
                key={`${bin.x}-${bin.y}`}
                d={hexbinGenerator.hexagon()!}
                transform={`translate(${bin.x},${bin.y})`}
                fill={colorScale(bin.length)}
                fillOpacity={0.85}
                stroke={colorScale(bin.length)}
                strokeWidth={0.15}
                className="cursor-pointer transition-opacity hover:opacity-100"
                opacity={0.85}
                onMouseEnter={(e) => handleMouseEnter(bin, e)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </g>
        </HalfRink>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-50 bg-base-100 border border-base-content/20 rounded-lg px-3 py-2 shadow-xl text-xs min-w-[140px]"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 10,
              transform: "translateY(-100%)",
            }}
          >
            <div className="font-bold text-sm mb-1">
              {tooltip.total} shot{tooltip.total !== 1 ? "s" : ""}
            </div>
            <div className="flex flex-col gap-0.5 text-base-content/80">
              {tooltip.goals > 0 && (
                <span className="text-success font-semibold">
                  {tooltip.goals} goal{tooltip.goals !== 1 ? "s" : ""}
                </span>
              )}
              {tooltip.shotsOnGoal > 0 && (
                <span>{tooltip.shotsOnGoal} on goal</span>
              )}
              {tooltip.missed > 0 && (
                <span className="text-base-content/50">
                  {tooltip.missed} missed
                </span>
              )}
            </div>
            {Object.keys(tooltip.shotTypes).length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-base-content/10">
                {Object.entries(tooltip.shotTypes)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex justify-between gap-3">
                      <span className="text-base-content/60">
                        {SHOT_TYPE_LABELS[type] ?? type}
                      </span>
                      <span>{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <img
          src={`/team-logos/${teamAbbrev}.png`}
          alt={teamName}
          width={28}
          height={28}
        />
        <span className="text-sm font-bold text-white">{teamAbbrev}</span>
      </div>
    </div>
  );
}
