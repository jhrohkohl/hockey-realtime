import { hexbin as d3Hexbin } from "d3-hexbin";
import { scaleLinear, scalePow } from "d3-scale";
import { interpolateRgb } from "d3-interpolate";
import { HALF_RINK, FULL_RINK } from "./coordinates";

/** Create a configured hexbin generator for a half-rink */
export function createHexbinGenerator(radius: number = 4) {
  return d3Hexbin<[number, number]>()
    .x((d) => d[0])
    .y((d) => d[1])
    .radius(radius)
    .extent([
      [HALF_RINK.X_OFFSET, 0],
      [HALF_RINK.X_OFFSET + HALF_RINK.WIDTH, HALF_RINK.HEIGHT],
    ]);
}

/** Create a configured hexbin generator for a full rink */
export function createFullRinkHexbinGenerator(radius: number = 4) {
  return d3Hexbin<[number, number]>()
    .x((d) => d[0])
    .y((d) => d[1])
    .radius(radius)
    .extent([
      [0, 0],
      [FULL_RINK.LENGTH, FULL_RINK.WIDTH],
    ]);
}

// ── Flat-top hex generator with rink-geometry alignment ───────────

const SQRT3 = Math.sqrt(3);

/**
 * Hex bin: array of binned points with the hex center coordinates.
 * Matches d3-hexbin's bin shape for drop-in compatibility.
 */
export interface HexBin<T> extends Array<T> {
  x: number;
  y: number;
}

/** SVG path for a flat-top hexagon centered at origin. */
function flatTopHexPath(radius: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i; // 0°, 60°, 120°, 180°, 240°, 300°
    pts.push(
      `${(radius * Math.cos(a)).toFixed(4)},${(radius * Math.sin(a)).toFixed(4)}`,
    );
  }
  return `M${pts.join("L")}Z`;
}

/** Pixel → fractional axial coordinates (flat-top layout). */
function pixelToAxial(
  px: number,
  py: number,
  x0: number,
  y0: number,
  s: number,
): [number, number] {
  const dx = px - x0;
  const dy = py - y0;
  const q = ((2 / 3) * dx) / s;
  const r = ((-1 / 3) * dx + (SQRT3 / 3) * dy) / s;
  return [q, r];
}

/** Axial → pixel coordinates (flat-top layout). */
function axialToPixel(
  q: number,
  r: number,
  x0: number,
  y0: number,
  s: number,
): [number, number] {
  return [x0 + s * 1.5 * q, y0 + s * SQRT3 * (r + q / 2)];
}

/** Round fractional axial coords to nearest hex (cube-coordinate rounding). */
function axialRound(qf: number, rf: number): [number, number] {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(sf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return [q, r];
}

/**
 * Create a flat-top hexbin generator phase-aligned to the rink geometry.
 *
 * - Goal-line alignment: the midpoint of a shared column-boundary edge
 *   falls on `goalLineX` so the zigzag border visually coincides with the
 *   goal line.
 * - Midline alignment: for even-q columns, a row of hex centers sits on
 *   `midY`, so the horizontal midline splits a hex symmetrically.
 *
 * @param s          Hex circumradius (center-to-vertex). Same unit as SVG viewBox.
 * @param goalLineX  X coord of the offensive goal line (default 189).
 * @param midY       Y coord of the rink horizontal midline (default 42.5).
 */
export function createAlignedFlatTopGenerator(
  s: number,
  goalLineX: number = 189,
  midY: number = 42.5,
) {
  const dx = 1.5 * s;
  const dy = SQRT3 * s;

  // Phase x: column-boundary midpoint at goalLineX.
  // Boundary midpoint = center_q + 0.75 * s, so center_q = goalLineX − 0.75s.
  const rawX = goalLineX - 0.75 * s;
  const x0 = rawX - Math.round(rawX / dx) * dx;

  // Phase y: snap a q=0 row center onto midY.
  const y0 = midY - Math.round(midY / dy) * dy;

  const generator = <T extends [number, number]>(points: T[]): HexBin<T>[] => {
    const bins = new Map<string, HexBin<T>>();

    for (const pt of points) {
      const [fq, fr] = pixelToAxial(pt[0], pt[1], x0, y0, s);
      const [q, r] = axialRound(fq, fr);
      const key = `${q},${r}`;

      if (!bins.has(key)) {
        const [cx, cy] = axialToPixel(q, r, x0, y0, s);
        const bin = Object.assign([] as T[], { x: cx, y: cy }) as HexBin<T>;
        bins.set(key, bin);
      }
      bins.get(key)!.push(pt);
    }

    return Array.from(bins.values());
  };

  return Object.assign(generator, {
    /** SVG path for a flat-top hex, optionally shrunk by a factor for gap rendering. */
    hexPath: (shrinkFactor?: number): string =>
      flatTopHexPath(shrinkFactor != null ? s * shrinkFactor : s),

    /** Generate all hex cell centers that fall within a bounding box. */
    allCells: (width: number, height: number): Array<{ x: number; y: number }> => {
      const cells: Array<{ x: number; y: number }> = [];
      const qMin = Math.floor((-s - x0) / dx);
      const qMax = Math.ceil((width + s - x0) / dx);
      for (let q = qMin; q <= qMax; q++) {
        const baseY = y0 + SQRT3 * s * (q / 2);
        const rMin = Math.floor((-s - baseY) / dy);
        const rMax = Math.ceil((height + s - baseY) / dy);
        for (let r = rMin; r <= rMax; r++) {
          const [cx, cy] = axialToPixel(q, r, x0, y0, s);
          cells.push({ x: cx, y: cy });
        }
      }
      return cells;
    },
  });
}

/**
 * Premium color scale: deep indigo → warm amber → soft ivory/gold.
 * Luminance-focused with clear visual hierarchy against the dark rink.
 * Low counts read as cool/recessed; high counts glow warm.
 *
 * Uses a sqrt (power 0.5) mapping so that low-count hexes always land
 * in a clearly visible part of the scale regardless of the max.
 * A 1-shot hex looks the same whether the global max is 5 or 20.
 */
const HEAT_STOPS = [
  "#2e1065", // 0% — deep violet (visible on dark bg)
  "#7c3aed", // 20% — violet
  "#c026d3", // 40% — fuchsia
  "#e11d48", // 60% — rose-red
  "#f59e0b", // 80% — amber
  "#fef3c7", // 100% — soft ivory/cream
] as const;

export function createColorScale(maxCount: number) {
  const max = Math.max(1, maxCount);

  // Two-stage approach:
  // 1. scalePow(sqrt) maps raw count → normalized [0, max] with compression
  //    at the top, giving low counts more visual range.
  // 2. scaleLinear maps the normalized value → color string.
  const colorMap = scaleLinear<string>()
    .domain(HEAT_STOPS.map((_, i) => (i / (HEAT_STOPS.length - 1)) * max))
    .range([...HEAT_STOPS])
    .interpolate(interpolateRgb.gamma(2.2))
    .clamp(true);

  const powScale = scalePow<number>()
    .exponent(0.55)
    .domain([0, max])
    .range([0, max])
    .clamp(true);

  return (count: number) => colorMap(powScale(count));
}

/**
 * Diverging color scale for comparison/difference maps.
 *
 * Negative (Team B dominates): teal spectrum
 * Zero: neutral gray
 * Positive (Team A dominates): amber/red spectrum
 *
 * Same sqrt compression as the absolute scale for perceptual consistency.
 */
const DIVERGE_NEG = ["#64748b", "#5eead4", "#14b8a6", "#0d9488"] as const;
const DIVERGE_POS = ["#64748b", "#fbbf24", "#f59e0b", "#dc2626"] as const;

export function createDivergingColorScale(maxDelta: number) {
  const max = Math.max(0.01, maxDelta);

  const negMap = scaleLinear<string>()
    .domain(DIVERGE_NEG.map((_, i) => (i / (DIVERGE_NEG.length - 1)) * max))
    .range([...DIVERGE_NEG])
    .interpolate(interpolateRgb.gamma(2.2))
    .clamp(true);

  const posMap = scaleLinear<string>()
    .domain(DIVERGE_POS.map((_, i) => (i / (DIVERGE_POS.length - 1)) * max))
    .range([...DIVERGE_POS])
    .interpolate(interpolateRgb.gamma(2.2))
    .clamp(true);

  const powScale = scalePow<number>()
    .exponent(0.55)
    .domain([0, max])
    .range([0, max])
    .clamp(true);

  return (delta: number) => {
    const abs = powScale(Math.abs(delta));
    if (delta < 0) return negMap(abs);
    if (delta > 0) return posMap(abs);
    return "#64748b";
  };
}

