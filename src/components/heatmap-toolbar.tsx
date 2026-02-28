"use client";

import { PlayerPicker } from "@/components/player-picker";
import type { RosterPlayer } from "@/types/roster";
import type { ShotStrength } from "@/services/nhl-api";

type HexSize = "S" | "M" | "L";

interface HeatmapToolbarProps {
  roster: RosterPlayer[];
  selectedPlayerId: number | null;
  onPlayerChange: (playerId: number | null) => void;
  homeTeamId: number;
  homeTeamAbbrev: string;
  awayTeamAbbrev: string;
  availablePeriods: number[];
  selectedPeriods: ReadonlySet<number>;
  onPeriodsChange: (p: Set<number>) => void;
  showGoalsOnly: boolean;
  onShowGoalsOnlyChange: (v: boolean) => void;
  selectedStrengths: ReadonlySet<ShotStrength>;
  onStrengthsChange: (s: Set<ShotStrength>) => void;
  hexSize: HexSize;
  onHexSizeChange: (s: HexSize) => void;
}

function Chip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass-chip px-2 py-0.5 text-[10px] font-medium transition-all ${
        active ? "glass-chip-active" : "text-sh-text-muted hover:text-sh-text hover:bg-white/[0.06]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] text-sh-text-muted/60 font-medium uppercase tracking-widest shrink-0">
      {children}
    </span>
  );
}

function periodLabel(p: number): string {
  if (p <= 3) return `P${p}`;
  if (p === 4) return "OT";
  return `${p - 3}OT`;
}

const HEX_SIZE_STEPS: HexSize[] = ["S", "M", "L"];
const HEX_SIZE_INDEX: Record<HexSize, number> = { S: 0, M: 1, L: 2 };

const STRENGTH_OPTIONS: { value: ShotStrength; label: string }[] = [
  { value: "EV", label: "EV" },
  { value: "PP", label: "PP" },
  { value: "PK", label: "PK" },
];

export function HeatmapToolbar({
  roster,
  selectedPlayerId,
  onPlayerChange,
  homeTeamId,
  homeTeamAbbrev,
  awayTeamAbbrev,
  availablePeriods,
  selectedPeriods,
  onPeriodsChange,
  showGoalsOnly,
  onShowGoalsOnlyChange,
  selectedStrengths,
  onStrengthsChange,
  hexSize,
  onHexSizeChange,
}: HeatmapToolbarProps) {
  function togglePeriod(p: number) {
    const next = new Set(selectedPeriods);
    if (next.has(p)) {
      next.delete(p);
    } else {
      next.add(p);
    }
    onPeriodsChange(next);
  }

  function toggleStrength(s: ShotStrength) {
    const next = new Set(selectedStrengths);
    if (next.has(s)) {
      next.delete(s);
    } else {
      next.add(s);
    }
    onStrengthsChange(next);
  }

  return (
    <div className="glass-panel px-2.5 py-2 flex flex-wrap items-center gap-2">
      {/* Player capsule */}
      {roster.length > 0 && (
        <div className="glass-capsule flex items-center gap-1.5 px-2 py-1">
          <GroupLabel>Player</GroupLabel>
          <PlayerPicker
            roster={roster}
            selectedPlayerId={selectedPlayerId}
            onPlayerChange={onPlayerChange}
            homeTeamId={homeTeamId}
            homeTeamAbbrev={homeTeamAbbrev}
            awayTeamAbbrev={awayTeamAbbrev}
          />
        </div>
      )}

      {/* Period capsule */}
      {availablePeriods.length > 0 && (
        <div className="glass-capsule flex items-center gap-1.5 px-2 py-1">
          <GroupLabel>Period</GroupLabel>
          <div className="flex items-center gap-0.5">
            {availablePeriods.map((p) => (
              <Chip
                key={p}
                active={selectedPeriods.size === 0 || selectedPeriods.has(p)}
                onClick={() => togglePeriod(p)}
              >
                {periodLabel(p)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Type capsule */}
      <div className="glass-capsule flex items-center gap-1.5 px-2 py-1">
        <GroupLabel>Type</GroupLabel>
        <div className="flex items-center gap-0.5">
          <Chip
            active={!showGoalsOnly}
            onClick={() => onShowGoalsOnlyChange(false)}
          >
            All
          </Chip>
          <Chip
            active={showGoalsOnly}
            onClick={() => onShowGoalsOnlyChange(true)}
          >
            Goals
          </Chip>
        </div>
      </div>

      {/* Strength capsule */}
      <div className="glass-capsule flex items-center gap-1.5 px-2 py-1">
        <GroupLabel>Strength</GroupLabel>
        <div className="flex items-center gap-0.5">
          {STRENGTH_OPTIONS.map(({ value, label }) => (
            <Chip
              key={value}
              active={selectedStrengths.size === 0 || selectedStrengths.has(value)}
              onClick={() => toggleStrength(value)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Hex size capsule */}
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
