import { HALF_RINK } from "@/utils/coordinates";

interface HalfRinkProps {
  children?: React.ReactNode;
}

const RINK_HEIGHT = HALF_RINK.HEIGHT;
const X_START = HALF_RINK.X_OFFSET;
const X_END = X_START + HALF_RINK.WIDTH;
const CENTER_Y = RINK_HEIGHT / 2;
const CORNER_RADIUS = 28;
const GOAL_LINE_X = 189;
const CREASE_X = 189;
const BLUE_LINE_X = 125;

/**
 * SVG half-rink showing the offensive zone (right half of rink).
 * ViewBox covers x: 100-200, y: 0-85 in shifted NHL coordinates.
 */
export function HalfRink({ children }: HalfRinkProps) {
  return (
    <svg
      viewBox={`${X_START} 0 ${HALF_RINK.WIDTH} ${RINK_HEIGHT}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background */}
      <rect
        x={X_START}
        y={0}
        width={HALF_RINK.WIDTH}
        height={RINK_HEIGHT}
        fill="#0a0a0a"
      />

      {/* Rink outline — right half with rounded corners at top-right and bottom-right */}
      <path
        d={`
          M ${X_START} 0
          L ${X_END - CORNER_RADIUS} 0
          Q ${X_END} 0 ${X_END} ${CORNER_RADIUS}
          L ${X_END} ${RINK_HEIGHT - CORNER_RADIUS}
          Q ${X_END} ${RINK_HEIGHT} ${X_END - CORNER_RADIUS} ${RINK_HEIGHT}
          L ${X_START} ${RINK_HEIGHT}
        `}
        fill="none"
        stroke="#334155"
        strokeWidth={0.5}
      />

      {/* Blue line */}
      <line
        x1={BLUE_LINE_X}
        y1={0}
        x2={BLUE_LINE_X}
        y2={RINK_HEIGHT}
        stroke="#2563eb"
        strokeWidth={0.6}
        opacity={0.6}
      />

      {/* Goal line */}
      <line
        x1={GOAL_LINE_X}
        y1={0}
        x2={GOAL_LINE_X}
        y2={RINK_HEIGHT}
        stroke="#dc2626"
        strokeWidth={0.3}
        opacity={0.5}
      />

      {/* Goal crease (semicircle) */}
      <path
        d={`M ${CREASE_X} ${CENTER_Y - 6} A 6 6 0 0 0 ${CREASE_X} ${CENTER_Y + 6}`}
        fill="none"
        stroke="#dc2626"
        strokeWidth={0.3}
        opacity={0.5}
      />

      {/* Goal net */}
      <rect
        x={GOAL_LINE_X}
        y={CENTER_Y - 3}
        width={2}
        height={6}
        fill="none"
        stroke="#dc2626"
        strokeWidth={0.2}
        opacity={0.4}
      />

      {/* Faceoff circles */}
      {[20.5, 64.5].map((cy) => (
        <g key={`faceoff-${cy}`}>
          <circle
            cx={169}
            cy={cy}
            r={15}
            fill="none"
            stroke="#334155"
            strokeWidth={0.2}
            opacity={0.4}
          />
          <circle cx={169} cy={cy} r={0.8} fill="#dc2626" opacity={0.5} />
        </g>
      ))}

      {/* Heatmap overlay */}
      {children}
    </svg>
  );
}
