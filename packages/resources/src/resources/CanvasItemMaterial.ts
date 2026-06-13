import { Material } from "./Material";

const BLEND_MODES = ["Mix", "Add", "Sub", "Mul", "PremultAlpha"];
const LIGHT_MODES = ["Normal", "Unshaded", "LightOnly"];

export class CanvasItemMaterial extends Material {
  readonly blendMode = this.prop.enum("BlendMode", "Mix", BLEND_MODES);
  readonly lightMode = this.prop.enum("LightMode", "Normal", LIGHT_MODES);
  readonly particlesAnimation = this.prop.bool("ParticlesAnimation", false);
  readonly particlesAnimHFrames = this.prop.int("ParticlesAnimHFrames", 1, { min: 1 });
  readonly particlesAnimVFrames = this.prop.int("ParticlesAnimVFrames", 1, { min: 1 });
  readonly particlesAnimLoop = this.prop.bool("ParticlesAnimLoop", false);
}
