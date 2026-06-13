import { Resource } from "../Resource";
import type { Shader } from "./Shader";

export abstract class Material extends Resource {}

export class ShaderMaterial extends Material {
  readonly shader = this.prop.resource<Shader | null>("shader", "Shader", null);
  /** Map<string, unknown> of per-uniform overrides — custom-hydrated later. */
  readonly shaderParameters = this.prop.custom<Map<string, unknown>>("shaderParameters", new Map());
}
