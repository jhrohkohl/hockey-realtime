"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLeagueViewState } from "@/hooks/use-league-view-state";
import { TeamSelectionCard } from "@/components/team-selection-card";
import { FiltersBar } from "@/components/filters-bar";
import { ChartCard, ChartLegend } from "@/components/chart-card";
import { HowToRead } from "@/components/how-to-read";
import {
  LeagueAbsoluteHeatmap,
  LeagueDifferenceHeatmap,
} from "@/components/league-unified-heatmap";
import {
  buildOrientedPoints,
  computeVolumeBins,
  computeShootingPctBins,
  computeVolumeDifference,
  computeShootingPctDifference,
  maxBinCount,
  maxDifferenceDelta,
} from "@/utils/league-hex-processing";
import { createColorScale, createDivergingColorScale } from "@/utils/hexbin-config";
import type {
  LeagueShotRow,
  LeagueShotPoint,
  AvailableTeam,
  ProcessedBin,
  DifferenceBin,
} from "@/types/league";

// ── Types & constants ──────────────────────────────────────────────

interface LeagueHeatmapClientProps {
  shots: LeagueShotRow[];
  homeTeamMap: Record<number, number>;
  availableTeams: AvailableTeam[];
  from: string;
  to: string;
  seasonStartDate: string;
  teamIdToAbbrev: Record<number, string>;
  teamGameCounts: Record<string, number>;
  totalGameCount: number;
}

const HEX_RADII_MAP: Record<"S" | "M" | "L", number> = { S: 3, M: 4, L: 6 };
const LEGEND_STEPS = 8;
const PCT_MAX = 25;

/** Mirror SVG points to the defensive zone (flip around center ice). */
function mirrorToDefensiveZone(
  points: LeagueShotPoint[],
): LeagueShotPoint[] {
  return points.map((pt) => {
    const mirrored = [200 - pt[0], 85 - pt[1]] as LeagueShotPoint;
    mirrored._shot = pt._shot;
    return mirrored;
  });
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
        {title}
      </h3>
      <p className="text-[12px] text-white/25 mt-0.5">{subtitle}</p>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────

export function LeagueHeatmapClient({
  shots,
  homeTeamMap,
  availableTeams,
  from,
  to,
  seasonStartDate,
  teamIdToAbbrev,
  teamGameCounts,
  totalGameCount,
}: LeagueHeatmapClientProps) {
  const router = useRouter();
  const state = useLeagueViewState();
  const {
    view,
    baseline,
    scope,
    hexSize,
    strengthFilter,
    minSample,
    hideLowSample,
    teamA,
    teamB,
  } = state;

  const hexRadius = HEX_RADII_MAP[hexSize];

  // ── Date range navigation (URL params) ──────────────────────────

  const handleDateRangeChange = useCallback(
    (newFrom: string, newTo: string) => {
      const params = new URLSearchParams();
      params.set("from", newFrom);
      params.set("to", newTo);
      router.push(`/league?${params.toString()}`);
    },
    [router],
  );

  // ── Filter shots by strength ────────────────────────────────────

  const filteredShots = useMemo(() => {
    if (strengthFilter === "ALL") return shots;
    return shots.filter((s) => s.strength === strengthFilter);
  }, [shots, strengthFilter]);

  // ── Resolve teamA/teamB to team IDs ─────────────────────────────

  const teamAIds = useMemo(() => {
    if (!teamA) return new Set<number>();
    return new Set(
      Object.entries(teamIdToAbbrev)
        .filter(([, abbrev]) => abbrev === teamA)
        .map(([id]) => Number(id)),
    );
  }, [teamA, teamIdToAbbrev]);

  const teamBIds = useMemo(() => {
    if (!teamB) return new Set<number>();
    return new Set(
      Object.entries(teamIdToAbbrev)
        .filter(([, abbrev]) => abbrev === teamB)
        .map(([id]) => Number(id)),
    );
  }, [teamB, teamIdToAbbrev]);

  // ══════════════════════════════════════════════════════════════════
  // OFFENSE — shots BY the team
  // ══════════════════════════════════════════════════════════════════

  const teamAShots = useMemo(() => {
    if (!teamA || teamAIds.size === 0) return [];
    return filteredShots.filter((s) => teamAIds.has(s.team_id));
  }, [filteredShots, teamA, teamAIds]);

  const teamBShots = useMemo(() => {
    if (!teamB || teamBIds.size === 0) return [];
    return filteredShots.filter((s) => teamBIds.has(s.team_id));
  }, [filteredShots, teamB, teamBIds]);

  const allPoints = useMemo(
    () => buildOrientedPoints(filteredShots, homeTeamMap),
    [filteredShots, homeTeamMap],
  );

  const teamAPoints = useMemo(
    () => buildOrientedPoints(teamAShots, homeTeamMap),
    [teamAShots, homeTeamMap],
  );

  const teamBPoints = useMemo(
    () => buildOrientedPoints(teamBShots, homeTeamMap),
    [teamBShots, homeTeamMap],
  );

  // ══════════════════════════════════════════════════════════════════
  // DEFENSE — shots AGAINST the team (opponent shots in their games)
  // ══════════════════════════════════════════════════════════════════

  const teamAGameIds = useMemo(
    () => new Set(teamAShots.map((s) => s.game_id)),
    [teamAShots],
  );

  const teamADefenseShots = useMemo(() => {
    if (teamAGameIds.size === 0) return [];
    return filteredShots.filter(
      (s) => teamAGameIds.has(s.game_id) && !teamAIds.has(s.team_id),
    );
  }, [filteredShots, teamAGameIds, teamAIds]);

  const teamADefensePoints = useMemo(
    () => mirrorToDefensiveZone(buildOrientedPoints(teamADefenseShots, homeTeamMap)),
    [teamADefenseShots, homeTeamMap],
  );

  const teamBGameIds = useMemo(
    () => new Set(teamBShots.map((s) => s.game_id)),
    [teamBShots],
  );

  const teamBDefenseShots = useMemo(() => {
    if (teamBGameIds.size === 0) return [];
    return filteredShots.filter(
      (s) => teamBGameIds.has(s.game_id) && !teamBIds.has(s.team_id),
    );
  }, [filteredShots, teamBGameIds, teamBIds]);

  const teamBDefensePoints = useMemo(
    () => mirrorToDefensiveZone(buildOrientedPoints(teamBDefenseShots, homeTeamMap)),
    [teamBDefenseShots, homeTeamMap],
  );

  // ── Game counts for normalization ───────────────────────────────

  const teamAGameCount = teamA ? (teamGameCounts[teamA] ?? 1) : totalGameCount;
  const teamBGameCount = teamB ? (teamGameCounts[teamB] ?? 1) : totalGameCount;

  // ── Derived scope flags ─────────────────────────────────────────

  const isComparison = scope === "team-vs-league" || scope === "team-vs-team";
  const showDefense = scope !== "league";

  // ══════════════════════════════════════════════════════════════════
  // OFFENSE BINS
  // ══════════════════════════════════════════════════════════════════

  const primaryPoints = scope === "league" ? allPoints : teamAPoints;
  const primaryGameCount = scope === "league" ? totalGameCount : teamAGameCount;

  const volumeBins = useMemo(
    () => computeVolumeBins(primaryPoints, hexRadius, primaryGameCount, minSample),
    [primaryPoints, hexRadius, primaryGameCount, minSample],
  );

  const shootingPctBins = useMemo(
    () => computeShootingPctBins(primaryPoints, hexRadius, minSample),
    [primaryPoints, hexRadius, minSample],
  );

  // Offense comparison bins
  const comparisonPoints = scope === "team-vs-league" ? allPoints : teamBPoints;
  const comparisonGameCount =
    scope === "team-vs-league" ? totalGameCount : teamBGameCount;

  const compOffVolBinsA = useMemo(
    () =>
      isComparison
        ? computeVolumeBins(teamAPoints, hexRadius, teamAGameCount, minSample)
        : [],
    [isComparison, teamAPoints, hexRadius, teamAGameCount, minSample],
  );

  const compOffVolBinsB = useMemo(
    () =>
      isComparison
        ? computeVolumeBins(comparisonPoints, hexRadius, comparisonGameCount, minSample)
        : [],
    [isComparison, comparisonPoints, hexRadius, comparisonGameCount, minSample],
  );

  const compOffPctBinsA = useMemo(
    () =>
      isComparison
        ? computeShootingPctBins(teamAPoints, hexRadius, minSample)
        : [],
    [isComparison, teamAPoints, hexRadius, minSample],
  );

  const compOffPctBinsB = useMemo(
    () =>
      isComparison
        ? computeShootingPctBins(comparisonPoints, hexRadius, minSample)
        : [],
    [isComparison, comparisonPoints, hexRadius, minSample],
  );

  // Offense difference bins
  const offVolDiff = useMemo(
    () =>
      isComparison
        ? computeVolumeDifference(compOffVolBinsA, compOffVolBinsB, minSample)
        : [],
    [isComparison, compOffVolBinsA, compOffVolBinsB, minSample],
  );

  const offPctDiff = useMemo(
    () =>
      isComparison
        ? computeShootingPctDifference(compOffPctBinsA, compOffPctBinsB, minSample)
        : [],
    [isComparison, compOffPctBinsA, compOffPctBinsB, minSample],
  );

  // ══════════════════════════════════════════════════════════════════
  // DEFENSE BINS
  // ══════════════════════════════════════════════════════════════════

  // Team A defense absolute bins (used in team view + as "A" side of comparison)
  const defVolumeBins = useMemo(
    () =>
      showDefense
        ? computeVolumeBins(teamADefensePoints, hexRadius, teamAGameCount, minSample)
        : [],
    [showDefense, teamADefensePoints, hexRadius, teamAGameCount, minSample],
  );

  const defPctBins = useMemo(
    () =>
      showDefense
        ? computeShootingPctBins(teamADefensePoints, hexRadius, minSample)
        : [],
    [showDefense, teamADefensePoints, hexRadius, minSample],
  );

  // Defense baseline bins (league = mirrored allPoints, team-vs-team = teamBDefensePoints)
  const allPointsMirrored = useMemo(
    () => mirrorToDefensiveZone(allPoints),
    [allPoints],
  );
  const defBaselinePoints =
    scope === "team-vs-league" ? allPointsMirrored : teamBDefensePoints;
  const defBaselineGameCount =
    scope === "team-vs-league" ? totalGameCount : teamBGameCount;

  const defBaselineVolBins = useMemo(
    () =>
      isComparison
        ? computeVolumeBins(defBaselinePoints, hexRadius, defBaselineGameCount, minSample)
        : [],
    [isComparison, defBaselinePoints, hexRadius, defBaselineGameCount, minSample],
  );

  const defBaselinePctBins = useMemo(
    () =>
      isComparison
        ? computeShootingPctBins(defBaselinePoints, hexRadius, minSample)
        : [],
    [isComparison, defBaselinePoints, hexRadius, minSample],
  );

  // Defense difference bins
  const defVolDiff = useMemo(
    () =>
      isComparison
        ? computeVolumeDifference(defVolumeBins, defBaselineVolBins, minSample)
        : [],
    [isComparison, defVolumeBins, defBaselineVolBins, minSample],
  );

  const defPctDiff = useMemo(
    () =>
      isComparison
        ? computeShootingPctDifference(defPctBins, defBaselinePctBins, minSample)
        : [],
    [isComparison, defPctBins, defBaselinePctBins, minSample],
  );

  // ══════════════════════════════════════════════════════════════════
  // MAX VALUES & COLOR SCALES
  // ══════════════════════════════════════════════════════════════════

  // Offense
  const offVolMax = useMemo(() => maxBinCount(volumeBins), [volumeBins]);
  const offDiffMax = useMemo(() => maxDifferenceDelta(offVolDiff), [offVolDiff]);

  const offVolumeColorFn = useMemo(() => {
    const scale = createColorScale(offVolMax);
    return (bin: ProcessedBin) => scale(bin.count);
  }, [offVolMax]);

  const offVolumeOpacityFn = useCallback(
    (bin: ProcessedBin) => {
      const intensity = bin.count / Math.max(1, offVolMax);
      return bin.lowSample ? 0.25 : 0.5 + 0.45 * intensity;
    },
    [offVolMax],
  );

  const offDivergeColorFn = useMemo(() => {
    const scale = createDivergingColorScale(offDiffMax);
    return (bin: DifferenceBin) => scale(bin.delta);
  }, [offDiffMax]);

  // Defense
  const defVolMax = useMemo(() => maxBinCount(defVolumeBins), [defVolumeBins]);
  const defDiffMax = useMemo(() => maxDifferenceDelta(defVolDiff), [defVolDiff]);

  const defVolumeColorFn = useMemo(() => {
    const scale = createColorScale(defVolMax);
    return (bin: ProcessedBin) => scale(bin.count);
  }, [defVolMax]);

  const defVolumeOpacityFn = useCallback(
    (bin: ProcessedBin) => {
      const intensity = bin.count / Math.max(1, defVolMax);
      return bin.lowSample ? 0.25 : 0.5 + 0.45 * intensity;
    },
    [defVolMax],
  );

  const defDivergeColorFn = useMemo(() => {
    const scale = createDivergingColorScale(defDiffMax);
    return (bin: DifferenceBin) => scale(bin.delta);
  }, [defDiffMax]);

  // Shared shooting % scales (fixed 0–25% range)
  const pctColorFn = useMemo(() => {
    const scale = createColorScale(PCT_MAX);
    return (bin: ProcessedBin) => (bin.goals > 0 ? scale(bin.shootingPct) : "#334155");
  }, []);

  const pctOpacityFn = useCallback(
    (bin: ProcessedBin) => {
      if (bin.goals === 0) return 0.08;
      const intensity = Math.min(bin.shootingPct / PCT_MAX, 1);
      return bin.lowSample ? 0.25 : 0.5 + 0.45 * intensity;
    },
    [],
  );

  // ── Legend color arrays ─────────────────────────────────────────

  const offVolLegendColors = useMemo(() => {
    const scale = createColorScale(offVolMax);
    return Array.from({ length: LEGEND_STEPS }, (_, i) =>
      scale((i / (LEGEND_STEPS - 1)) * offVolMax),
    );
  }, [offVolMax]);

  const defVolLegendColors = useMemo(() => {
    const scale = createColorScale(defVolMax);
    return Array.from({ length: LEGEND_STEPS }, (_, i) =>
      scale((i / (LEGEND_STEPS - 1)) * defVolMax),
    );
  }, [defVolMax]);

  const pctLegendColors = useMemo(() => {
    const scale = createColorScale(PCT_MAX);
    return Array.from({ length: LEGEND_STEPS }, (_, i) =>
      scale((i / (LEGEND_STEPS - 1)) * PCT_MAX),
    );
  }, []);

  const offDivLegendColors = useMemo(() => {
    const scale = createDivergingColorScale(offDiffMax);
    return Array.from({ length: LEGEND_STEPS }, (_, i) =>
      scale(((i / (LEGEND_STEPS - 1)) * 2 - 1) * offDiffMax),
    );
  }, [offDiffMax]);

  const defDivLegendColors = useMemo(() => {
    const scale = createDivergingColorScale(defDiffMax);
    return Array.from({ length: LEGEND_STEPS }, (_, i) =>
      scale(((i / (LEGEND_STEPS - 1)) * 2 - 1) * defDiffMax),
    );
  }, [defDiffMax]);

  // ── Display bins (hideLowSample filter) ─────────────────────────

  const filterLow = useCallback(
    <T extends { lowSample: boolean }>(bins: T[]) =>
      hideLowSample ? bins.filter((b) => !b.lowSample) : bins,
    [hideLowSample],
  );

  const displayVolBins = useMemo(() => filterLow(volumeBins), [filterLow, volumeBins]);
  const displayPctBins = useMemo(() => filterLow(shootingPctBins), [filterLow, shootingPctBins]);
  const displayOffVolDiff = useMemo(() => filterLow(offVolDiff), [filterLow, offVolDiff]);
  const displayOffPctDiff = useMemo(() => filterLow(offPctDiff), [filterLow, offPctDiff]);

  const displayDefVolBins = useMemo(() => filterLow(defVolumeBins), [filterLow, defVolumeBins]);
  const displayDefPctBins = useMemo(() => filterLow(defPctBins), [filterLow, defPctBins]);
  const displayDefVolDiff = useMemo(() => filterLow(defVolDiff), [filterLow, defVolDiff]);
  const displayDefPctDiff = useMemo(() => filterLow(defPctDiff), [filterLow, defPctDiff]);

  // ══════════════════════════════════════════════════════════════════
  // TOOLTIP RENDERERS
  // ══════════════════════════════════════════════════════════════════

  // Offense absolute
  const offVolumeTooltip = useCallback(
    (bin: ProcessedBin) => ({
      kind: "absolute" as const,
      shots: bin.count,
      goals: bin.goals,
      shootingPct: bin.shootingPct,
      lowSample: bin.lowSample,
      insight:
        bin.count === 0
          ? "No shots from this area"
          : bin.count >= offVolMax * 0.6
            ? "High-volume area"
            : "Low-volume area",
    }),
    [offVolMax],
  );

  const offPctTooltip = useCallback(
    (bin: ProcessedBin) => ({
      kind: "absolute" as const,
      shots: bin.count,
      goals: bin.goals,
      shootingPct: bin.shootingPct,
      lowSample: bin.lowSample,
      insight:
        bin.count === 0
          ? "No shots from this area"
          : bin.shootingPct >= 15
            ? "High-conversion area"
            : bin.shootingPct >= 8
              ? "Average conversion"
              : "Low-conversion area",
    }),
    [],
  );

  // Defense absolute
  const defVolumeTooltip = useCallback(
    (bin: ProcessedBin) => ({
      kind: "absolute" as const,
      shots: bin.count,
      goals: bin.goals,
      shootingPct: bin.shootingPct,
      lowSample: bin.lowSample,
      insight:
        bin.count === 0
          ? "No shots from this area"
          : bin.count >= defVolMax * 0.6
            ? "Heavy pressure area"
            : "Light pressure area",
    }),
    [defVolMax],
  );

  const defPctTooltip = useCallback(
    (bin: ProcessedBin) => ({
      kind: "absolute" as const,
      shots: bin.count,
      goals: bin.goals,
      shootingPct: bin.shootingPct,
      lowSample: bin.lowSample,
      insight:
        bin.count === 0
          ? "No shots from this area"
          : bin.shootingPct >= 15
            ? "High-danger area"
            : bin.shootingPct >= 8
              ? "Moderate danger"
              : "Low-danger area",
    }),
    [],
  );

  // Shared difference tooltip (works for both offense and defense diffs)
  const labelA = teamA ?? "Team A";
  const labelB = scope === "team-vs-league" ? "League" : (teamB ?? "Team B");

  const diffTooltip = useCallback(
    (bin: DifferenceBin) => ({
      kind: "difference" as const,
      delta:
        bin.delta > 0
          ? `+${bin.delta.toFixed(2)}`
          : bin.delta.toFixed(2),
      labelA,
      labelB,
      detailA: bin.detailA,
      detailB: bin.detailB,
      lowSample: bin.lowSample,
      lowSampleCount: Math.min(bin.countA, bin.countB),
      insight:
        Math.abs(bin.delta) < 0.01
          ? "Similar to baseline"
          : bin.delta > 0
            ? "Above baseline here"
            : "Below baseline here",
    }),
    [labelA, labelB],
  );

  // ── Stats subtitle ──────────────────────────────────────────────

  const subtitle = useMemo(() => {
    const total = filteredShots.length;
    const suffix = strengthFilter !== "ALL" ? ` · ${strengthFilter}` : "";
    if (scope === "league")
      return `${total.toLocaleString()} shots across ${totalGameCount} games${suffix}`;
    if (scope === "team" && teamA)
      return `${teamAShots.length.toLocaleString()} shots · ${teamADefenseShots.length.toLocaleString()} against · ${teamA} · ${teamAGameCount} gm${suffix}`;
    if (scope === "team-vs-league" && teamA)
      return `${teamA} vs League average${suffix}`;
    if (scope === "team-vs-team" && teamA && teamB)
      return `${teamA} vs ${teamB}${suffix}`;
    return `${total.toLocaleString()} shots${suffix}`;
  }, [scope, teamA, teamB, filteredShots.length, teamAShots.length, teamADefenseShots.length, totalGameCount, teamAGameCount, strengthFilter]);

  // ── Empty state checks ──────────────────────────────────────────

  const needsTeamSelection =
    (scope !== "league" && !teamA) ||
    (scope === "team-vs-team" && !teamB);

  const noData = filteredShots.length === 0;

  // ── Compare badge ───────────────────────────────────────────────

  const compareBadge = isComparison
    ? `\u0394 vs ${labelB}`
    : undefined;

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ─── A) Editorial Header ─────────────────────────────── */}
      <header className="space-y-1">
        <h1 className="text-[28px] font-bold text-white/95 tracking-tight">
          Shot Geography
        </h1>
        <p className="text-[14px] text-white/40 leading-relaxed max-w-xl">
          Where shots come from — and where they convert — across the NHL or by team.
        </p>
        <div className="flex items-center gap-4 pt-1">
          <span className="text-[12px] text-white/25 tabular-nums">
            {subtitle}
          </span>
          <HowToRead />
        </div>
      </header>

      {/* ─── B) Team Selection Card ──────────────────────────── */}
      <TeamSelectionCard
        view={view}
        onViewChange={state.setView}
        baseline={baseline}
        onBaselineChange={state.setBaseline}
        availableTeams={availableTeams}
        teamA={teamA}
        onTeamAChange={state.setTeamA}
        teamB={teamB}
        onTeamBChange={state.setTeamB}
        onReset={state.reset}
      />

      {/* ─── C) Filters Bar ──────────────────────────────────── */}
      <FiltersBar
        from={from}
        to={to}
        onDateRangeChange={handleDateRangeChange}
        seasonStartDate={seasonStartDate}
        strengthFilter={strengthFilter}
        onStrengthFilterChange={state.setStrengthFilter}
        minSample={minSample}
        onMinSampleChange={state.setMinSample}
        hideLowSample={hideLowSample}
        onHideLowSampleChange={state.setHideLowSample}
        hexSize={hexSize}
        onHexSizeChange={state.setHexSize}
      />

      {/* ─── D) Charts ───────────────────────────────────────── */}
      {needsTeamSelection ? (
        <div className="glass-card px-6 py-20 text-center">
          <p className="text-white/35 text-sm">
            Select {scope === "team-vs-team" && teamA ? "a second team" : "a team"} above to view the heatmap.
          </p>
        </div>
      ) : noData ? (
        <div className="glass-card px-6 py-20 text-center">
          <p className="text-white/35 text-sm">
            {shots.length === 0
              ? "No shot data for this date range."
              : "No shots match the selected filters."}
          </p>
        </div>
      ) : scope === "league" ? (
        /* ── League: 2 charts, no offense/defense split ──────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Shot Volume"
            description="Hex color shows how many shots come from each area."
            legend={
              <ChartLegend
                colors={offVolLegendColors}
                labelLeft="Fewer shots"
                labelRight="More shots"
                note={`min ${minSample} shots`}
              />
            }
          >
            <LeagueAbsoluteHeatmap
              bins={displayVolBins}
              colorFn={offVolumeColorFn}
              opacityFn={offVolumeOpacityFn}
              hexRadius={hexRadius}
              minSample={minSample}
              tooltipRenderer={offVolumeTooltip}
            />
          </ChartCard>
          <ChartCard
            title="Shooting Percentage"
            description="Hex color shows goals per shot from each area."
            legend={
              <ChartLegend
                colors={pctLegendColors}
                labelLeft="Lower %"
                labelRight="Higher %"
                note={`min ${minSample} shots`}
              />
            }
          >
            <LeagueAbsoluteHeatmap
              bins={displayPctBins}
              colorFn={pctColorFn}
              opacityFn={pctOpacityFn}
              hexRadius={hexRadius}
              minSample={minSample}
              tooltipRenderer={offPctTooltip}
            />
          </ChartCard>
        </div>
      ) : (
        /* ── Team / Compare: 4 charts — Offense + Defense ────── */
        <div className="space-y-8">
          {/* ── Offense ──────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionHeader
              title="Offense"
              subtitle={
                isComparison
                  ? `How ${teamA}'s shooting compares to ${labelB}`
                  : `Where ${teamA} shoots from`
              }
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isComparison ? (
                <>
                  <ChartCard
                    title="Shot Volume"
                    description="Difference in shot frequency from each area."
                    compareBadge={compareBadge}
                    legend={
                      <ChartLegend
                        colors={offDivLegendColors}
                        labelLeft="Below baseline"
                        labelRight="Above baseline"
                      />
                    }
                  >
                    <LeagueDifferenceHeatmap
                      bins={displayOffVolDiff}
                      colorFn={offDivergeColorFn}
                      hexRadius={hexRadius}
                      minSample={minSample}
                      tooltipRenderer={diffTooltip}
                    />
                  </ChartCard>
                  <ChartCard
                    title="Shooting %"
                    description="Difference in conversion rate from each area."
                    compareBadge={compareBadge}
                    legend={
                      <ChartLegend
                        colors={offDivLegendColors}
                        labelLeft="Below baseline"
                        labelRight="Above baseline"
                      />
                    }
                  >
                    <LeagueDifferenceHeatmap
                      bins={displayOffPctDiff}
                      colorFn={offDivergeColorFn}
                      hexRadius={hexRadius}
                      minSample={minSample}
                      tooltipRenderer={diffTooltip}
                    />
                  </ChartCard>
                </>
              ) : (
                <>
                  <ChartCard
                    title="Shot Volume"
                    description={`Hex color shows how many shots ${teamA} takes from each area.`}
                    legend={
                      <ChartLegend
                        colors={offVolLegendColors}
                        labelLeft="Fewer shots"
                        labelRight="More shots"
                        note={`min ${minSample} shots`}
                      />
                    }
                  >
                    <LeagueAbsoluteHeatmap
                      bins={displayVolBins}
                      colorFn={offVolumeColorFn}
                      opacityFn={offVolumeOpacityFn}
                      hexRadius={hexRadius}
                      minSample={minSample}
                      tooltipRenderer={offVolumeTooltip}
                    />
                  </ChartCard>
                  <ChartCard
                    title="Shooting %"
                    description={`${teamA}'s goals per shot from each area.`}
                    legend={
                      <ChartLegend
                        colors={pctLegendColors}
                        labelLeft="Lower %"
                        labelRight="Higher %"
                        note={`min ${minSample} shots`}
                      />
                    }
                  >
                    <LeagueAbsoluteHeatmap
                      bins={displayPctBins}
                      colorFn={pctColorFn}
                      opacityFn={pctOpacityFn}
                      hexRadius={hexRadius}
                      minSample={minSample}
                      tooltipRenderer={offPctTooltip}
                    />
                  </ChartCard>
                </>
              )}
            </div>
          </section>

          {/* ── Defense ──────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionHeader
              title="Defense"
              subtitle={
                isComparison
                  ? `How shots against ${teamA} compare to ${labelB}`
                  : `Where opponents shoot against ${teamA}`
              }
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isComparison ? (
                <>
                  <ChartCard
                    title="Shots Allowed"
                    description="Difference in opponent shot frequency from each area."
                    compareBadge={compareBadge}
                    legend={
                      <ChartLegend
                        colors={defDivLegendColors}
                        labelLeft="Below baseline"
                        labelRight="Above baseline"
                      />
                    }
                  >
                    <LeagueDifferenceHeatmap
                      bins={displayDefVolDiff}
                      colorFn={defDivergeColorFn}
                      hexRadius={hexRadius}
                      minSample={minSample}
                      tooltipRenderer={diffTooltip}
                    />
                  </ChartCard>
                  <ChartCard
                    title="Opp. Shooting %"
                    description="Difference in opponents' conversion rate (excl. empty net)."
                    compareBadge={compareBadge}
                    legend={
                      <ChartLegend
                        colors={defDivLegendColors}
                        labelLeft="Below baseline"
                        labelRight="Above baseline"
                      />
                    }
                  >
                    <LeagueDifferenceHeatmap
                      bins={displayDefPctDiff}
                      colorFn={defDivergeColorFn}
                      hexRadius={hexRadius}
                      minSample={minSample}
                      tooltipRenderer={diffTooltip}
                    />
                  </ChartCard>
                </>
              ) : (
                <>
                  <ChartCard
                    title="Shots Allowed"
                    description={`Hex color shows how many shots opponents take against ${teamA}.`}
                    legend={
                      <ChartLegend
                        colors={defVolLegendColors}
                        labelLeft="Fewer shots"
                        labelRight="More shots"
                        note={`min ${minSample} shots`}
                      />
                    }
                  >
                    <LeagueAbsoluteHeatmap
                      bins={displayDefVolBins}
                      colorFn={defVolumeColorFn}
                      opacityFn={defVolumeOpacityFn}
                      hexRadius={hexRadius}
                      minSample={minSample}
                      tooltipRenderer={defVolumeTooltip}
                    />
                  </ChartCard>
                  <ChartCard
                    title="Opp. Shooting %"
                    description={`Opponents' goals per shot against ${teamA} (excl. empty net).`}
                    legend={
                      <ChartLegend
                        colors={pctLegendColors}
                        labelLeft="Lower %"
                        labelRight="Higher %"
                        note={`min ${minSample} shots`}
                      />
                    }
                  >
                    <LeagueAbsoluteHeatmap
                      bins={displayDefPctBins}
                      colorFn={pctColorFn}
                      opacityFn={pctOpacityFn}
                      hexRadius={hexRadius}
                      minSample={minSample}
                      tooltipRenderer={defPctTooltip}
                    />
                  </ChartCard>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
