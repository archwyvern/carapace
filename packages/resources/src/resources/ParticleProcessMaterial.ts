import { Material } from "./Material";
import { Texture2D } from "./Texture";

const EMISSION_SHAPES = ["Point", "Sphere", "SphereSurface", "Box", "Points", "DirectedPoints", "Ring"];

/**
 * GPU particle behaviour. Field set mirrors the engine type
 * (`Archwyvern.Hardcoded.ParticleProcessMaterial`); structural fields drive shader
 * recompilation, uniforms feed the GPU buffer.
 */
export class ParticleProcessMaterial extends Material {
  // Structural -- changes trigger shader recompile.
  readonly emissionShape = this.prop.enum("EmissionShape", "Point", EMISSION_SHAPES);
  readonly turbulenceEnabled = this.prop.bool("TurbulenceEnabled", false);
  readonly particleFlagAlignY = this.prop.bool("ParticleFlagAlignY", false);
  readonly particleFlagDampingAsFriction = this.prop.bool("ParticleFlagDampingAsFriction", false);
  readonly attractorInteractionEnabled = this.prop.bool("AttractorInteractionEnabled", false);

  // Direction / spread.
  readonly direction = this.prop.vector2("Direction", 0, -1);
  readonly spread = this.prop.float("Spread", 45);

  // Initial velocity.
  readonly initialVelocityMin = this.prop.float("InitialVelocityMin", 0);
  readonly initialVelocityMax = this.prop.float("InitialVelocityMax", 0);

  // Angular velocity.
  readonly angularVelocityMin = this.prop.float("AngularVelocityMin", 0);
  readonly angularVelocityMax = this.prop.float("AngularVelocityMax", 0);
  readonly angularVelocityCurve = this.prop.resource<Texture2D | null>("AngularVelocityCurve", "CurveTexture", null);

  // Orbit / radial / directional velocity.
  readonly orbitVelocityMin = this.prop.float("OrbitVelocityMin", 0);
  readonly orbitVelocityMax = this.prop.float("OrbitVelocityMax", 0);
  readonly orbitVelocityCurve = this.prop.resource<Texture2D | null>("OrbitVelocityCurve", "CurveTexture", null);
  readonly radialVelocityMin = this.prop.float("RadialVelocityMin", 0);
  readonly radialVelocityMax = this.prop.float("RadialVelocityMax", 0);
  readonly radialVelocityCurve = this.prop.resource<Texture2D | null>("RadialVelocityCurve", "CurveTexture", null);
  readonly directionalVelocityMin = this.prop.float("DirectionalVelocityMin", 0);
  readonly directionalVelocityMax = this.prop.float("DirectionalVelocityMax", 0);
  readonly directionalVelocityCurve = this.prop.resource<Texture2D | null>("DirectionalVelocityCurve", "CurveTexture", null);
  readonly linearVelocityCurve = this.prop.resource<Texture2D | null>("LinearVelocityCurve", "CurveTexture", null);

  // Acceleration.
  readonly linearAccelMin = this.prop.float("LinearAccelMin", 0);
  readonly linearAccelMax = this.prop.float("LinearAccelMax", 0);
  readonly linearAccelCurve = this.prop.resource<Texture2D | null>("LinearAccelCurve", "CurveTexture", null);
  readonly radialAccelMin = this.prop.float("RadialAccelMin", 0);
  readonly radialAccelMax = this.prop.float("RadialAccelMax", 0);
  readonly radialAccelCurve = this.prop.resource<Texture2D | null>("RadialAccelCurve", "CurveTexture", null);
  readonly tangentialAccelMin = this.prop.float("TangentialAccelMin", 0);
  readonly tangentialAccelMax = this.prop.float("TangentialAccelMax", 0);
  readonly tangentialAccelCurve = this.prop.resource<Texture2D | null>("TangentialAccelCurve", "CurveTexture", null);

  // Damping.
  readonly dampingMin = this.prop.float("DampingMin", 0);
  readonly dampingMax = this.prop.float("DampingMax", 0);
  readonly dampingCurve = this.prop.resource<Texture2D | null>("DampingCurve", "CurveTexture", null);

  // Angle / scale / hue / anim.
  readonly angleMin = this.prop.float("AngleMin", 0);
  readonly angleMax = this.prop.float("AngleMax", 0);
  readonly angleCurve = this.prop.resource<Texture2D | null>("AngleCurve", "CurveTexture", null);
  readonly scaleMin = this.prop.float("ScaleMin", 1);
  readonly scaleMax = this.prop.float("ScaleMax", 1);
  readonly scaleCurve = this.prop.resource<Texture2D | null>("ScaleCurve", "CurveTexture", null);
  readonly hueVariationMin = this.prop.float("HueVariationMin", 0);
  readonly hueVariationMax = this.prop.float("HueVariationMax", 0);
  readonly hueVariationCurve = this.prop.resource<Texture2D | null>("HueVariationCurve", "CurveTexture", null);
  readonly animSpeedMin = this.prop.float("AnimSpeedMin", 0);
  readonly animSpeedMax = this.prop.float("AnimSpeedMax", 0);
  readonly animSpeedCurve = this.prop.resource<Texture2D | null>("AnimSpeedCurve", "CurveTexture", null);
  readonly animOffsetMin = this.prop.float("AnimOffsetMin", 0);
  readonly animOffsetMax = this.prop.float("AnimOffsetMax", 0);
  readonly animOffsetCurve = this.prop.resource<Texture2D | null>("AnimOffsetCurve", "CurveTexture", null);

  // Lifetime / colour / forces.
  readonly lifetimeRandomness = this.prop.float("LifetimeRandomness", 0);
  readonly color = this.prop.color("Color", 1, 1, 1, 1);
  readonly colorRamp = this.prop.resource<Texture2D | null>("ColorRamp", "GradientTexture1D", null);
  readonly colorInitialRamp = this.prop.resource<Texture2D | null>("ColorInitialRamp", "GradientTexture1D", null);
  readonly alphaCurve = this.prop.resource<Texture2D | null>("AlphaCurve", "CurveTexture", null);
  readonly emissionCurve = this.prop.resource<Texture2D | null>("EmissionCurve", "CurveTexture", null);
  readonly gravity = this.prop.vector2("Gravity", 0, 0);
  readonly velocityPivot = this.prop.vector2("VelocityPivot", 0, 0);
  readonly inheritVelocityRatio = this.prop.float("InheritVelocityRatio", 0);

  // Emission shape parameters.
  readonly emissionShapeOffset = this.prop.vector2("EmissionShapeOffset", 0, 0);
  readonly emissionShapeScale = this.prop.vector2("EmissionShapeScale", 1, 1);
  readonly emissionSphereRadius = this.prop.float("EmissionSphereRadius", 0);
  readonly emissionBoxExtents = this.prop.vector2("EmissionBoxExtents", 0, 0);

  // Scale-over-velocity.
  readonly scaleOverVelocityMin = this.prop.float("ScaleOverVelocityMin", 0);
  readonly scaleOverVelocityMax = this.prop.float("ScaleOverVelocityMax", 0);
  readonly scaleOverVelocityCurve = this.prop.resource<Texture2D | null>("ScaleOverVelocityCurve", "CurveTexture", null);

  // Turbulence.
  readonly turbulenceNoiseStrength = this.prop.float("TurbulenceNoiseStrength", 0);
  readonly turbulenceNoiseScale = this.prop.float("TurbulenceNoiseScale", 0);
  readonly turbulenceNoiseSpeed = this.prop.vector2("TurbulenceNoiseSpeed", 0, 0);
  readonly turbulenceNoiseSpeedRandom = this.prop.float("TurbulenceNoiseSpeedRandom", 0);
  readonly turbulenceInfluenceMin = this.prop.float("TurbulenceInfluenceMin", 0);
  readonly turbulenceInfluenceMax = this.prop.float("TurbulenceInfluenceMax", 0);
  readonly turbulenceInfluenceOverLife = this.prop.resource<Texture2D | null>("TurbulenceInfluenceOverLife", "CurveTexture", null);
  readonly turbulenceInitialDisplacementMin = this.prop.float("TurbulenceInitialDisplacementMin", 0);
  readonly turbulenceInitialDisplacementMax = this.prop.float("TurbulenceInitialDisplacementMax", 0);

  // Velocity limit.
  readonly velocityLimitCurve = this.prop.resource<Texture2D | null>("VelocityLimitCurve", "CurveTexture", null);
}
