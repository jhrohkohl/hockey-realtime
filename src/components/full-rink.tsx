import { FULL_RINK } from "@/utils/coordinates";

interface FullRinkProps {
  children?: React.ReactNode;
}

const W = FULL_RINK.LENGTH; // 200
const H = FULL_RINK.WIDTH; // 85
const CX = W / 2; // 100  – center ice x
const CY = H / 2; // 42.5 – center ice y
const CR = 28; // corner radius

// Key x-positions (SVG coords = NHL + 100)
const GOAL_L = 11; // left goal line  (NHL x = −89)
const GOAL_R = 189; // right goal line (NHL x = +89)
const BLUE_L = 75; // left blue line  (NHL x = −25)
const BLUE_R = 125; // right blue line (NHL x = +25)

// Faceoff circle centers (x, y)
const FACEOFF_R = 169; // right zone circles x
const FACEOFF_L = 31; // left zone circles x (200 − 169)
const FO_Y_TOP = 20.5;
const FO_Y_BOT = 64.5;
const FO_RADIUS = 15;

// Crease half-height
const CREASE_H = 6;

/**
 * Full-rink SVG — both offensive and defensive zones.
 * Team's attacking direction is always RIGHT after coordinate orientation.
 * ViewBox: 0 0 200 85
 */
export function FullRink({ children }: FullRinkProps) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id="rink-clip">
          <rect x={0} y={0} width={W} height={H} rx={CR} ry={CR} />
        </clipPath>
      </defs>

      {/* Background */}
      <rect x={0} y={0} width={W} height={H} fill="#0a0a0a" />

      {/* Heatmap layer (clipped to rink boundary, rendered under rink lines) */}
      <g clipPath="url(#rink-clip)">
        {children}
      </g>

      {/* ── Rink lines overlay (drawn on top of heatmap) ── */}
      <g className="rink-lines-overlay" pointerEvents="none">
        {/* Center line */}
        <line
          x1={CX} y1={0} x2={CX} y2={H}
          stroke="#dc2626" strokeWidth={0.4} opacity={0.35}
          strokeDasharray="2 2"
        />
        {/* Center circle */}
        <circle cx={CX} cy={CY} r={FO_RADIUS} fill="none" stroke="#475569" strokeWidth={0.25} opacity={0.35} />
        <circle cx={CX} cy={CY} r={0.7} fill="#3b82f6" opacity={0.5} />
        {/* Blue lines */}
        <line x1={BLUE_L} y1={0} x2={BLUE_L} y2={H} stroke="#3b82f6" strokeWidth={0.6} opacity={0.45} />
        <line x1={BLUE_R} y1={0} x2={BLUE_R} y2={H} stroke="#3b82f6" strokeWidth={0.6} opacity={0.45} />
        {/* Goal lines */}
        {[GOAL_L, GOAL_R].map((gx) => (
          <line key={`go-${gx}`} x1={gx} y1={0} x2={gx} y2={H} stroke="#dc2626" strokeWidth={0.4} opacity={0.4} />
        ))}
        {/* Creases */}
        <path d={`M ${GOAL_L} ${CY - CREASE_H} A ${CREASE_H} ${CREASE_H} 0 0 1 ${GOAL_L} ${CY + CREASE_H}`} fill="none" stroke="#dc2626" strokeWidth={0.4} opacity={0.35} />
        <path d={`M ${GOAL_R} ${CY - CREASE_H} A ${CREASE_H} ${CREASE_H} 0 0 0 ${GOAL_R} ${CY + CREASE_H}`} fill="none" stroke="#dc2626" strokeWidth={0.4} opacity={0.35} />
        {/* Goal nets */}
        <rect x={GOAL_L - 2} y={CY - 3} width={2} height={6} fill="none" stroke="#dc2626" strokeWidth={0.25} opacity={0.35} />
        <rect x={GOAL_R} y={CY - 3} width={2} height={6} fill="none" stroke="#dc2626" strokeWidth={0.25} opacity={0.35} />
        {/* Faceoff circles + dots */}
        {[
          [FACEOFF_L, FO_Y_TOP], [FACEOFF_L, FO_Y_BOT],
          [FACEOFF_R, FO_Y_TOP], [FACEOFF_R, FO_Y_BOT],
        ].map(([cx, cy]) => (
          <g key={`fo2-${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={FO_RADIUS} fill="none" stroke="#475569" strokeWidth={0.25} opacity={0.3} />
            <circle cx={cx} cy={cy} r={0.7} fill="#dc2626" opacity={0.45} />
          </g>
        ))}
        {/* Neutral zone dots */}
        {[
          [80, FO_Y_TOP], [80, FO_Y_BOT],
          [120, FO_Y_TOP], [120, FO_Y_BOT],
        ].map(([cx, cy]) => (
          <circle key={`nz2-${cx}-${cy}`} cx={cx} cy={cy} r={0.7} fill="#dc2626" opacity={0.4} />
        ))}
        {/* Zone labels */}
        <text x={FACEOFF_L} y={H - 3} textAnchor="middle" fill="#ffffff" fillOpacity={0.15} fontSize={3.5} fontFamily="sans-serif" fontWeight={500} letterSpacing={0.5}>DEF</text>
        <text x={FACEOFF_R} y={H - 3} textAnchor="middle" fill="#ffffff" fillOpacity={0.15} fontSize={3.5} fontFamily="sans-serif" fontWeight={500} letterSpacing={0.5}>OFF</text>
        {/* Rink outline */}
        <rect x={0.25} y={0.25} width={W - 0.5} height={H - 0.5} rx={CR} ry={CR} fill="none" stroke="#475569" strokeWidth={0.5} opacity={0.6} />
      </g>
    </svg>
  );
}
