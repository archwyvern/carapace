import { Glsl300EsCodeGen } from './codegen.js';
import type { ShaderBackendFactory } from '../backend.js';
import type { CompilationResult } from '../../index.js';
import { GLSL_LIBRARIES } from './libs.generated.js';

// WebGL2 / GLSL ES 3.00 backend — the in-browser preview path.
export const webglBackend: ShaderBackendFactory = (ast, options) => new Glsl300EsCodeGen(ast, options);

export { Glsl300EsCodeGen };

// Returns the GLSL ES 3.00 body for a canonical stdlib (`#include <name>`), or null.
export function getGlslLibrarySource(name: string): string | null {
  return GLSL_LIBRARIES[name] ?? null;
}

// Libraries are emitted in a fixed dependency-safe order (math/random first, as the
// most likely to be depended upon), filtered to those the shader actually includes.
const LIB_ORDER = ['math', 'random', 'color', 'ease', 'noise', 'blend'];

// Assemble a complete GLSL ES 3.00 fragment shader from a compiled result. The
// canvas_item preview ABI: `in vec2 v_uv` (from the fullscreen-quad vertex shader),
// `out vec4 fragColor`, plus the runtime-supplied builtin/user uniforms the emitter
// declared. Ordering satisfies GLSL's definition-before-use rule:
// uniforms -> samplers -> library bodies -> consts -> structs/helpers/user fns -> main().
export function assembleFragmentShader(c: CompilationResult): string {
  const parts: string[] = [
    '#version 300 es',
    'precision highp float;',
    'precision highp int;',
    'in vec2 v_uv;',
  ];
  // User varyings the vertex stage writes (vertex->fragment channels).
  for (const v of c.varyings ?? []) {
    parts.push(`${v.flat ? 'flat ' : ''}in ${v.glslType} ${v.name};`);
  }
  parts.push('out vec4 fragColor;');
  if (c.uniformBlockMembers) parts.push(c.uniformBlockMembers);
  if (c.samplerDeclarations) parts.push(c.samplerDeclarations);
  for (const lib of LIB_ORDER) {
    if (c.libraries.has(lib) && GLSL_LIBRARIES[lib]) parts.push(GLSL_LIBRARIES[lib]);
  }
  for (const lib of c.libraries) {
    if (!LIB_ORDER.includes(lib) && GLSL_LIBRARIES[lib]) parts.push(GLSL_LIBRARIES[lib]);
  }
  if (c.constDeclarations) parts.push(c.constDeclarations);
  if (c.specConstDeclarations) parts.push(c.specConstDeclarations);
  if (c.userFunctions) parts.push(c.userFunctions);
  const main = c.codeSections.get('fragment');
  if (main) parts.push(main);
  return parts.join('\n\n') + '\n';
}
