"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { FullRink } from "@/components/full-rink";
import { createAlignedFlatTopGenerator } from "@/utils/hexbin-config";
import type { ProcessedBin, DifferenceBin } from "@/types/league";

// ── Tooltip types ────────────────────────────────────────────────

interface AbsoluteTooltipContent {
  kind: "absolute";
  shots: number;
  goals: number;
  shootingPct: number;
  lowSample: boolean;
  insight: string;
}

interface DifferenceTooltipContent {
  kind: "difference";
  delta: string;
  labelA: string;
  labelB: string;
  detailA: string;
  detailB: string;
  lowSample: boolean;
  lowSampleCount?: number;
  insight: string;
}

type TooltipContent = AbsoluteTooltipContent | DifferenceTooltipContent;

interface TooltipState {
  content: TooltipContent;
  x: number;
  y: number;
}

// ── Absolute heatmap (Volume, Shooting %) ────────────────────────

interface AbsoluteHeatmapProps {
  bins: ProcessedBin[];
  colorFn: (bin: ProcessedBin) => string;
  opacityFn: (bin: ProcessedBin) => number;
  hexRadius: number;
  minSample: number;
  tooltipRenderer: (bin: ProcessedBin) => TooltipContent;
  title?: string;
}

export function LeagueAbsoluteHeatmap({
  bins,
  colorFn,
  opacityFn,
  hexRadius,
  minSample,
  tooltipRenderer,
  title,
}: AbsoluteHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hexPath = useMemo(() => {
    const gen = createAlignedFlatTopGenerator(hexRadius);
    return gen.hexPath(0.96);
  }, [hexRadius]);

  const handleMouseEnter = useCallback(
    (bin: ProcessedBin, event: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setTooltip({
        content: tooltipRenderer(bin),
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    },
    [tooltipRenderer],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!tooltip || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip((prev) =>
        prev
          ? {
              ...prev,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            }
          : null,
      );
    },
    [tooltip],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="min-w-0">
      {title && (
        <h2 className="text-sm font-semibold text-sh-text/80 uppercase tracking-wider mb-2">
          {title}
        </h2>
      )}
      <div
        ref={containerRef}
        className="relative w-full"
        onMouseMove={handleMouseMove}
      >
        <FullRink>
          <g className="hex-heatmap">
            {bins.map((bin) => {
              const isEmpty = bin.count === 0;
              const isLow = bin.lowSample;
              return (
                <g
                  key={`${bin.x}-${bin.y}`}
                  className="hex-cell"
                  transform={`translate(${bin.x},${bin.y})`}
                  onMouseEnter={(e) => handleMouseEnter(bin, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  <path
                    d={hexPath}
                    fill={isEmpty ? "#334155" : colorFn(bin)}
                    fillOpacity={isEmpty ? 0.08 : opacityFn(bin)}
                    className="hex-outer"
                    strokeDasharray={isLow ? "1.5 1" : undefined}
                  />
                  <path d={hexPath} className="hex-inner" />
                </g>
              );
            })}
          </g>
        </FullRink>

        {tooltip && <HeatmapTooltip tooltip={tooltip} containerRef={containerRef} />}
      </div>
    </div>
  );
}

// ── Difference heatmap (Team vs League, Team vs Team) ────────────

interface DifferenceHeatmapProps {
  bins: DifferenceBin[];
  colorFn: (bin: DifferenceBin) => string;
  hexRadius: number;
  minSample: number;
  tooltipRenderer: (bin: DifferenceBin) => TooltipContent;
  title?: string;
}

export function LeagueDifferenceHeatmap({
  bins,
  colorFn,
  hexRadius,
  tooltipRenderer,
  title,
}: DifferenceHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hexPath = useMemo(() => {
    const gen = createAlignedFlatTopGenerator(hexRadius);
    return gen.hexPath(0.96);
  }, [hexRadius]);

  const handleMouseEnter = useCallback(
    (bin: DifferenceBin, event: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setTooltip({
        content: tooltipRenderer(bin),
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    },
    [tooltipRenderer],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!tooltip || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip((prev) =>
        prev
          ? {
              ...prev,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            }
          : null,
      );
    },
    [tooltip],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="min-w-0">
      {title && (
        <h2 className="text-sm font-semibold text-sh-text/80 uppercase tracking-wider mb-2">
          {title}
        </h2>
      )}
      <div
        ref={containerRef}
        className="relative w-full"
        onMouseMove={handleMouseMove}
      >
        <FullRink>
          <g className="hex-heatmap">
            {bins.map((bin) => {
              const isEmpty = bin.countA === 0 && bin.countB === 0;
              const isNearZero = bin.absDelta < 0.001;
              const opacity = isEmpty || isNearZero
                ? 0.08
                : 0.5 + 0.45 * Math.min(bin.absDelta / Math.max(...bins.map((b) => b.absDelta), 0.01), 1);
              return (
                <g
                  key={`${bin.x}-${bin.y}`}
                  className="hex-cell"
                  transform={`translate(${bin.x},${bin.y})`}
                  onMouseEnter={(e) => handleMouseEnter(bin, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  <path
                    d={hexPath}
                    fill={isEmpty || isNearZero ? "#334155" : colorFn(bin)}
                    fillOpacity={opacity}
                    className="hex-outer"
                    strokeDasharray={bin.lowSample ? "1.5 1" : undefined}
                  />
                  <path d={hexPath} className="hex-inner" />
                </g>
              );
            })}
          </g>
        </FullRink>

        {tooltip && <HeatmapTooltip tooltip={tooltip} containerRef={containerRef} />}
      </div>
    </div>
  );
}

// ── Shared tooltip renderer ──────────────────────────────────────

function HeatmapTooltip({
  tooltip,
  containerRef,
}: {
  tooltip: TooltipState;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const content = tooltip.content;
  return (
    <div
      className="absolute pointer-events-none z-50 glass-tooltip px-3.5 py-2.5 text-xs min-w-[150px]"
      style={{
        left: Math.min(
          tooltip.x + 14,
          (containerRef.current?.clientWidth ?? 400) - 160,
        ),
        top: tooltip.y - 10,
        transform: "translateY(-100%)",
      }}
    >
      {content.kind === "absolute" ? (
        <>
          {/* Structured stats rows */}
          <div className="space-y-0.5">
            <div className="flex justify-between gap-4">
              <span className="text-[11px] text-white/45">Shots</span>
              <span className="text-[12px] text-white/90 font-medium tabular-nums">
                {content.shots}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[11px] text-white/45">Goals</span>
              <span className="text-[12px] text-white/90 font-medium tabular-nums">
                {content.goals}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[11px] text-white/45">Sh%</span>
              <span className="text-[12px] text-white/90 font-medium tabular-nums">
                {content.shootingPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Low sample warning or plain-English insight */}
          {content.lowSample ? (
            <div className="text-[10px] text-amber-400/70 mt-1.5 pt-1.5 border-t border-white/[0.06]">
              Low sample (n={content.shots})
            </div>
          ) : content.insight ? (
            <div className="text-[10px] text-white/30 mt-1.5 pt-1.5 border-t border-white/[0.06] italic">
              {content.insight}
            </div>
          ) : null}
        </>
      ) : (
        <>
          {/* Delta header */}
          <div className="font-semibold text-[13px] text-white/90 tabular-nums">
            &Delta; {content.delta}
          </div>

          {/* Team detail rows */}
          <div className="space-y-0.5 mt-1.5">
            <div className="text-[11px] tabular-nums">
              <span className="text-teal-400 font-medium">{content.labelA}</span>
              <span className="text-white/45 ml-2">{content.detailA}</span>
            </div>
            <div className="text-[11px] tabular-nums">
              <span className="text-amber-400 font-medium">{content.labelB}</span>
              <span className="text-white/45 ml-2">{content.detailB}</span>
            </div>
          </div>

          {/* Low sample warning or insight */}
          {content.lowSample ? (
            <div className="text-[10px] text-amber-400/70 mt-1.5 pt-1.5 border-t border-white/[0.06]">
              Low sample{content.lowSampleCount != null ? ` (n=${content.lowSampleCount})` : ""}
            </div>
          ) : content.insight ? (
            <div className="text-[10px] text-white/30 mt-1.5 pt-1.5 border-t border-white/[0.06] italic">
              {content.insight}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
