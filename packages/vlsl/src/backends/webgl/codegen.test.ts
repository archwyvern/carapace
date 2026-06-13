import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../../index.js';
import { webglBackend, assembleFragmentShader } from './index.js';

function emit(src: string) {
  return compile(src, { backend: webglBackend });
}

describe('Glsl300EsCodeGen', () => {
  it('emits a GLSL ES 300 fragment main() for a minimal canvas_item shader', () => {
    const r = emit('shader_type canvas_item;\nvoid fragment() { COLOR = vec4(UV, 0.0, 1.0); }');
    assert.equal(r.success, true, r.diagnostics.map(d => d.message).join('; '));
    const main = r.codeSections.get('fragment') ?? '';
    assert.match(main, /void main\(\)/);
    assert.match(main, /fragColor = COLOR;/);
    // GLSL types, not WGSL.
    assert.match(main, /vec4\(/);
    assert.doesNotMatch(main, /vec4f/);
    // UV maps to the v_uv varying.
    assert.match(main, /vec4\(v_uv, 0\.0, 1\.0\)/);
  });

  it('emits individual uniform declarations referenced bare (no uniforms.* block)', () => {
    const r = emit('shader_type canvas_item;\nuniform float u_thrust;\nvoid fragment() { COLOR = vec4(u_thrust); }');
    assert.equal(r.success, true, r.diagnostics.map(d => d.message).join('; '));
    assert.match(r.uniformBlockMembers, /uniform float u_thrust;/);
    const main = r.codeSections.get('fragment') ?? '';
    assert.match(main, /vec4\(u_thrust\)/);
    assert.doesNotMatch(main, /uniforms\.u_thrust/);
  });

  it('emits combined sampler uniforms and passes texture() through', () => {
    const r = emit('shader_type canvas_item;\nuniform sampler2D u_tex;\nvoid fragment() { COLOR = texture(u_tex, UV); }');
    assert.equal(r.success, true, r.diagnostics.map(d => d.message).join('; '));
    assert.match(r.samplerDeclarations, /uniform sampler2D u_tex;/);
    const main = r.codeSections.get('fragment') ?? '';
    assert.match(main, /texture\(u_tex, v_uv\)/);
  });

  it('declares a TIME uniform only when TIME is referenced', () => {
    const used = emit('shader_type canvas_item;\nvoid fragment() { COLOR = vec4(TIME); }');
    assert.match(used.uniformBlockMembers, /uniform float TIME;/);
    const unused = emit('shader_type canvas_item;\nvoid fragment() { COLOR = vec4(1.0); }');
    assert.doesNotMatch(unused.uniformBlockMembers, /TIME/);
  });

  it('maps FRAGCOORD to gl_FragCoord', () => {
    const r = emit('shader_type canvas_item;\nvoid fragment() { COLOR = vec4(FRAGCOORD.xy, 0.0, 1.0); }');
    assert.equal(r.success, true, r.diagnostics.map(d => d.message).join('; '));
    assert.match(r.codeSections.get('fragment') ?? '', /gl_FragCoord\.xy/);
  });

  it('emits native GLSL ternary, not WGSL select()', () => {
    const r = emit('shader_type canvas_item;\nvoid fragment() { float x = (UV.x > 0.5) ? 1.0 : 0.0; COLOR = vec4(x); }');
    assert.equal(r.success, true, r.diagnostics.map(d => d.message).join('; '));
    const main = r.codeSections.get('fragment') ?? '';
    assert.match(main, /\? 1\.0 : 0\.0/);
    assert.doesNotMatch(main, /select\(/);
  });

  it('rejects particles shaders (canvas_item only)', () => {
    const r = emit('shader_type particles;\nvoid fragment() { COLOR = vec4(1.0); }');
    assert.equal(r.success, false);
  });

  it('assembleFragmentShader builds a complete shader and injects used library bodies', () => {
    const r = emit('shader_type canvas_item;\n#include <ease>\nvoid fragment() { float t = ease_quad_in(UV.x); COLOR = vec4(t); }');
    assert.equal(r.success, true, r.diagnostics.map(d => d.message).join('; '));
    const full = assembleFragmentShader(r);
    assert.match(full, /^#version 300 es/);
    assert.match(full, /\nin vec2 v_uv;/);
    assert.match(full, /\nout vec4 fragColor;/);
    assert.match(full, /void main\(\)/);
    // The ease library body was injected because the shader #include'd and used it.
    assert.match(full, /ease_quad_in/);
    // The call site precedes... actually the body (definition) must precede main (use).
    assert.ok(full.indexOf('ease_quad_in(') < full.lastIndexOf('void main()') || full.indexOf('float ease_quad_in') < full.indexOf('void main()'));
  });
});
