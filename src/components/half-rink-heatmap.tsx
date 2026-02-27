"use client";

import { useMemo } from "react";
import { HalfRink } from "@/components/half-rink";
import { nhlToSvg, normalizeToOffensiveZone } from "@/utils/coordinates";
import { createHexbinGenerator, createColorScale } from "@/utils/hexbin-config";
import type { ShotEventRow } from "@/types/database";

interface HalfRinkHeatmapProps {
  shots: ShotEventRow[];
  teamAbbrev: string;
  teamName: string;
  hexRadius?: number;
}

export function HalfRinkHeatmap({
  shots,
  teamAbbrev,
  teamName,
  hexRadius = 4,
}: HalfRinkHeatmapProps) {
  const svgPoints = useMemo(() => {
    return shots.map((shot) => {
      const [sx, sy] = nhlToSvg(shot.x_coord, shot.y_coord);
      return normalizeToOffensiveZone(sx, sy);
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

  return (
    <div className="flex flex-col items-center">
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
            />
          ))}
        </g>
      </HalfRink>
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
