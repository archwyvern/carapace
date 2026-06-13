import { Text } from "./Text";

/**
 * A VLSL shader resource. The shader source is the `content` inherited from
 * {@link Text} — a Shader *is* a piece of text the engine treats as shader code.
 * A distinct type so the editor can give it shader-aware editing/compilation.
 */
export class Shader extends Text {}

/**
 * A VLSL shader-include resource (`.vlshaderinc`): reusable source fragments
 * `#include`d by shaders. Not a complete shader (no entry points), so it extends
 * {@link Text} directly rather than {@link Shader}.
 */
export class ShaderInclude extends Text {}
