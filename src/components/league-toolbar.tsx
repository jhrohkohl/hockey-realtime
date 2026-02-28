"use client";

import { useCallback } from "react";
import { TeamPicker } from "@/components/team-picker";
import type {
  Scope,
  HexSize,
  StrengthFilter,
  AvailableTeam,
} from "@/types/league";

interface LeagueToolbarProps {
  // View state
  scope: Scope;
  onScopeChange: (s: Scope) => void;
  hexSize: HexSize;
  onHexSizeChange: (s: HexSize) => void;
  strengthFilter: StrengthFilter;
  onStrengthFilterChange: (s: StrengthFilter) => void;
  minSample: number;
  onMinSampleChange: (n: number) => void;

  // Team selections
  availableTeams: AvailableTeam[];
  teamA: string | null;
  onTeamAChange: (abbrev: string | null) => void;
  teamB: string | null;
  onTeamBChange: (abbrev: string | null) => void;

  // Date range (URL-synced)
  from: string;
  to: string;
  onDateRangeChange: (from: string, to: string) => void;
  seasonStartDate: string;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] text-sh-text-muted/60 font-medium uppercase tracking-widest shrink-0">
      {children}
    </span>
  );
}

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "league", label: "League" },
  { value: "team", label: "Team" },
  { value: "team-vs-league", label: "vs League" },
  { value: "team-vs-team", label: "vs Team" },
];

const STRENGTH_OPTIONS: StrengthFilter[] = ["ALL", "EV", "PP", "PK"];

const HEX_SIZE_STEPS: HexSize[] = ["S", "M", "L"];
const HEX_SIZE_INDEX: Record<HexSize, number> = { S: 0, M: 1, L: 2 };

function getTodayET(): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function LeagueToolbar({
  scope,
  onScopeChange,
  hexSize,
  onHexSizeChange,
  strengthFilter,
  onStrengthFilterChange,
  minSample,
  onMinSampleChange,
  availableTeams,
  teamA,
  onTeamAChange,
  teamB,
  onTeamBChange,
  from,
  to,
  onDateRangeChange,
  seasonStartDate,
}: LeagueToolbarProps) {
  const needsTeamA = scope !== "league";
  const needsTeamB = scope === "team-vs-team";

  const handlePreset = useCallback(
    (days: number | "season") => {
      const today = getTodayET();
      if (days === "season") {
        onDateRangeChange(seasonStartDate, today);
      } else {
        const d = new Date(today);
        d.setDate(d.getDate() - days);
        const fromStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        onDateRangeChange(fromStr, today);
      }
    },
    [onDateRangeChange, seasonStartDate],
  );

  return (
    <div className="glass-panel px-2.5 py-2 flex flex-wrap items-center gap-2">
      {/* Scope selector */}
      <div className="glass-capsule flex items-center gap-1 px-2 py-1">
        <GroupLabel>Scope</GroupLabel>
        {SCOPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onScopeChange(opt.value)}
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
              scope === opt.value
                ? "bg-white/[0.15] text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Team A picker */}
      {needsTeamA && (
        <div className="glass-capsule flex items-center gap-1.5 px-2 py-1">
          <GroupLabel>Team A</GroupLabel>
          <TeamPicker
            availableTeams={availableTeams}
            selectedTeams={teamA ? [teamA] : []}
            onTeamsChange={(teams) => onTeamAChange(teams[0] ?? null)}
            singleSelect
          />
        </div>
      )}

      {/* Team B picker */}
      {needsTeamB && (
        <div className="glass-capsule flex items-center gap-1.5 px-2 py-1">
          <GroupLabel>Team B</GroupLabel>
          <TeamPicker
            availableTeams={availableTeams}
            selectedTeams={teamB ? [teamB] : []}
            onTeamsChange={(teams) => onTeamBChange(teams[0] ?? null)}
            singleSelect
          />
        </div>
      )}

      {/* Date range + presets */}
      <div className="glass-capsule flex items-center gap-1.5 px-2 py-1">
        <GroupLabel>From</GroupLabel>
        <input
          type="date"
          value={from}
          onChange={(e) => {
            const newFrom = e.target.value;
            if (newFrom <= to) onDateRangeChange(newFrom, to);
          }}
          className="bg-transparent text-[11px] text-white/90 font-medium
                     border border-white/[0.08] rounded-md px-1.5 py-0.5
                     focus:outline-none focus:border-white/[0.20]
                     [color-scheme:dark] cursor-pointer"
        />
        <GroupLabel>To</GroupLabel>
        <input
          type="date"
          value={to}
          onChange={(e) => {
            const newTo = e.target.value;
            if (newTo >= from) onDateRangeChange(from, newTo);
          }}
          className="bg-transparent text-[11px] text-white/90 font-medium
                     border border-white/[0.08] rounded-md px-1.5 py-0.5
                     focus:outline-none focus:border-white/[0.20]
                     [color-scheme:dark] cursor-pointer"
        />
        <div className="flex items-center gap-0.5 ml-0.5">
          {([
            { label: "1W", days: 7 },
            { label: "2W", days: 14 },
            { label: "1M", days: 30 },
            { label: "Szn", days: "season" as const },
          ] as const).map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePreset(preset.days)}
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded
                         text-white/40 hover:text-white/70 hover:bg-white/[0.06]
                         transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Strength filter */}
      <div className="glass-capsule flex items-center gap-1 px-2 py-1">
        <GroupLabel>Strength</GroupLabel>
        {STRENGTH_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onStrengthFilterChange(opt)}
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
              strengthFilter === opt
                ? "bg-white/[0.15] text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Min sample slider */}
      <div className="glass-capsule flex items-center gap-2 px-2 py-1">
        <GroupLabel>Min</GroupLabel>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={minSample}
          onChange={(e) => onMinSampleChange(Number(e.target.value))}
          className="hex-slider w-12 h-1 appearance-none bg-white/[0.1] rounded-full cursor-pointer accent-sh-accent"
        />
        <span className="text-[10px] text-white/60 font-medium tabular-nums w-4 text-right">
          {minSample}
        </span>
      </div>

      {/* Hex size slider (pushed right) */}
      <div className="glass-capsule flex items-center gap-2 px-2 py-1 ml-auto">
        <GroupLabel>Hex</GroupLabel>
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={HEX_SIZE_INDEX[hexSize]}
          onChange={(e) => onHexSizeChange(HEX_SIZE_STEPS[Number(e.target.value)])}
          className="hex-slider w-14 h-1 appearance-none bg-white/[0.1] rounded-full cursor-pointer accent-sh-accent"
        />
      </div>
    </div>
  );
}
