"use client";

import { useMemo } from "react";
import { createColorScale, createDivergingColorScale } from "@/utils/hexbin-config";
import type { Scope } from "@/types/league";

interface LeagueLegendProps {
  scope: Scope;
  maxCount: number;
  maxDelta: number;
  minSample: number;
}

const STEPS = 8;
const PCT_MAX = 25;

export function LeagueLegend({
  scope,
  maxCount,
  maxDelta,
  minSample,
}: LeagueLegendProps) {
  const isComparison = scope === "team-vs-league" || scope === "team-vs-team";

  // Volume / density gradient
  const densityColors = useMemo(() => {
    const scale = createColorScale(maxCount);
    return Array.from({ length: STEPS }, (_, i) => {
      const v = (i / (STEPS - 1)) * maxCount;
      return scale(v);
    });
  }, [maxCount]);

  // Shooting % gradient (fixed 0-25%)
  const pctColors = useMemo(() => {
    const scale = createColorScale(PCT_MAX);
    return Array.from({ length: STEPS }, (_, i) => {
      const v = (i / (STEPS - 1)) * PCT_MAX;
      return scale(v);
    });
  }, []);

  // Diverging gradient (for comparison scopes)
  const divergingColors = useMemo(() => {
    const scale = createDivergingColorScale(maxDelta);
    const colors: string[] = [];
    for (let i = 0; i < STEPS; i++) {
      const t = (i / (STEPS - 1)) * 2 - 1; // -1 to +1
      colors.push(scale(t * maxDelta));
    }
    return colors;
  }, [maxDelta]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isComparison ? (
        <div className="glass-capsule inline-flex items-center gap-2.5 px-3 py-1.5">
          <GradientBar
            colors={divergingColors}
            labelLeft="B"
            labelRight="A"
          />
          {minSample > 1 && <SampleNote minSample={minSample} />}
        </div>
      ) : (
        <>
          <div className="glass-capsule inline-flex items-center gap-2.5 px-3 py-1.5">
            <GradientBar
              colors={densityColors}
              labelLeft="0"
              labelRight={String(maxCount)}
              title="Density"
            />
            <Divider />
            <GoalMarker />
          </div>
          <div className="glass-capsule inline-flex items-center gap-2.5 px-3 py-1.5">
            <GradientBar
              colors={pctColors}
              labelLeft="0%"
              labelRight="25%+"
            />
            <Divider />
            <span className="text-[9px] text-sh-text-muted/60 font-medium tracking-wide">
              min {minSample} shots · excl. empty net
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function GradientBar({
  colors,
  labelLeft,
  labelRight,
  title,
}: {
  colors: string[];
  labelLeft: string;
  labelRight: string;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {title && (
        <span className="text-[9px] text-sh-text-muted/60 font-medium uppercase tracking-widest">
          {title}
        </span>
      )}
      <span className="text-[9px] text-sh-text-muted/60 font-medium uppercase tracking-widest">
        {labelLeft}
      </span>
      <div className="flex h-2 rounded-sm overflow-hidden">
        {colors.map((c, i) => (
          <div
            key={i}
            className="w-3.5"
            style={{
              backgroundColor: c,
              opacity: 0.45 + 0.5 * (i / (colors.length - 1)),
            }}
          />
        ))}
      </div>
      <span className="text-[9px] text-sh-text-muted/60 font-medium uppercase tracking-widest">
        {labelRight}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-3 bg-white/[0.06]" />;
}

function GoalMarker() {
  return (
    <div className="flex items-center gap-1">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path
          d="M 5 2.5 L 7 5 L 5 7.5 L 3 5 Z"
          fill="#34d399"
          fillOpacity={0.9}
          stroke="#ffffff"
          strokeWidth={0.3}
          strokeOpacity={0.4}
        />
      </svg>
      <span className="text-[9px] text-sh-text-muted/60 font-medium uppercase tracking-widest">
        Goal
      </span>
    </div>
  );
}

function SampleNote({ minSample }: { minSample: number }) {
  return (
    <span className="text-[9px] text-sh-text-muted/60 font-medium tracking-wide">
      min {minSample} shots
    </span>
  );
}
