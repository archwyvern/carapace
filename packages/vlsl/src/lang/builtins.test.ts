import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getBuiltinVariables, getBuiltinFunctions, ShaderStage } from './builtins.js';
import type { Overload } from './builtins.js';
import { DataType } from './types.js';

describe('ShaderStage', () => {
  it('has all stages', () => {
    for (const s of ['Vertex', 'Fragment', 'Light', 'ParticleStart', 'ParticleProcess'] as const) {
      assert.equal(typeof ShaderStage[s], 'string');
    }
  });
});

describe('getBuiltinVariables', () => {
  it('returns canvas_item fragment variables', () => {
    const vars = getBuiltinVariables('canvas_item', ShaderStage.Fragment);
    const uv = vars.get('UV');
    assert.ok(uv);
    assert.equal(uv.type, DataType.Vec2);
    assert.equal(uv.access, 'read');
    const color = vars.get('COLOR');
    assert.ok(color);
    assert.equal(color.type, DataType.Vec4);
    assert.equal(color.access, 'readwrite');
    const fc = vars.get('FRAGCOORD');
    assert.ok(fc);
    assert.equal(fc.type, DataType.Vec4);
    assert.equal(fc.access, 'read');
  });

  it('returns canvas_item vertex variables', () => {
    const vars = getBuiltinVariables('canvas_item', ShaderStage.Vertex);
    assert.ok(vars.has('VERTEX'));
    assert.ok(vars.has('MODEL_MATRIX'));
  });

  it('returns global constants in all stages', () => {
    const vars = getBuiltinVariables('canvas_item', ShaderStage.Fragment);
    assert.ok(vars.has('TIME'));
    assert.ok(vars.has('PI'));
    assert.ok(vars.has('TAU'));
  });

  it('returns particle start variables', () => {
    const vars = getBuiltinVariables('particles', ShaderStage.ParticleStart);
    assert.ok(vars.has('COLOR'));
    assert.ok(vars.has('VELOCITY'));
    assert.ok(vars.has('LIFETIME'));
    assert.ok(vars.has('RESTART_POSITION'));
  });

  it('particle process has RESTART but not RESTART_POSITION', () => {
    const vars = getBuiltinVariables('particles', ShaderStage.ParticleProcess);
    assert.ok(vars.has('RESTART'));
    assert.ok(!vars.has('RESTART_POSITION'));
  });
});

describe('getBuiltinFunctions', () => {
  it('has sin/cos/tan overloads', () => {
    const fns = getBuiltinFunctions();
    const sinOverloads = fns.get('sin');
    assert.ok(sinOverloads);
    assert.ok(sinOverloads.length >= 4);
  });

  it('has texture sampling', () => {
    const fns = getBuiltinFunctions();
    assert.ok(fns.has('texture'));
    assert.ok(fns.has('textureLod'));
    assert.ok(fns.has('texelFetch'));
  });

  it('has custom builtins', () => {
    const fns = getBuiltinFunctions();
    assert.ok(fns.has('saturate'));
    assert.ok(fns.has('inverse_lerp'));
    assert.ok(fns.has('remap'));
  });

  it('has seed functions', () => {
    const fns = getBuiltinFunctions();
    assert.ok(fns.has('seed_set'));
    assert.ok(fns.has('seed_get'));
    assert.ok(fns.has('seed_push'));
    assert.ok(fns.has('seed_pop'));
  });

  it('restricts derivatives to fragment stage', () => {
    const fns = getBuiltinFunctions();
    const dfdx = fns.get('dFdx');
    assert.ok(dfdx);
    assert.ok(dfdx[0].stages!.includes('Fragment'));
    assert.ok(!dfdx[0].stages!.includes('Vertex'));
  });

  it('has geometric functions', () => {
    const fns = getBuiltinFunctions();
    assert.ok(fns.has('length'));
    assert.ok(fns.has('distance'));
    assert.ok(fns.has('dot'));
    assert.ok(fns.has('cross'));
    assert.ok(fns.has('normalize'));
    assert.ok(fns.has('reflect'));
    assert.ok(fns.has('refract'));
  });

  it('has common math functions', () => {
    const fns = getBuiltinFunctions();
    assert.ok(fns.has('abs'));
    assert.ok(fns.has('sign'));
    assert.ok(fns.has('floor'));
    assert.ok(fns.has('ceil'));
    assert.ok(fns.has('fract'));
    assert.ok(fns.has('mod'));
    assert.ok(fns.has('min'));
    assert.ok(fns.has('max'));
    assert.ok(fns.has('clamp'));
    assert.ok(fns.has('mix'));
    assert.ok(fns.has('step'));
    assert.ok(fns.has('smoothstep'));
  });

  it('has vector comparison functions', () => {
    const fns = getBuiltinFunctions();
    assert.ok(fns.has('lessThan'));
    assert.ok(fns.has('greaterThan'));
    assert.ok(fns.has('equal'));
    assert.ok(fns.has('notEqual'));
    assert.ok(fns.has('any'));
    assert.ok(fns.has('all'));
  });

  it('has bit reinterpret functions', () => {
    const fns = getBuiltinFunctions();
    assert.ok(fns.has('floatBitsToInt'));
    assert.ok(fns.has('intBitsToFloat'));
  });

  it('has textureSize', () => {
    const fns = getBuiltinFunctions();
    assert.ok(fns.has('textureSize'));
  });

  it('bitCount returns vector types for vector inputs', () => {
    const fns = getBuiltinFunctions();
    const overloads = fns.get('bitCount');
    assert.ok(overloads);

    // Find the overload that takes ivec2 -> should return ivec2
    const ivec2Ov = overloads.find((o: Overload) => o.params[0] === DataType.Ivec2);
    assert.ok(ivec2Ov);
    assert.equal(ivec2Ov.returnType, DataType.Ivec2);

    // Find the overload that takes uvec3 -> should return ivec3
    const uvec3Ov = overloads.find((o: Overload) => o.params[0] === DataType.Uvec3);
    assert.ok(uvec3Ov);
    assert.equal(uvec3Ov.returnType, DataType.Ivec3);

    // Scalar uint -> int
    const uintOv = overloads.find((o: Overload) => o.params[0] === DataType.Uint);
    assert.ok(uintOv);
    assert.equal(uintOv.returnType, DataType.Int);

    // Scalar int -> int
    const intOv = overloads.find((o: Overload) => o.params[0] === DataType.Int);
    assert.ok(intOv);
    assert.equal(intOv.returnType, DataType.Int);
  });
});
