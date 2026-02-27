import { hexbin as d3Hexbin } from "d3-hexbin";
import { scaleSequential } from "d3-scale";
import { interpolateInferno } from "d3-scale-chromatic";
import { HALF_RINK } from "./coordinates";

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

/** Create a color scale for hex bins */
export function createColorScale(maxCount: number) {
  return scaleSequential(interpolateInferno).domain([0, Math.max(1, maxCount)]);
}
