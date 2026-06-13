import { Resource } from "../Resource";

/**
 * A 1D animation curve — control points over a domain, baked to a lookup table.
 * `points` are `CurvePoint` tuples (offset, value, left-tangent, right-tangent).
 */
export class Curve extends Resource {
  readonly minDomain = this.prop.float("MinDomain", 0);
  readonly maxDomain = this.prop.float("MaxDomain", 1);
  readonly minValue = this.prop.float("MinValue", 0);
  readonly maxValue = this.prop.float("MaxValue", 1);
  readonly bakeResolution = this.prop.int("BakeResolution", 100, { min: 1, max: 1024 });
  readonly points = this.prop.arrayTuple("Points", "CurvePoint", []);
}
