import { Token, TokenKind, TokenKindValue, KEYWORDS, TYPE_KEYWORDS, HINT_KEYWORDS,
         FILTER_REPEAT_KEYWORDS } from './tokens.js';
import { Diagnostic } from './diagnostic.js';

const MEMBER_ACCESS_KINDS: Set<TokenKindValue> = new Set([
  TokenKind.Identifier,
  TokenKind.RightParen,
  TokenKind.RightBracket,
  TokenKind.PlusPlus,
  TokenKind.MinusMinus,
  TokenKind.IntLiteral,
  TokenKind.UintLiteral,
  TokenKind.FloatLiteral,
]);

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isHexDigit(ch: string): boolean {
  return (ch >= '0' && ch <= '9') ||
         (ch >= 'a' && ch <= 'f') ||
         (ch >= 'A' && ch <= 'F');
}

function isAlpha(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') ||
         (ch >= 'A' && ch <= 'Z') ||
         ch === '_';
}

function isAlphaNumeric(ch: string): boolean {
  return isAlpha(ch) || isDigit(ch);
}

export interface LexResult {
  tokens: Token[];
  diagnostics: Diagnostic[];
}

export class Lexer
{
  source: string;
  pos: number;
  line: number;
  column: number;
  tokens: Token[];
  diagnostics: Diagnostic[];
  private _lastTokenEnd: number;

  constructor(source: string)
  {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
    this.diagnostics = [];
    this._lastTokenEnd = 0;
  }

  tokenize(): LexResult
  {
    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;
      this._scanToken();
    }
    this.tokens.push(new Token(TokenKind.Eof, '', this.line, this.column));
    return { tokens: this.tokens, diagnostics: this.diagnostics };
  }

  private _peek(offset: number = 0): string
  {
    const i = this.pos + offset;
    return i < this.source.length ? this.source[i] : '\0';
  }

  private _advance(): string
  {
    const ch = this.source[this.pos];
    this.pos++;
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  private _emit(kind: TokenKindValue, text: string, line: number, column: number): void
  {
    this.tokens.push(new Token(kind, text, line, column));
    this._lastTokenEnd = this.pos;
  }

  private _lastTokenKind(): TokenKindValue | null
  {
    if (this.tokens.length === 0) return null;
    return this.tokens[this.tokens.length - 1].kind;
  }

  skipWhitespace(): void
  {
    while (this.pos < this.source.length) {
      const ch = this._peek();
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this._advance();
      } else {
        break;
      }
    }
  }

  private _scanToken(): void
  {
    const line = this.line;
    const col = this.column;
    const ch = this._peek();

    // Identifier or keyword
    if (isAlpha(ch)) {
      this._scanIdentifierOrKeyword(line, col);
      return;
    }

    // Number starting with digit
    if (isDigit(ch)) {
      this._scanNumber(line, col);
      return;
    }

    // Float starting with dot (.5, .25 etc.)
    if (ch === '.') {
      const next = this._peek(1);
      if (isDigit(next)) {
        // It's a float literal only if there's no immediately-adjacent member-
        // access token. "Adjacent" means the dot is at the same source position
        // as where the last token ended (no intervening whitespace).
        const lastKind = this._lastTokenKind();
        const adjacentToToken =
          this._lastTokenEnd === this.pos &&
          lastKind !== null &&
          MEMBER_ACCESS_KINDS.has(lastKind);
        if (!adjacentToToken) {
          this._scanFloatFromDot(line, col);
          return;
        }
      }
      // Regular dot punctuation
      this._advance();
      this._emit(TokenKind.Dot, '.', line, col);
      return;
    }

    // String literal
    if (ch === '"') {
      this._scanStringLiteral(line, col);
      return;
    }

    // Operators and punctuation
    this._scanOperatorOrPunctuation(line, col);
  }

  private _scanIdentifierOrKeyword(line: number, col: number): void
  {
    let text = '';
    while (this.pos < this.source.length && isAlphaNumeric(this._peek())) {
      text += this._advance();
    }

    // Keyword lookup in priority order
    const kind =
      KEYWORDS.get(text) ??
      TYPE_KEYWORDS.get(text) ??
      HINT_KEYWORDS.get(text) ??
      FILTER_REPEAT_KEYWORDS.get(text) ??
      TokenKind.Identifier;

    this._emit(kind, text, line, col);
  }

  private _scanNumber(line: number, col: number): void
  {
    const start = this.pos;

    // Hex literal
    if (this._peek() === '0' && (this._peek(1) === 'x' || this._peek(1) === 'X')) {
      this._advance(); // 0
      this._advance(); // x/X
      const hexStart = this.pos;
      while (this.pos < this.source.length && isHexDigit(this._peek())) {
        this._advance();
      }
      if (this.pos === hexStart) {
        this.diagnostics.push(
          Diagnostic.error('Hex literal has no digits', line, col)
        );
      }
      const text = this.source.slice(start, this.pos);
      const next = this._peek();
      if (next === 'u' || next === 'U') {
        const fullText = text + this._advance();
        this._emit(TokenKind.UintLiteral, fullText, line, col);
      } else {
        this._emit(TokenKind.IntLiteral, text, line, col);
      }
      return;
    }

    // Decimal: consume digits
    while (this.pos < this.source.length && isDigit(this._peek())) {
      this._advance();
    }

    // Unsigned integer suffix?
    const afterDigits = this._peek();
    if (afterDigits === 'u' || afterDigits === 'U') {
      // Check it's not followed by more alphanumeric (which would make it an identifier)
      const text = this.source.slice(start, this.pos);
      const suffix = this._advance();
      this._emit(TokenKind.UintLiteral, text + suffix, line, col);
      return;
    }

    // Float suffix on plain integer (e.g. 42f)?
    if (afterDigits === 'f' || afterDigits === 'F') {
      this._advance(); // consume the suffix (use _advance for correct column tracking)
      const text = this.source.slice(start, this.pos);
      this._emit(TokenKind.FloatLiteral, text, line, col);
      return;
    }

    // Float: decimal point or exponent?
    const isFloat =
      (this._peek() === '.' && isDigit(this._peek(1))) ||
      (this._peek() === '.' && this._peek(1) !== '.' && !isAlpha(this._peek(1))) ||
      this._peek() === 'e' ||
      this._peek() === 'E';

    if (isFloat) {
      this._scanFloatTail(start, line, col);
      return;
    }

    // Plain integer
    const text = this.source.slice(start, this.pos);
    this._emit(TokenKind.IntLiteral, text, line, col);
  }

  private _scanFloatTail(start: number, line: number, col: number): void
  {
    // Optional decimal part
    if (this._peek() === '.') {
      this._advance(); // consume '.'
      while (this.pos < this.source.length && isDigit(this._peek())) {
        this._advance();
      }
    }

    // Optional exponent
    if (this._peek() === 'e' || this._peek() === 'E') {
      this._advance(); // consume e/E
      if (this._peek() === '+' || this._peek() === '-') {
        this._advance(); // consume sign
      }
      while (this.pos < this.source.length && isDigit(this._peek())) {
        this._advance();
      }
    }

    // Optional f/F suffix
    if (this._peek() === 'f' || this._peek() === 'F') {
      this._advance();
    }

    const text = this.source.slice(start, this.pos);
    this._emit(TokenKind.FloatLiteral, text, line, col);
  }

  private _scanFloatFromDot(line: number, col: number): void
  {
    const start = this.pos;
    this._advance(); // consume '.'
    while (this.pos < this.source.length && isDigit(this._peek())) {
      this._advance();
    }

    // Optional exponent
    if (this._peek() === 'e' || this._peek() === 'E') {
      this._advance();
      if (this._peek() === '+' || this._peek() === '-') {
        this._advance();
      }
      while (this.pos < this.source.length && isDigit(this._peek())) {
        this._advance();
      }
    }

    // Optional f/F suffix
    if (this._peek() === 'f' || this._peek() === 'F') {
      this._advance();
    }

    const text = this.source.slice(start, this.pos);
    this._emit(TokenKind.FloatLiteral, text, line, col);
  }

  private _scanStringLiteral(line: number, col: number): void
  {
    const start = this.pos;
    this._advance(); // opening "
    while (this.pos < this.source.length) {
      const ch = this._peek();
      if (ch === '\n' || ch === '\r') {
        this.diagnostics.push(
          Diagnostic.error('Unterminated string literal', line, col)
        );
        break;
      }
      if (ch === '\\') {
        this._advance(); // backslash
        if (this.pos < this.source.length) {
          this._advance(); // escaped character
        }
        continue;
      }
      if (ch === '"') {
        this._advance(); // closing "
        break;
      }
      this._advance();
    }
    const text = this.source.slice(start, this.pos);
    this._emit(TokenKind.StringLiteral, text, line, col);
  }

  private _scanOperatorOrPunctuation(line: number, col: number): void
  {
    const ch = this._advance();

    switch (ch) {
      case '(':  this._emit(TokenKind.LeftParen,    ch, line, col); break;
      case ')':  this._emit(TokenKind.RightParen,   ch, line, col); break;
      case '[':  this._emit(TokenKind.LeftBracket,  ch, line, col); break;
      case ']':  this._emit(TokenKind.RightBracket, ch, line, col); break;
      case '{':  this._emit(TokenKind.LeftBrace,    ch, line, col); break;
      case '}':  this._emit(TokenKind.RightBrace,   ch, line, col); break;
      case ';':  this._emit(TokenKind.Semicolon,    ch, line, col); break;
      case ',':  this._emit(TokenKind.Comma,        ch, line, col); break;
      case '~':  this._emit(TokenKind.Tilde,        ch, line, col); break;
      case '?':  this._emit(TokenKind.Question,     ch, line, col); break;
      case ':':  this._emit(TokenKind.Colon,        ch, line, col); break;

      case '+':
        if (this._peek() === '+') {
          this._advance();
          this._emit(TokenKind.PlusPlus, '++', line, col);
        } else if (this._peek() === '=') {
          this._advance();
          this._emit(TokenKind.PlusAssign, '+=', line, col);
        } else {
          this._emit(TokenKind.Plus, '+', line, col);
        }
        break;

      case '-':
        if (this._peek() === '-') {
          this._advance();
          this._emit(TokenKind.MinusMinus, '--', line, col);
        } else if (this._peek() === '=') {
          this._advance();
          this._emit(TokenKind.MinusAssign, '-=', line, col);
        } else {
          this._emit(TokenKind.Minus, '-', line, col);
        }
        break;

      case '*':
        if (this._peek() === '=') {
          this._advance();
          this._emit(TokenKind.StarAssign, '*=', line, col);
        } else {
          this._emit(TokenKind.Star, '*', line, col);
        }
        break;

      case '/':
        if (this._peek() === '=') {
          this._advance();
          this._emit(TokenKind.SlashAssign, '/=', line, col);
        } else {
          this._emit(TokenKind.Slash, '/', line, col);
        }
        break;

      case '%':
        if (this._peek() === '=') {
          this._advance();
          this._emit(TokenKind.PercentAssign, '%=', line, col);
        } else {
          this._emit(TokenKind.Percent, '%', line, col);
        }
        break;

      case '=':
        if (this._peek() === '=') {
          this._advance();
          this._emit(TokenKind.EqualEqual, '==', line, col);
        } else {
          this._emit(TokenKind.Assign, '=', line, col);
        }
        break;

      case '!':
        if (this._peek() === '=') {
          this._advance();
          this._emit(TokenKind.BangEqual, '!=', line, col);
        } else {
          this._emit(TokenKind.Bang, '!', line, col);
        }
        break;

      case '<':
        if (this._peek() === '<') {
          this._advance();
          if (this._peek() === '=') {
            this._advance();
            this._emit(TokenKind.LeftShiftAssign, '<<=', line, col);
          } else {
            this._emit(TokenKind.LeftShift, '<<', line, col);
          }
        } else if (this._peek() === '=') {
          this._advance();
          this._emit(TokenKind.LessEqual, '<=', line, col);
        } else {
          this._emit(TokenKind.Less, '<', line, col);
        }
        break;

      case '>':
        if (this._peek() === '>') {
          this._advance();
          if (this._peek() === '=') {
            this._advance();
            this._emit(TokenKind.RightShiftAssign, '>>=', line, col);
          } else {
            this._emit(TokenKind.RightShift, '>>', line, col);
          }
        } else if (this._peek() === '=') {
          this._advance();
          this._emit(TokenKind.GreaterEqual, '>=', line, col);
        } else {
          this._emit(TokenKind.Greater, '>', line, col);
        }
        break;

      case '&':
        if (this._peek() === '&') {
          this._advance();
          this._emit(TokenKind.AmpAmp, '&&', line, col);
        } else if (this._peek() === '=') {
          this._advance();
          this._emit(TokenKind.AmpAssign, '&=', line, col);
        } else {
          this._emit(TokenKind.Amp, '&', line, col);
        }
        break;

      case '|':
        if (this._peek() === '|') {
          this._advance();
          this._emit(TokenKind.PipePipe, '||', line, col);
        } else if (this._peek() === '=') {
          this._advance();
          this._emit(TokenKind.PipeAssign, '|=', line, col);
        } else {
          this._emit(TokenKind.Pipe, '|', line, col);
        }
        break;

      case '^':
        if (this._peek() === '=') {
          this._advance();
          this._emit(TokenKind.CaretAssign, '^=', line, col);
        } else {
          this._emit(TokenKind.Caret, '^', line, col);
        }
        break;

      default:
        this.diagnostics.push(
          Diagnostic.error(`Unexpected character '${ch}'`, line, col)
        );
        break;
    }
  }
}
