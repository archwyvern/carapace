import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compile, assembleFragmentShader } from '../../index.js';
import { webglBackend } from './index.js';

// The Godot-faithful per-instance pattern: vertex() reads INSTANCE_CUSTOM / INSTANCE_ID
// (canvas_item vertex builtins) and passes the value to fragment() via a varying.
const SRC = `shader_type canvas_item;
varying vec4 c;
void vertex() { c = INSTANCE_CUSTOM * float(INSTANCE_ID); UV = UV; }
void fragment() { COLOR = c; }`;

describe('webgl vertex stage', () => {
  it('compiles vertex() + varying into a vertex body section, builtins bare', () => {
    const r = compile(SRC, { backend: webglBackend });
    assert.equal(r.success, true, r.diagnostics.map((d) => d.message).join('; '));
    const vtx = r.codeSections.get('vertex');
    assert.ok(vtx, 'has a vertex code section');
    assert.match(vtx, /INSTANCE_CUSTOM/);
    assert.match(vtx, /INSTANCE_ID/);
    // UV is a writable local in the vertex stage — NOT remapped to the fragment varying.
    assert.doesNotMatch(vtx, /v_uv/);
  });

  it('exposes the varying and declares it as `in` in the fragment', () => {
    const r = compile(SRC, { backend: webglBackend });
    assert.equal(r.varyings.length, 1);
    assert.equal(r.varyings[0].name, 'c');
    assert.equal(r.varyings[0].glslType, 'vec4');
    assert.match(assembleFragmentShader(r), /in vec4 c;/);
  });
});
