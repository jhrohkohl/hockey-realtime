import { nhlToSvg, orientToAttackRight, FULL_RINK } from "@/utils/coordinates";
import {
  createAlignedFlatTopGenerator,
  type HexBin,
} from "@/utils/hexbin-config";
import type {
  LeagueShotRow,
  LeagueShotPoint,
  ProcessedBin,
  DifferenceBin,
} from "@/types/league";

// ── Point orientation ────────────────────────────────────────────

/** Orient shots to attack-right and convert to SVG coordinates. */
export function buildOrientedPoints(
  shots: LeagueShotRow[],
  homeTeamMap: Record<number, number>,
): LeagueShotPoint[] {
  return shots.map((shot) => {
    const homeTeamId = homeTeamMap[shot.game_id];
    let coords: [number, number];
    if (homeTeamId != null) {
      const [ox, oy] = orientToAttackRight(
        shot.x_coord,
        shot.y_coord,
        shot.team_id,
        homeTeamId,
        shot.home_team_defending_side,
      );
      coords = nhlToSvg(ox, oy) as [number, number];
    } else {
      coords = nhlToSvg(shot.x_coord, shot.y_coord) as [number, number];
    }
    const pt = coords as LeagueShotPoint;
    pt._shot = shot;
    return pt;
  });
}

// ── Bin computation helpers ──────────────────────────────────────

function binKey(x: number, y: number): string {
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

/** Merge data bins with the full hex grid so every cell is rendered. */
function mergeWithGrid(
  dataBins: HexBin<LeagueShotPoint>[],
  gen: ReturnType<typeof createAlignedFlatTopGenerator>,
): HexBin<LeagueShotPoint>[] {
  const lookup = new Map<string, HexBin<LeagueShotPoint>>();
  for (const bin of dataBins) {
    lookup.set(binKey(bin.x, bin.y), bin);
  }
  const grid = gen.allCells(FULL_RINK.LENGTH, FULL_RINK.WIDTH);
  return grid.map((cell) => {
    const key = binKey(cell.x, cell.y);
    return (
      lookup.get(key) ??
      (Object.assign([] as LeagueShotPoint[], {
        x: cell.x,
        y: cell.y,
      }) as HexBin<LeagueShotPoint>)
    );
  });
}

function countGoals(bin: HexBin<LeagueShotPoint>): number {
  return bin.filter(
    (pt) =>
      pt._shot.type_code === 505 && pt._shot.goalie_player_id != null,
  ).length;
}

// ── Volume bins ──────────────────────────────────────────────────

export function computeVolumeBins(
  points: LeagueShotPoint[],
  hexRadius: number,
  gameCount: number,
  minSample: number,
): ProcessedBin[] {
  const gen = createAlignedFlatTopGenerator(hexRadius);
  const dataBins = gen(points);
  const allBins = mergeWithGrid(dataBins, gen);
  const games = Math.max(1, gameCount);

  return allBins.map((bin) => {
    const count = bin.length;
    const goals = countGoals(bin);
    return {
      x: bin.x,
      y: bin.y,
      count,
      goals,
      shootingPct: count > 0 ? (goals / count) * 100 : 0,
      perGame: count / games,
      lowSample: count < minSample && count > 0,
    };
  });
}

// ── Shooting percentage bins ─────────────────────────────────────

export function computeShootingPctBins(
  points: LeagueShotPoint[],
  hexRadius: number,
  minSample: number,
): ProcessedBin[] {
  // Exclude empty-net goals for shooting % accuracy
  const filtered = points.filter(
    (pt) =>
      !(pt._shot.type_code === 505 && pt._shot.goalie_player_id == null),
  );
  const gen = createAlignedFlatTopGenerator(hexRadius);
  const dataBins = gen(filtered);
  const allBins = mergeWithGrid(dataBins, gen);

  return allBins.map((bin) => {
    const count = bin.length;
    const goals = bin.filter((pt) => pt._shot.type_code === 505).length;
    return {
      x: bin.x,
      y: bin.y,
      count,
      goals,
      shootingPct: count > 0 ? (goals / count) * 100 : 0,
      perGame: 0,
      lowSample: count < minSample && count > 0,
    };
  });
}

// ── Efficiency bins (combined volume + shooting %) ───────────────

export function computeEfficiencyBins(
  points: LeagueShotPoint[],
  hexRadius: number,
  gameCount: number,
  minSample: number,
): ProcessedBin[] {
  const gen = createAlignedFlatTopGenerator(hexRadius);
  const dataBins = gen(points);
  const allBins = mergeWithGrid(dataBins, gen);
  const games = Math.max(1, gameCount);

  return allBins.map((bin) => {
    const count = bin.length;
    const goals = countGoals(bin);
    const pct = count > 0 ? (goals / count) * 100 : 0;
    const perGame = count / games;
    return {
      x: bin.x,
      y: bin.y,
      count,
      goals,
      shootingPct: pct,
      perGame,
      lowSample: count < minSample && count > 0,
    };
  });
}

// ── Difference bins (for comparison scopes) ──────────────────────

export function computeVolumeDifference(
  binsA: ProcessedBin[],
  binsB: ProcessedBin[],
  minSample: number,
): DifferenceBin[] {
  const mapB = new Map<string, ProcessedBin>();
  for (const b of binsB) {
    mapB.set(binKey(b.x, b.y), b);
  }

  return binsA.map((a) => {
    const key = binKey(a.x, a.y);
    const b = mapB.get(key);
    const perGameA = a.perGame;
    const perGameB = b?.perGame ?? 0;
    const delta = perGameA - perGameB;
    return {
      x: a.x,
      y: a.y,
      delta,
      absDelta: Math.abs(delta),
      countA: a.count,
      countB: b?.count ?? 0,
      detailA: `${perGameA.toFixed(2)}/gm`,
      detailB: `${perGameB.toFixed(2)}/gm`,
      lowSample: (a.count < minSample && a.count > 0) ||
        ((b?.count ?? 0) < minSample && (b?.count ?? 0) > 0),
    };
  });
}

export function computeShootingPctDifference(
  binsA: ProcessedBin[],
  binsB: ProcessedBin[],
  minSample: number,
): DifferenceBin[] {
  const mapB = new Map<string, ProcessedBin>();
  for (const b of binsB) {
    mapB.set(binKey(b.x, b.y), b);
  }

  return binsA.map((a) => {
    const key = binKey(a.x, a.y);
    const b = mapB.get(key);
    const pctA = a.shootingPct;
    const pctB = b?.shootingPct ?? 0;
    const delta = pctA - pctB;
    return {
      x: a.x,
      y: a.y,
      delta,
      absDelta: Math.abs(delta),
      countA: a.count,
      countB: b?.count ?? 0,
      detailA: `${pctA.toFixed(1)}%`,
      detailB: `${pctB.toFixed(1)}%`,
      lowSample: (a.count < minSample && a.count > 0) ||
        ((b?.count ?? 0) < minSample && (b?.count ?? 0) > 0),
    };
  });
}

export function computeEfficiencyDifference(
  binsA: ProcessedBin[],
  binsB: ProcessedBin[],
  minSample: number,
): DifferenceBin[] {
  const mapB = new Map<string, ProcessedBin>();
  for (const b of binsB) {
    mapB.set(binKey(b.x, b.y), b);
  }

  return binsA.map((a) => {
    const key = binKey(a.x, a.y);
    const b = mapB.get(key);
    // Efficiency: goals per game proxy (perGame * shootingPct / 100)
    const effA = a.perGame * (a.shootingPct / 100);
    const effB = (b?.perGame ?? 0) * ((b?.shootingPct ?? 0) / 100);
    const delta = effA - effB;
    return {
      x: a.x,
      y: a.y,
      delta,
      absDelta: Math.abs(delta),
      countA: a.count,
      countB: b?.count ?? 0,
      detailA: `${effA.toFixed(3)} eff`,
      detailB: `${effB.toFixed(3)} eff`,
      lowSample: (a.count < minSample && a.count > 0) ||
        ((b?.count ?? 0) < minSample && (b?.count ?? 0) > 0),
    };
  });
}

// ── Max value helpers (for color scale domain) ───────────────────

export function maxBinCount(bins: ProcessedBin[]): number {
  return Math.max(1, ...bins.map((b) => b.count));
}

export function maxBinPerGame(bins: ProcessedBin[]): number {
  return Math.max(0.01, ...bins.map((b) => b.perGame));
}

export function maxDifferenceDelta(bins: DifferenceBin[]): number {
  return Math.max(0.01, ...bins.map((b) => b.absDelta));
}
