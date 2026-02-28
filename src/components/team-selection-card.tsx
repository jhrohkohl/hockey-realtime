"use client";

import { TeamPicker } from "@/components/team-picker";
import type { ViewMode, Baseline, AvailableTeam } from "@/types/league";

interface TeamSelectionCardProps {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  baseline: Baseline;
  onBaselineChange: (b: Baseline) => void;
  availableTeams: AvailableTeam[];
  teamA: string | null;
  onTeamAChange: (abbrev: string | null) => void;
  teamB: string | null;
  onTeamBChange: (abbrev: string | null) => void;
  onReset: () => void;
}

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "league", label: "League" },
  { value: "team", label: "Team" },
  { value: "compare", label: "Compare" },
];

export function TeamSelectionCard({
  view,
  onViewChange,
  baseline,
  onBaselineChange,
  availableTeams,
  teamA,
  onTeamAChange,
  teamB,
  onTeamBChange,
  onReset,
}: TeamSelectionCardProps) {
  const showClear = view !== "league";

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
          Choose what to analyze
        </h2>
        {showClear && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* View mode: League / Team / Compare */}
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] text-white/50 font-medium">View</span>
          <div className="glass-capsule inline-flex items-center gap-0.5 p-0.5">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onViewChange(opt.value)}
                className={`text-[12px] font-medium px-3.5 py-1.5 rounded-md transition-all ${
                  view === opt.value
                    ? "bg-white/[0.12] text-white shadow-sm"
                    : "text-white/40 hover:text-white/65"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* League: static chip */}
        {view === "league" && (
          <span className="glass-chip text-[12px] text-white/45 font-medium px-3 py-1.5">
            All NHL teams
          </span>
        )}

        {/* Team: single team picker */}
        {view === "team" && (
          <TeamPicker
            availableTeams={availableTeams}
            selectedTeams={teamA ? [teamA] : []}
            onTeamsChange={(teams) => onTeamAChange(teams[0] ?? null)}
            singleSelect
          />
        )}

        {/* Compare: team A + vs + baseline toggle + optional team B */}
        {view === "compare" && (
          <div className="flex flex-wrap items-center gap-2.5">
            <TeamPicker
              availableTeams={availableTeams}
              selectedTeams={teamA ? [teamA] : []}
              onTeamsChange={(teams) => onTeamAChange(teams[0] ?? null)}
              singleSelect
            />

            <span className="text-[13px] text-white/30 font-medium">vs</span>

            <div className="glass-capsule inline-flex items-center gap-0.5 p-0.5">
              <button
                type="button"
                onClick={() => onBaselineChange("league")}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-md transition-all ${
                  baseline === "league"
                    ? "bg-white/[0.12] text-white shadow-sm"
                    : "text-white/40 hover:text-white/65"
                }`}
              >
                League average
              </button>
              <button
                type="button"
                onClick={() => onBaselineChange("team")}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-md transition-all ${
                  baseline === "team"
                    ? "bg-white/[0.12] text-white shadow-sm"
                    : "text-white/40 hover:text-white/65"
                }`}
              >
                Another team
              </button>
            </div>

            {baseline === "team" && (
              <TeamPicker
                availableTeams={availableTeams}
                selectedTeams={teamB ? [teamB] : []}
                onTeamsChange={(teams) => onTeamBChange(teams[0] ?? null)}
                singleSelect
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
