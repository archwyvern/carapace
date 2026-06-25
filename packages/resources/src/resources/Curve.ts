import { Resource } from "../Resource";

/** How a tangent is computed (mirrors the engine's `Curve.TangentMode`). `Free` = manual slope;
 *  `Linear` = auto-pointed straight at the neighbouring point. Serialized as `TangentMode.<name>`. */
export const TangentMode = ["Free", "Linear"] as const;

/**
 * A 1D animation curve — control points over a domain, baked to a lookup table.
 * Each `CurvePoint` is `(Offset, Value, LeftTangent, RightTangent, LeftMode, RightMode)`; the two
 * modes are {@link TangentMode} enums. The points are private to the engine and rendered by the
 * resource's own `curve-points` view rather than the generic array widget.
 */
export class Curve extends Resource {
  readonly minDomain = this.prop.float("MinDomain", 0);
  readonly maxDomain = this.prop.float("MaxDomain", 1);
  readonly minValue = this.prop.float("MinValue", 0);
  readonly maxValue = this.prop.float("MaxValue", 1);
  readonly bakeResolution = this.prop.int("BakeResolution", 100, { min: 1, max: 1024 });
  readonly points = this.prop.arrayTuple("Points", "CurvePoint", [], {
    view: "curve-points",
    sorted: true,
    members: [
      { name: "Offset", kind: "number" },
      { name: "Value", kind: "number" },
      { name: "LeftTangent", kind: "number" },
      { name: "RightTangent", kind: "number" },
      { name: "LeftMode", kind: "enum", enumType: "TangentMode", options: [...TangentMode] },
      { name: "RightMode", kind: "enum", enumType: "TangentMode", options: [...TangentMode] },
    ],
  });
}
