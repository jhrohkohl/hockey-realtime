interface ChartCardProps {
  title: string;
  description: string;
  compareBadge?: string;
  children: React.ReactNode;
  legend?: React.ReactNode;
}

export function ChartCard({
  title,
  description,
  compareBadge,
  children,
  legend,
}: ChartCardProps) {
  return (
    <div className="glass-card min-w-0">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-white/90 tracking-tight">
            {title}
          </h2>
          {compareBadge && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/45">
              {compareBadge}
            </span>
          )}
        </div>
        <p className="text-[12px] text-white/40 mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Rink (hero) */}
      <div className="px-3 pb-1">
        {children}
      </div>

      {/* Legend */}
      {legend && (
        <div className="px-5 pb-4 pt-1">
          {legend}
        </div>
      )}
    </div>
  );
}

// ── Inline legend for chart cards ────────────────────────

interface ChartLegendProps {
  colors: string[];
  labelLeft: string;
  labelRight: string;
  note?: string;
}

export function ChartLegend({
  colors,
  labelLeft,
  labelRight,
  note,
}: ChartLegendProps) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-white/30 font-medium">
          {labelLeft}
        </span>
        <div className="flex h-[6px] rounded-full overflow-hidden">
          {colors.map((c, i) => (
            <div
              key={i}
              className="w-3"
              style={{
                backgroundColor: c,
                opacity: 0.3 + 0.65 * (i / (colors.length - 1)),
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-white/30 font-medium">
          {labelRight}
        </span>
      </div>
      {note && (
        <>
          <div className="w-px h-3 bg-white/[0.06]" />
          <span className="text-[9px] text-white/25 font-medium">{note}</span>
        </>
      )}
    </div>
  );
}
