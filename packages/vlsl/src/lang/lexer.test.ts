import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Lexer, type LexResult } from './lexer.js';
import { TokenKind, type TokenKindValue } from './tokens.js';

describe('Lexer', () => {
  function lex(source: string): LexResult {
    const lexer = new Lexer(source);
    return lexer.tokenize();
  }

  function kinds(source: string): TokenKindValue[] {
    return lex(source).tokens.map(t => t.kind);
  }

  it('tokenizes shader_type declaration', () => {
    const { tokens } = lex('shader_type canvas_item;');
    assert.equal(tokens[0].kind, TokenKind.ShaderType);
    assert.equal(tokens[1].kind, TokenKind.Identifier);
    assert.equal(tokens[1].text, 'canvas_item');
    assert.equal(tokens[2].kind, TokenKind.Semicolon);
    assert.equal(tokens[3].kind, TokenKind.Eof);
  });

  it('tokenizes integer literals', () => {
    const { tokens } = lex('42 0xFF');
    assert.equal(tokens[0].kind, TokenKind.IntLiteral);
    assert.equal(tokens[0].text, '42');
    assert.equal(tokens[1].kind, TokenKind.IntLiteral);
    assert.equal(tokens[1].text, '0xFF');
  });

  it('tokenizes uint literals', () => {
    const { tokens } = lex('42u 0xFFU');
    assert.equal(tokens[0].kind, TokenKind.UintLiteral);
    assert.equal(tokens[1].kind, TokenKind.UintLiteral);
  });

  it('tokenizes float literals', () => {
    const { tokens } = lex('1.0 .5 3.14f 1e10 2.5E-3');
    for (let i = 0; i < 5; i++) {
      assert.equal(tokens[i].kind, TokenKind.FloatLiteral);
    }
  });

  it('tokenizes string literals', () => {
    const { tokens } = lex('"hello world"');
    assert.equal(tokens[0].kind, TokenKind.StringLiteral);
    assert.equal(tokens[0].text, '"hello world"');
  });

  it('tokenizes type keywords', () => {
    const k = kinds('float vec2 mat4 sampler2D');
    assert.deepEqual(k.slice(0, 4), [
      TokenKind.Float, TokenKind.Vec2, TokenKind.Mat4, TokenKind.Sampler2D
    ]);
  });

  it('tokenizes operators', () => {
    const k = kinds('+ ++ += == != <= >= << >> && || <<= >>=');
    assert.deepEqual(k.slice(0, -1), [
      TokenKind.Plus, TokenKind.PlusPlus, TokenKind.PlusAssign,
      TokenKind.EqualEqual, TokenKind.BangEqual,
      TokenKind.LessEqual, TokenKind.GreaterEqual,
      TokenKind.LeftShift, TokenKind.RightShift,
      TokenKind.AmpAmp, TokenKind.PipePipe,
      TokenKind.LeftShiftAssign, TokenKind.RightShiftAssign,
    ]);
  });

  it('tokenizes punctuation', () => {
    const k = kinds('( ) [ ] { } ; , .');
    assert.deepEqual(k.slice(0, -1), [
      TokenKind.LeftParen, TokenKind.RightParen,
      TokenKind.LeftBracket, TokenKind.RightBracket,
      TokenKind.LeftBrace, TokenKind.RightBrace,
      TokenKind.Semicolon, TokenKind.Comma, TokenKind.Dot,
    ]);
  });

  it('tokenizes a uniform declaration', () => {
    const k = kinds('uniform float speed : hint_range(0.0, 10.0) = 1.0;');
    assert.equal(k[0], TokenKind.Uniform);
    assert.equal(k[1], TokenKind.Float);
    assert.equal(k[2], TokenKind.Identifier); // speed
    assert.equal(k[3], TokenKind.Colon);
    assert.equal(k[4], TokenKind.HintRange);
  });

  it('tracks line and column', () => {
    const { tokens } = lex('a\nb');
    assert.equal(tokens[0].line, 1);
    assert.equal(tokens[0].column, 1);
    assert.equal(tokens[1].line, 2);
    assert.equal(tokens[1].column, 1);
  });

  it('reports errors for invalid characters', () => {
    const { diagnostics } = lex('a @ b');
    assert.ok(diagnostics.length > 0);
    assert.equal(diagnostics[0].severity, 'error');
  });

  it('skips whitespace', () => {
    const { tokens } = lex('  a  \t  b  \n  c  ');
    assert.equal(tokens.filter(t => t.kind === TokenKind.Identifier).length, 3);
  });

  it('handles hint keywords', () => {
    const k = kinds('hint_default_white hint_normal filter_linear repeat_enable');
    assert.equal(k[0], TokenKind.HintDefaultWhite);
    assert.equal(k[1], TokenKind.HintNormal);
    assert.equal(k[2], TokenKind.FilterLinear);
    assert.equal(k[3], TokenKind.RepeatEnable);
  });

  it('distinguishes dot from float starting with dot', () => {
    const k = kinds('v.x .5');
    assert.equal(k[0], TokenKind.Identifier); // v
    assert.equal(k[1], TokenKind.Dot);        // .
    assert.equal(k[2], TokenKind.Identifier); // x
    assert.equal(k[3], TokenKind.FloatLiteral); // .5
  });

  it('handles all assignment operators', () => {
    const k = kinds('+= -= *= /= %= &= |= ^=');
    assert.deepEqual(k.slice(0, -1), [
      TokenKind.PlusAssign, TokenKind.MinusAssign,
      TokenKind.StarAssign, TokenKind.SlashAssign,
      TokenKind.PercentAssign, TokenKind.AmpAssign,
      TokenKind.PipeAssign, TokenKind.CaretAssign,
    ]);
  });

  it('handles tilde, question, colon', () => {
    const k = kinds('~ ? :');
    assert.deepEqual(k.slice(0, -1), [
      TokenKind.Tilde, TokenKind.Question, TokenKind.Colon
    ]);
  });

  it('tokenizes integer with f suffix as FloatLiteral', () => {
    const { tokens } = lex('42f');
    assert.equal(tokens.length, 2); // FloatLiteral + Eof
    assert.equal(tokens[0].kind, TokenKind.FloatLiteral);
    assert.equal(tokens[0].text, '42f');
  });

  it('emits a diagnostic error for 0x with no hex digits', () => {
    const { diagnostics } = lex('0x');
    assert.ok(diagnostics.length > 0);
    assert.equal(diagnostics[0].severity, 'error');
  });

  it('tokenizes stencil_mode as StencilMode keyword', () => {
    const { tokens } = lex('stencil_mode');
    assert.equal(tokens[0].kind, TokenKind.StencilMode);
    assert.equal(tokens[0].text, 'stencil_mode');
  });

  it('tracks column correctly after f suffix on integer', () => {
    const { tokens } = lex('42f x');
    assert.equal(tokens[0].kind, TokenKind.FloatLiteral);
    assert.equal(tokens[0].text, '42f');
    assert.equal(tokens[0].column, 1);
    // 'x' starts at column 5 (1-based: '4','2','f',' ','x')
    assert.equal(tokens[1].kind, TokenKind.Identifier);
    assert.equal(tokens[1].column, 5);
  });
});
