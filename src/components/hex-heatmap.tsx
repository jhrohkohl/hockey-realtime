"use client";

import { useState, useMemo, useCallback } from "react";
import { FullRinkHeatmap } from "@/components/full-rink-heatmap";
import { HeatmapToolbar } from "@/components/heatmap-toolbar";
import { HeatmapLegend } from "@/components/heatmap-legend";
import { GameStats } from "@/components/game-stats";
import { useShotEvents } from "@/hooks/use-shot-events";
import { SHOT_TYPE_CODES } from "@/utils/shot-types";
import { nhlToSvg, orientToAttackRight } from "@/utils/coordinates";
import { createAlignedFlatTopGenerator } from "@/utils/hexbin-config";
import { timeToSeconds } from "@/utils/time";
import type { ShiftRow, ShotEventRow } from "@/types/database";
import type { RosterPlayer } from "@/types/roster";
import type {
  GoalEvent,
  PenaltyEvent,
  ShotEnrichment,
  ShotStrength,
} from "@/services/nhl-api";

type HexSize = "S" | "M" | "L";

const HEX_RADII: Record<HexSize, number> = { S: 3, M: 4, L: 6 };

interface ShiftInterval {
  period: number;
  startSeconds: number;
  endSeconds: number;
}

interface HexHeatmapProps {
  gameId: number;
  initialShots: ShotEventRow[];
  shifts: ShiftRow[];
  roster: RosterPlayer[];
  goalEvents: GoalEvent[];
  penaltyEvents: PenaltyEvent[];
  shotEnrichment: Record<number, ShotEnrichment>;
  homeTeamAbbrev: string;
  awayTeamAbbrev: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: number;
  awayTeamId: number;
}

/** Shots on goal = goals + saved shots (excludes missed/blocked) */
function isShotOnGoal(s: ShotEventRow): boolean {
  return (
    s.type_code === SHOT_TYPE_CODES.GOAL ||
    s.type_code === SHOT_TYPE_CODES.SHOT_ON_GOAL
  );
}

export function HexHeatmap({
  gameId,
  initialShots,
  shifts,
  roster,
  goalEvents,
  penaltyEvents,
  shotEnrichment,
  homeTeamAbbrev,
  awayTeamAbbrev,
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
}: HexHeatmapProps) {
  const shots = useShotEvents(gameId, initialShots);

  // ── Filter state ──────────────────────────────────────
  const [selectedPeriods, setSelectedPeriods] = useState<Set<number>>(
    new Set(),
  );
  const [showGoalsOnly, setShowGoalsOnly] = useState(false);
  const [selectedStrengths, setSelectedStrengths] = useState<Set<ShotStrength>>(
    new Set(),
  );
  const [hexSize, setHexSize] = useState<HexSize>("M");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // ── Derived data ──────────────────────────────────────
  const availablePeriods = useMemo(() => {
    const periods = new Set(shots.map((s) => s.period_number));
    return Array.from(periods).sort((a, b) => a - b);
  }, [shots]);

  // SOG only (for heatmap)
  const shotsOnGoal = useMemo(
    () => shots.filter(isShotOnGoal),
    [shots],
  );

  // Precompute shift intervals for the selected player
  const playerShiftIntervals = useMemo<ShiftInterval[] | null>(() => {
    if (selectedPlayerId === null) return null;
    return shifts
      .filter((s) => s.player_id === selectedPlayerId)
      .map((s) => ({
        period: s.period,
        startSeconds: s.start_seconds,
        endSeconds: s.end_seconds,
      }));
  }, [shifts, selectedPlayerId]);

  const filtered = useMemo(() => {
    let result = shotsOnGoal;

    if (selectedPeriods.size > 0) {
      result = result.filter((s) => selectedPeriods.has(s.period_number));
    }

    if (showGoalsOnly) {
      result = result.filter((s) => s.type_code === SHOT_TYPE_CODES.GOAL);
    }

    if (selectedStrengths.size > 0) {
      result = result.filter((s) => {
        const enrichment = shotEnrichment[s.event_id];
        return enrichment ? selectedStrengths.has(enrichment.strength) : true;
      });
    }

    // Player filter: show only the selected player's own shots on goal
    if (selectedPlayerId !== null) {
      result = result.filter((s) => s.shooter_player_id === selectedPlayerId);
    }

    return result;
  }, [shotsOnGoal, selectedPeriods, showGoalsOnly, selectedStrengths, shotEnrichment, selectedPlayerId]);

  const awayShots = useMemo(
    () => filtered.filter((s) => s.team_id === awayTeamId),
    [filtered, awayTeamId],
  );

  const homeShots = useMemo(
    () => filtered.filter((s) => s.team_id === homeTeamId),
    [filtered, homeTeamId],
  );

  // Compute global max bin count across both rinks so they share the same
  // color scale — a 1-shot hex looks the same on both sides.
  const globalMaxBinCount = useMemo(() => {
    const radius = HEX_RADII[hexSize];
    const gen = createAlignedFlatTopGenerator(radius);

    const toPoints = (teamShots: ShotEventRow[], tId: number) =>
      teamShots.map((s) => {
        const [ox, oy] = orientToAttackRight(
          s.x_coord, s.y_coord, tId, homeTeamId, s.home_team_defending_side,
        );
        return nhlToSvg(ox, oy) as [number, number];
      });

    const awayBins = gen(toPoints(awayShots, awayTeamId));
    const homeBins = gen(toPoints(homeShots, homeTeamId));
    const awayMax = awayBins.length > 0 ? Math.max(...awayBins.map((b) => b.length)) : 0;
    const homeMax = homeBins.length > 0 ? Math.max(...homeBins.map((b) => b.length)) : 0;
    return Math.max(1, awayMax, homeMax);
  }, [awayShots, homeShots, awayTeamId, homeTeamId, hexSize]);

  const handlePeriodsChange = useCallback((p: Set<number>) => {
    setSelectedPeriods(p);
  }, []);

  const handleShowGoalsOnlyChange = useCallback((v: boolean) => {
    setShowGoalsOnly(v);
  }, []);

  const handleStrengthsChange = useCallback((s: Set<ShotStrength>) => {
    setSelectedStrengths(s);
  }, []);

  const handleHexSizeChange = useCallback((s: HexSize) => {
    setHexSize(s);
  }, []);

  const handlePlayerChange = useCallback((playerId: number | null) => {
    setSelectedPlayerId(playerId);
  }, []);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <HeatmapToolbar
        roster={roster}
        selectedPlayerId={selectedPlayerId}
        onPlayerChange={handlePlayerChange}
        homeTeamId={homeTeamId}
        homeTeamAbbrev={homeTeamAbbrev}
        awayTeamAbbrev={awayTeamAbbrev}
        availablePeriods={availablePeriods}
        selectedPeriods={selectedPeriods}
        onPeriodsChange={handlePeriodsChange}
        showGoalsOnly={showGoalsOnly}
        onShowGoalsOnlyChange={handleShowGoalsOnlyChange}
        selectedStrengths={selectedStrengths}
        onStrengthsChange={handleStrengthsChange}
        hexSize={hexSize}
        onHexSizeChange={handleHexSizeChange}
      />

      {/* Rinks */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FullRinkHeatmap
            shots={awayShots}
            teamId={awayTeamId}
            homeTeamId={homeTeamId}
            teamAbbrev={awayTeamAbbrev}
            teamName={awayTeamName}
            shotEnrichment={shotEnrichment}
            hexRadius={HEX_RADII[hexSize]}
            globalMaxCount={globalMaxBinCount}
          />
          <FullRinkHeatmap
            shots={homeShots}
            teamId={homeTeamId}
            homeTeamId={homeTeamId}
            teamAbbrev={homeTeamAbbrev}
            teamName={homeTeamName}
            shotEnrichment={shotEnrichment}
            hexRadius={HEX_RADII[hexSize]}
            globalMaxCount={globalMaxBinCount}
          />
        </div>

        {/* Legend */}
        <div className="flex justify-end mt-2">
          <HeatmapLegend maxCount={globalMaxBinCount} />
        </div>
      </div>

      {/* Shot Summary + Goals */}
      <GameStats
        shots={shots}
        goalEvents={goalEvents}
        penaltyEvents={penaltyEvents}
        homeTeamId={homeTeamId}
        awayTeamId={awayTeamId}
        homeTeamAbbrev={homeTeamAbbrev}
        awayTeamAbbrev={awayTeamAbbrev}
      />
    </div>
  );
}
