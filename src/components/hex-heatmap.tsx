"use client";

import { useState, useMemo, useCallback } from "react";
import { HalfRinkHeatmap } from "@/components/half-rink-heatmap";
import { ShotToggle } from "@/components/shot-toggle";
import { useShotEvents } from "@/hooks/use-shot-events";
import { SHOT_TYPE_CODES } from "@/utils/shot-types";
import type { ShotEventRow } from "@/types/database";

interface HexHeatmapProps {
  gameId: number;
  initialShots: ShotEventRow[];
  homeTeamAbbrev: string;
  awayTeamAbbrev: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: number;
  awayTeamId: number;
}

export function HexHeatmap({
  gameId,
  initialShots,
  homeTeamAbbrev,
  awayTeamAbbrev,
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
}: HexHeatmapProps) {
  const [showGoalsOnly, setShowGoalsOnly] = useState(false);
  const shots = useShotEvents(gameId, initialShots);

  const filteredShots = useMemo(() => {
    if (showGoalsOnly) {
      return shots.filter((s) => s.type_code === SHOT_TYPE_CODES.GOAL);
    }
    return shots;
  }, [shots, showGoalsOnly]);

  const awayShots = useMemo(
    () => filteredShots.filter((s) => s.team_id === awayTeamId),
    [filteredShots, awayTeamId]
  );

  const homeShots = useMemo(
    () => filteredShots.filter((s) => s.team_id === homeTeamId),
    [filteredShots, homeTeamId]
  );

  const handleToggle = useCallback((goalsOnly: boolean) => {
    setShowGoalsOnly(goalsOnly);
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <ShotToggle isGoalsOnly={showGoalsOnly} onToggle={handleToggle} />
        <span className="text-sm opacity-70">
          {filteredShots.length} {showGoalsOnly ? "goals" : "shots"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HalfRinkHeatmap
          shots={awayShots}
          teamAbbrev={awayTeamAbbrev}
          teamName={awayTeamName}
        />
        <HalfRinkHeatmap
          shots={homeShots}
          teamAbbrev={homeTeamAbbrev}
          teamName={homeTeamName}
        />
      </div>
    </div>
  );
}
