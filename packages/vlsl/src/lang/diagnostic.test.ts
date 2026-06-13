import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Diagnostic, DiagnosticSeverity } from './diagnostic.js';

describe('Diagnostic', () => {
  it('creates an error diagnostic', () => {
    const d = Diagnostic.error('unexpected token', 10, 5);
    assert.equal(d.severity, DiagnosticSeverity.Error);
    assert.equal(d.message, 'unexpected token');
    assert.equal(d.line, 10);
    assert.equal(d.column, 5);
  });

  it('creates a warning diagnostic', () => {
    const d = Diagnostic.warning('unused variable', 3, 1);
    assert.equal(d.severity, DiagnosticSeverity.Warning);
  });

  it('formats to string', () => {
    const d = Diagnostic.error('bad', 1, 2, 'test.shader');
    assert.equal(d.toString(), 'test.shader:1:2: error: bad');
  });

  it('formats without filename', () => {
    const d = Diagnostic.error('bad', 1, 2);
    assert.equal(d.toString(), '1:2: error: bad');
  });
});
