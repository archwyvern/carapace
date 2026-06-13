import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DataType, TypeInfo, typeFromTokenKind, isScalar, isVector,
         isMatrix, isSampler, scalarComponentOf, vectorComponentCount,
         matrixDimensions } from './types.js';
import { TokenKind } from './tokens.js';

describe('DataType', () => {
  it('has all scalar types', () => {
    for (const t of ['Bool', 'Int', 'Uint', 'Float'] as const) {
      assert.equal(typeof DataType[t], 'string');
    }
  });

  it('has all vector types', () => {
    assert.equal(typeof DataType.Vec2, 'string');
    assert.equal(typeof DataType.Ivec3, 'string');
    assert.equal(typeof DataType.Bvec4, 'string');
  });

  it('has all matrix types including non-square', () => {
    assert.equal(typeof DataType.Mat4, 'string');
    assert.equal(typeof DataType.Mat2x3, 'string');
    assert.equal(typeof DataType.Mat4x3, 'string');
  });

  it('has void', () => {
    assert.equal(typeof DataType.Void, 'string');
  });
});

describe('TypeInfo', () => {
  it('represents a plain scalar', () => {
    const t = new TypeInfo(DataType.Float);
    assert.equal(t.type, DataType.Float);
    assert.equal(t.arraySize, 0);
    assert.equal(t.structName, null);
    assert.equal(t.isConst, false);
  });

  it('represents an array', () => {
    const t = new TypeInfo(DataType.Vec3, { arraySize: 5 });
    assert.equal(t.arraySize, 5);
  });

  it('represents a struct', () => {
    const t = new TypeInfo(DataType.Struct, { structName: 'MyData' });
    assert.equal(t.structName, 'MyData');
  });
});

describe('typeFromTokenKind', () => {
  it('maps Float token to Float type', () => {
    assert.equal(typeFromTokenKind(TokenKind.Float), DataType.Float);
  });

  it('maps Vec4 token to Vec4 type', () => {
    assert.equal(typeFromTokenKind(TokenKind.Vec4), DataType.Vec4);
  });

  it('maps Void token to Void type', () => {
    assert.equal(typeFromTokenKind(TokenKind.Void), DataType.Void);
  });

  it('returns null for non-type tokens', () => {
    assert.equal(typeFromTokenKind(TokenKind.If), null);
  });
});

describe('type utilities', () => {
  it('classifies scalars', () => {
    assert.equal(isScalar(DataType.Float), true);
    assert.equal(isScalar(DataType.Vec2), false);
  });

  it('classifies vectors', () => {
    assert.equal(isVector(DataType.Vec3), true);
    assert.equal(isVector(DataType.Float), false);
  });

  it('classifies matrices', () => {
    assert.equal(isMatrix(DataType.Mat4), true);
    assert.equal(isMatrix(DataType.Mat2x3), true);
    assert.equal(isMatrix(DataType.Float), false);
  });

  it('classifies samplers', () => {
    assert.equal(isSampler(DataType.Sampler2D), true);
    assert.equal(isSampler(DataType.Float), false);
  });

  it('gets scalar component of vector', () => {
    assert.equal(scalarComponentOf(DataType.Vec3), DataType.Float);
    assert.equal(scalarComponentOf(DataType.Ivec2), DataType.Int);
    assert.equal(scalarComponentOf(DataType.Bvec4), DataType.Bool);
    assert.equal(scalarComponentOf(DataType.Float), DataType.Float);
  });

  it('gets vector component count', () => {
    assert.equal(vectorComponentCount(DataType.Vec4), 4);
    assert.equal(vectorComponentCount(DataType.Bvec2), 2);
    assert.equal(vectorComponentCount(DataType.Float), 1);
  });

  it('gets matrix dimensions', () => {
    assert.deepEqual(matrixDimensions(DataType.Mat4), { cols: 4, rows: 4 });
    assert.deepEqual(matrixDimensions(DataType.Mat2x3), { cols: 2, rows: 3 });
  });
});
