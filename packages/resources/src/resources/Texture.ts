import { Resource } from "../Resource";
import type { Gradient } from "./Gradient";
import type { Noise } from "./Noise";
import type { Curve } from "./Curve";

export abstract class Texture extends Resource {}
export abstract class Texture2D extends Texture {}
export class CompressedTexture2D extends Texture2D {}

/** Godot `GradientTexture1D`: a 1D ramp baked from a gradient. */
export class GradientTexture1D extends Texture2D {
  readonly width = this.prop.int("Width", 256, { min: 1, max: 16384 });
  readonly useHDR = this.prop.bool("UseHDR", false);
  readonly gradient = this.prop.resource<Gradient | null>("Gradient", "Gradient", null);
}

export class GradientTexture2D extends Texture2D {
  readonly width = this.prop.int("Width", 64, { min: 1, max: 4096 });
  readonly height = this.prop.int("Height", 64, { min: 1, max: 4096 });
  readonly fill = this.prop.enum("Fill", "Linear", ["Linear", "Radial", "Square", "Conic"]);
  readonly fillFrom = this.prop.vector2("FillFrom", 0, 0);
  readonly fillTo = this.prop.vector2("FillTo", 1, 0);
  readonly repeat = this.prop.enum("Repeat", "None", ["None", "Repeat", "Mirror"]);
  readonly useHDR = this.prop.bool("UseHDR", false);
  readonly gradient = this.prop.resource<Gradient | null>("Gradient", "Gradient", null);
}

export class NoiseTexture2D extends Texture2D {
  readonly width = this.prop.int("Width", 512, { min: 1, max: 4096 });
  readonly height = this.prop.int("Height", 512, { min: 1, max: 4096 });
  readonly generateMipmaps = this.prop.bool("GenerateMipmaps", true);
  readonly noise = this.prop.resource<Noise | null>("Noise", "Noise", null);
  readonly colorRamp = this.prop.resource<Gradient | null>("ColorRamp", "Gradient", null);
  readonly seamless = this.prop.bool("Seamless", false);
  readonly invert = this.prop.bool("Invert", false);
  readonly in3dSpace = this.prop.bool("In3dSpace", false);
  readonly asNormalMap = this.prop.bool("AsNormalMap", false);
  readonly normalize = this.prop.bool("Normalize", true);
  readonly seamlessBlendSkirt = this.prop.float("SeamlessBlendSkirt", 0.1, { min: 0, max: 1, step: 0.01 });
  readonly bumpStrength = this.prop.float("BumpStrength", 8, { min: 0, max: 32, step: 0.1 });
}

export class CurveTexture extends Texture2D {
  readonly width = this.prop.int("Width", 256, { min: 1, max: 4096 });
  readonly textureMode = this.prop.enum("TextureMode", "Red", ["Rgb", "Red"]);
  readonly curve = this.prop.resource<Curve | null>("Curve", "Curve", null);
}

export class CurveXyzTexture extends Texture2D {
  readonly width = this.prop.int("Width", 256, { min: 1, max: 4096 });
  readonly curveX = this.prop.resource<Curve | null>("CurveX", "Curve", null);
  readonly curveY = this.prop.resource<Curve | null>("CurveY", "Curve", null);
  readonly curveZ = this.prop.resource<Curve | null>("CurveZ", "Curve", null);
}
