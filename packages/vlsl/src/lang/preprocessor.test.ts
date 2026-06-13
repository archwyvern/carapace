import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Preprocessor, type PreprocessorResult } from './preprocessor.js';

describe('Preprocessor', () => {
  function pp(source: string, options?: { macros?: Record<string, string | number> }): PreprocessorResult {
    const p = new Preprocessor(source, options);
    return p.process();
  }

  describe('comment stripping', () => {
    it('strips line comments', () => {
      const { output } = pp('a // comment\nb');
      assert.ok(!output.includes('comment'));
      assert.ok(output.includes('a'));
      assert.ok(output.includes('b'));
    });

    it('strips block comments preserving newlines', () => {
      const { output } = pp('a /* block\ncomment */ b');
      assert.ok(!output.includes('block'));
      assert.ok(output.includes('a'));
      assert.ok(output.includes('b'));
      assert.ok(output.includes('\n'));
    });

    it('does not strip inside string literals', () => {
      const { output } = pp('x = "hello // world"');
      assert.ok(output.includes('hello // world'));
    });
  });

  describe('#define / macro expansion', () => {
    it('expands object-like macros', () => {
      const { output } = pp('#define FOO 42\nint x = FOO;');
      assert.ok(output.includes('int x = 42;'));
    });

    it('expands function-like macros', () => {
      const { output } = pp('#define ADD(a, b) (a + b)\nint x = ADD(1, 2);');
      assert.ok(output.includes('(1 + 2)'));
    });

    it('handles #undef', () => {
      const { output } = pp('#define FOO 1\n#undef FOO\nint x = FOO;');
      assert.ok(output.includes('FOO'));
    });

    it('handles token pasting ##', () => {
      const { output } = pp('#define PASTE(a, b) a ## b\nint PASTE(my, Var);');
      assert.ok(output.includes('myVar'));
    });

    it('handles line continuation', () => {
      const { output } = pp('#define LONG 1 + \\\n2\nint x = LONG;');
      assert.ok(output.includes('1 + 2'));
    });

    it('does not expand macros inside strings', () => {
      const { output } = pp('#define FOO bar\nchar x = "FOO";');
      assert.ok(output.includes('"FOO"'));
      assert.ok(!output.includes('"bar"'));
    });
  });

  describe('conditionals', () => {
    it('handles #ifdef / #endif', () => {
      const { output } = pp('#define FOO\n#ifdef FOO\nyes\n#endif');
      assert.ok(output.includes('yes'));
    });

    it('skips #ifdef when not defined', () => {
      const { output } = pp('#ifdef FOO\nno\n#endif');
      assert.ok(!output.includes('no'));
    });

    it('handles #ifndef', () => {
      const { output } = pp('#ifndef FOO\nyes\n#endif');
      assert.ok(output.includes('yes'));
    });

    it('handles #if with defined()', () => {
      const { output } = pp('#define X\n#if defined(X)\nyes\n#endif');
      assert.ok(output.includes('yes'));
    });

    it('handles #if with integer expression', () => {
      const { output } = pp('#define VER 2\n#if VER > 1\nyes\n#endif');
      assert.ok(output.includes('yes'));
    });

    it('handles #elif', () => {
      const { output } = pp('#define X 2\n#if X == 1\na\n#elif X == 2\nb\n#else\nc\n#endif');
      assert.ok(!output.includes('\na\n'));
      assert.ok(output.includes('b'));
      assert.ok(!output.includes('\nc\n'));
    });

    it('undefined macros evaluate to 0 in #if', () => {
      const { output } = pp('#if UNDEF\nno\n#else\nyes\n#endif');
      assert.ok(output.includes('yes'));
    });

    it('handles nested conditionals', () => {
      const { output } = pp('#define A\n#ifdef A\n#ifdef B\nno\n#else\nyes\n#endif\n#endif');
      assert.ok(output.includes('yes'));
      assert.ok(!output.includes('no'));
    });
  });

  describe('#include <library>', () => {
    it('records library includes', () => {
      const { libraries } = pp('#include <noise>\n#include <ease>');
      assert.ok(libraries.has('noise'));
      assert.ok(libraries.has('ease'));
    });
  });

  describe('#error', () => {
    it('produces a diagnostic', () => {
      const { diagnostics } = pp('#error something went wrong');
      assert.equal(diagnostics.length, 1);
      assert.ok(diagnostics[0].message.includes('something went wrong'));
    });
  });

  describe('predefined macros', () => {
    it('accepts predefined macros', () => {
      const { output } = pp('int x = VER;', { macros: { VER: '5' } });
      assert.ok(output.includes('int x = 5;'));
    });
  });

  describe('source map', () => {
    it('maps output lines back to source lines', () => {
      const { sourceMap } = pp('#define FOO 1\nint x = FOO;\n');
      assert.ok(sourceMap.length > 0);
    });
  });
});
