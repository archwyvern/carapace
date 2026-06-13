import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TokenKind, Token, KEYWORDS, TYPE_KEYWORDS, HINT_KEYWORDS, FILTER_REPEAT_KEYWORDS } from './tokens.js';

describe('TokenKind', () => {
  it('has identifier and literal kinds', () => {
    assert.equal(typeof TokenKind.Identifier, 'string');
    assert.equal(typeof TokenKind.IntLiteral, 'string');
    assert.equal(typeof TokenKind.FloatLiteral, 'string');
    assert.equal(typeof TokenKind.UintLiteral, 'string');
    assert.equal(typeof TokenKind.StringLiteral, 'string');
  });

  it('has all keyword kinds', () => {
    assert.equal(typeof TokenKind.ShaderType, 'string');
    assert.equal(typeof TokenKind.RenderMode, 'string');
    assert.equal(typeof TokenKind.Struct, 'string');
    assert.equal(typeof TokenKind.Uniform, 'string');
    assert.equal(typeof TokenKind.Varying, 'string');
    assert.equal(typeof TokenKind.Const, 'string');
    assert.equal(typeof TokenKind.If, 'string');
    assert.equal(typeof TokenKind.For, 'string');
    assert.equal(typeof TokenKind.While, 'string');
    assert.equal(typeof TokenKind.Return, 'string');
    assert.equal(typeof TokenKind.Discard, 'string');
  });

  it('has operator kinds', () => {
    assert.equal(typeof TokenKind.Plus, 'string');
    assert.equal(typeof TokenKind.PlusPlus, 'string');
    assert.equal(typeof TokenKind.PlusAssign, 'string');
    assert.equal(typeof TokenKind.AmpAmp, 'string');
    assert.equal(typeof TokenKind.PipePipe, 'string');
  });

  it('has punctuation kinds', () => {
    assert.equal(typeof TokenKind.LeftParen, 'string');
    assert.equal(typeof TokenKind.RightParen, 'string');
    assert.equal(typeof TokenKind.LeftBrace, 'string');
    assert.equal(typeof TokenKind.Semicolon, 'string');
    assert.equal(typeof TokenKind.Dot, 'string');
  });

  it('has EOF', () => {
    assert.equal(typeof TokenKind.Eof, 'string');
  });
});

describe('Token', () => {
  it('stores kind, text, line, column', () => {
    const t = new Token(TokenKind.Identifier, 'foo', 1, 5);
    assert.equal(t.kind, TokenKind.Identifier);
    assert.equal(t.text, 'foo');
    assert.equal(t.line, 1);
    assert.equal(t.column, 5);
  });
});

describe('KEYWORDS', () => {
  it('maps keyword strings to token kinds', () => {
    assert.equal(KEYWORDS.get('shader_type'), TokenKind.ShaderType);
    assert.equal(KEYWORDS.get('if'), TokenKind.If);
    assert.equal(KEYWORDS.get('return'), TokenKind.Return);
    assert.equal(KEYWORDS.get('true'), TokenKind.True);
    assert.equal(KEYWORDS.get('false'), TokenKind.False);
  });

  it('maps type keywords', () => {
    assert.equal(TYPE_KEYWORDS.get('float'), TokenKind.Float);
    assert.equal(TYPE_KEYWORDS.get('vec2'), TokenKind.Vec2);
    assert.equal(TYPE_KEYWORDS.get('mat4'), TokenKind.Mat4);
    assert.equal(TYPE_KEYWORDS.get('sampler2D'), TokenKind.Sampler2D);
  });

  it('maps hint keywords', () => {
    assert.equal(HINT_KEYWORDS.get('hint_range'), TokenKind.HintRange);
    assert.equal(HINT_KEYWORDS.get('hint_default_white'), TokenKind.HintDefaultWhite);
    assert.equal(HINT_KEYWORDS.get('hint_normal'), TokenKind.HintNormal);
    assert.equal(HINT_KEYWORDS.get('source_color'), TokenKind.SourceColor);
    assert.equal(HINT_KEYWORDS.get('instance_index'), TokenKind.InstanceIndex);
  });

  it('maps filter/repeat keywords', () => {
    assert.equal(FILTER_REPEAT_KEYWORDS.get('filter_nearest'), TokenKind.FilterNearest);
    assert.equal(FILTER_REPEAT_KEYWORDS.get('filter_linear'), TokenKind.FilterLinear);
    assert.equal(FILTER_REPEAT_KEYWORDS.get('repeat_enable'), TokenKind.RepeatEnable);
  });
});
