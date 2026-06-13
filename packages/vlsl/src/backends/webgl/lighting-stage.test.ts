import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../../index.js';
import { webglBackend } from './index.js';

const SRC = `shader_type canvas_item;
void fragment() { COLOR = vec4(0.8, 0.8, 0.8, 1.0); }
void light() {
  float d = distance(LIGHT_POSITION.xy, FRAGCOORD.xy);
  float atten = max(0.0, 1.0 - d / 100.0);
  LIGHT = vec4(COLOR.rgb * LIGHT_COLOR.rgb * LIGHT_ENERGY * atten, COLOR.a);
}`;

describe('webgl light stage', () => {
  it('compiles fragment() + light() and emits a light body section', () => {
    const r = compile(SRC, { backend: webglBackend });
    assert.equal(r.success, true, r.diagnostics.map((d) => d.message).join('; '));
    const light = r.codeSections.get('light');
    assert.ok(light, 'has a light code section');
    // Light builtins pass through bare (the renderer declares them as locals).
    assert.match(light, /LIGHT_POSITION/);
    assert.match(light, /LIGHT_COLOR/);
    // FRAGCOORD is remapped like the fragment stage (light reuses the fragment map).
    assert.match(light, /gl_FragCoord/);
  });

  it('exposes a fragment body section alongside the untouched fragment main', () => {
    const r = compile(SRC, { backend: webglBackend });
    const body = r.codeSections.get('fragment_body');
    const main = r.codeSections.get('fragment');
    assert.ok(body, 'fragment_body present');
    assert.ok(main, 'fragment main present');
    assert.doesNotMatch(body, /void main/); // body only
    assert.match(main, /void main\(\)/); // main wrapper intact
  });
});
