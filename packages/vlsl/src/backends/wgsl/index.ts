import { WgslCodeGen } from './codegen.js';
import type { ShaderBackendFactory } from '../backend.js';

// WGSL / WebGPU backend — the editor preview path and compile()'s default.
export const wgslBackend: ShaderBackendFactory = (ast, options) => new WgslCodeGen(ast, options);

export { WgslCodeGen };
