import { useMemo } from "react";
import { createColorScale } from "@/utils/hexbin-config";

interface HeatmapLegendProps {
  maxCount: number;
}

const STEPS = 8;

export function HeatmapLegend({ maxCount }: HeatmapLegendProps) {
  const colors = useMemo(() => {
    const scale = createColorScale(maxCount);
    return Array.from({ length: STEPS }, (_, i) => {
      const v = (i / (STEPS - 1)) * maxCount;
      return scale(v);
    });
  }, [maxCount]);

  return (
    <div className="glass-capsule inline-flex items-center gap-2.5 px-3 py-1.5">
      {/* Density gradient */}
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-sh-text-muted/60 font-medium uppercase tracking-widest">
          Density
        </span>
        <div className="flex h-2 rounded-sm overflow-hidden">
          {colors.map((c, i) => (
            <div
              key={i}
              className="w-3.5"
              style={{
                backgroundColor: c,
                opacity: 0.45 + 0.5 * (i / (STEPS - 1)),
              }}
            />
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-3 bg-white/[0.06]" />

      {/* Goal marker key */}
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
    </div>
  );
}
