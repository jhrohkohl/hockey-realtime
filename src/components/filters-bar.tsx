"use client";

import type { HexSize, StrengthFilter } from "@/types/league";

interface FiltersBarProps {
  from: string;
  to: string;
  onDateRangeChange: (from: string, to: string) => void;
  seasonStartDate: string;
  strengthFilter: StrengthFilter;
  onStrengthFilterChange: (s: StrengthFilter) => void;
  minSample: number;
  onMinSampleChange: (n: number) => void;
  hideLowSample: boolean;
  onHideLowSampleChange: (v: boolean) => void;
  hexSize: HexSize;
  onHexSizeChange: (s: HexSize) => void;
}

const STRENGTH_OPTIONS: { value: StrengthFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "EV", label: "5v5" },
  { value: "PP", label: "PP" },
  { value: "PK", label: "PK" },
];

const MIN_SAMPLE_OPTIONS = [5, 10, 20];

const HEX_SIZE_STEPS: HexSize[] = ["S", "M", "L"];
const HEX_SIZE_INDEX: Record<HexSize, number> = { S: 0, M: 1, L: 2 };

function getTodayET(): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function FiltersBar({
  from,
  to,
  onDateRangeChange,
  seasonStartDate,
  strengthFilter,
  onStrengthFilterChange,
  minSample,
  onMinSampleChange,
  hideLowSample,
  onHideLowSampleChange,
  hexSize,
  onHexSizeChange,
}: FiltersBarProps) {
  function handlePreset(days: number | "season") {
    const today = getTodayET();
    if (days === "season") {
      onDateRangeChange(seasonStartDate, today);
    } else {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      const fromStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      onDateRangeChange(fromStr, today);
    }
  }

  return (
    <div className="glass-panel px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2.5">
      {/* Date range */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white/35 font-medium">Date</span>
        <input
          type="date"
          value={from}
          onChange={(e) => {
            const newFrom = e.target.value;
            if (newFrom <= to) onDateRangeChange(newFrom, to);
          }}
          className="bg-transparent text-[11px] text-white/70 font-medium
                     border border-white/[0.08] rounded-md px-2 py-1
                     focus:outline-none focus:border-white/[0.20]
                     [color-scheme:dark] cursor-pointer"
        />
        <span className="text-[11px] text-white/20">&ndash;</span>
        <input
          type="date"
          value={to}
          onChange={(e) => {
            const newTo = e.target.value;
            if (newTo >= from) onDateRangeChange(from, newTo);
          }}
          className="bg-transparent text-[11px] text-white/70 font-medium
                     border border-white/[0.08] rounded-md px-2 py-1
                     focus:outline-none focus:border-white/[0.20]
                     [color-scheme:dark] cursor-pointer"
        />
        <div className="flex items-center gap-0.5 ml-1">
          {([
            { label: "Season", days: "season" as const },
            { label: "2W", days: 14 },
            { label: "1M", days: 30 },
          ] as const).map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePreset(preset.days)}
              className="text-[10px] font-medium px-2 py-0.5 rounded
                         text-white/30 hover:text-white/55 hover:bg-white/[0.04]
                         transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical divider */}
      <div className="w-px h-4 bg-white/[0.06] hidden sm:block" />

      {/* Strength */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white/35 font-medium">Strength</span>
        <div className="glass-capsule inline-flex items-center gap-0.5 p-0.5">
          {STRENGTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStrengthFilterChange(opt.value)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all ${
                strengthFilter === opt.value
                  ? "bg-white/[0.12] text-white"
                  : "text-white/30 hover:text-white/55"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical divider */}
      <div className="w-px h-4 bg-white/[0.06] hidden sm:block" />

      {/* Min shots per hex */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white/35 font-medium">Min shots</span>
        <div className="glass-capsule inline-flex items-center gap-0.5 p-0.5">
          {MIN_SAMPLE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onMinSampleChange(n)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all tabular-nums ${
                minSample === n
                  ? "bg-white/[0.12] text-white"
                  : "text-white/30 hover:text-white/55"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onHideLowSampleChange(!hideLowSample)}
          className={`text-[10px] font-medium px-2.5 py-1 rounded-md transition-all border ${
            hideLowSample
              ? "bg-white/[0.08] text-white/70 border-white/[0.10]"
              : "text-white/25 border-transparent hover:text-white/45"
          }`}
        >
          Hide low sample
        </button>
      </div>

      {/* Hex size (pushed right on desktop) */}
      <div className="flex items-center gap-2 sm:ml-auto">
        <span className="text-[11px] text-white/35 font-medium">Hex size</span>
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
