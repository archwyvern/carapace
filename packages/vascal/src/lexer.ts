import { BlockTokenKind, type BlockToken, type Diagnostic } from "./tokens.js";

const REPLACEMENT_CHAR = "�";

function isLetter(c: string): boolean {
  // Matches char.IsLetter (Unicode letters). The corpus is ASCII-identifier, but we keep the
  // C# semantics: any Unicode letter starts an identifier.
  return c.length === 1 && /\p{L}/u.test(c);
}

function isDigit(c: string): boolean {
  return c >= "0" && c <= "9";
}

function isLetterOrDigit(c: string): boolean {
  return isDigit(c) || isLetter(c);
}

/**
 * Tokenizes the block-grammar Vascal text. Faithful port of the C# `BlockLexer`.
 */
export class BlockLexer {
  private readonly _source: string;
  private readonly _sourceName: string | undefined;
  private readonly _diagnostics: Diagnostic[];
  private _pos = 0;

  constructor(source: string, sourceName: string | undefined, diagnostics: Diagnostic[]) {
    this._source = source;
    this._sourceName = sourceName;
    this._diagnostics = diagnostics;
  }

  lex(): BlockToken[] {
    const tokens: BlockToken[] = [];
    this._pos = 0;

    while (this._pos < this._source.length) {
      this.skipWhitespaceAndComments();

      if (this._pos >= this._source.length) {
        break;
      }

      const c = this._source[this._pos]!;

      if (c === "\n" || c === "\r") {
        this.consumeNewlines();
        this.emitNewlineIfNeeded(tokens);
        continue;
      }

      if (isLetter(c) || c === "_") {
        tokens.push(this.lexIdentifier());
        continue;
      }

      if (isDigit(c)) {
        tokens.push(this.lexNumber());
        continue;
      }

      if (c === "-" && this._pos + 1 < this._source.length && isDigit(this._source[this._pos + 1]!)) {
        tokens.push(this.lexNumber());
        continue;
      }

      if (c === '"') {
        tokens.push(this.lexString());
        continue;
      }

      tokens.push(this.lexPunctuation());
    }

    tokens.push({ kind: BlockTokenKind.EndOfFile, text: "", start: this._pos, length: 0 });
    return tokens;
  }

  private skipWhitespaceAndComments(): void {
    while (this._pos < this._source.length) {
      const c = this._source[this._pos]!;

      if (c === " " || c === "\t") {
        this._pos++;
        continue;
      }

      if (c === "/" && this._pos + 1 < this._source.length && this._source[this._pos + 1] === "/") {
        while (this._pos < this._source.length && this._source[this._pos] !== "\n") {
          this._pos++;
        }
        continue;
      }

      break;
    }
  }

  private consumeNewlines(): void {
    while (this._pos < this._source.length) {
      const c = this._source[this._pos]!;
      if (c === "\n") {
        this._pos++;
      } else if (c === "\r") {
        this._pos++;
        if (this._pos < this._source.length && this._source[this._pos] === "\n") {
          this._pos++;
        }
      } else if (c === " " || c === "\t") {
        this._pos++;
      } else if (c === "/" && this._pos + 1 < this._source.length && this._source[this._pos + 1] === "/") {
        while (this._pos < this._source.length && this._source[this._pos] !== "\n") {
          this._pos++;
        }
      } else {
        break;
      }
    }
  }

  private emitNewlineIfNeeded(tokens: BlockToken[]): void {
    if (tokens.length === 0) {
      return;
    }

    const lastKind = tokens[tokens.length - 1]!.kind;

    if (lastKind === BlockTokenKind.Newline) {
      return;
    }

    // Suppress newlines after a token that expects a continuation: an open bracket/brace/paren,
    // a member/map colon, a node-attribute equals, a comma, a flag pipe, or an enum dot. This lets
    // values span lines.
    if (
      lastKind === BlockTokenKind.LBrace ||
      lastKind === BlockTokenKind.LBracket ||
      lastKind === BlockTokenKind.LParen ||
      lastKind === BlockTokenKind.Colon ||
      lastKind === BlockTokenKind.Equals ||
      lastKind === BlockTokenKind.Comma ||
      lastKind === BlockTokenKind.Pipe ||
      lastKind === BlockTokenKind.Dot
    ) {
      return;
    }

    tokens.push({ kind: BlockTokenKind.Newline, text: "\n", start: 0, length: 0 });
  }

  private lexIdentifier(): BlockToken {
    const start = this._pos;
    while (
      this._pos < this._source.length &&
      (isLetterOrDigit(this._source[this._pos]!) || this._source[this._pos] === "_")
    ) {
      this._pos++;
    }

    const text = this._source.slice(start, this._pos);
    return { kind: BlockTokenKind.Identifier, text, start, length: this._pos - start };
  }

  private lexNumber(): BlockToken {
    const start = this._pos;

    if (this._source[this._pos] === "-") {
      this._pos++;
    }

    while (this._pos < this._source.length && isDigit(this._source[this._pos]!)) {
      this._pos++;
    }

    if (
      this._pos < this._source.length &&
      this._source[this._pos] === "." &&
      this._pos + 1 < this._source.length &&
      isDigit(this._source[this._pos + 1]!)
    ) {
      this._pos++;
      while (this._pos < this._source.length && isDigit(this._source[this._pos]!)) {
        this._pos++;
      }
    }

    const text = this._source.slice(start, this._pos);
    return { kind: BlockTokenKind.Number, text, start, length: this._pos - start };
  }

  private lexString(): BlockToken {
    const start = this._pos;

    if (
      this._pos + 2 < this._source.length &&
      this._source[this._pos + 1] === '"' &&
      this._source[this._pos + 2] === '"'
    ) {
      return this.lexMultilineString(start);
    }

    this._pos++; // skip opening "

    let sb = "";
    while (this._pos < this._source.length && this._source[this._pos] !== '"') {
      if (this._source[this._pos] === "\\") {
        this._pos++;
        if (this._pos >= this._source.length) {
          this.addError("VSCL001", "Unterminated escape sequence", start, this._pos - start);
          break;
        }

        sb += this.unescapeChar(this._source[this._pos]!);
        this._pos++;
      } else {
        sb += this._source[this._pos];
        this._pos++;
      }
    }

    if (this._pos < this._source.length) {
      this._pos++; // skip closing "
    } else {
      this.addError("VSCL002", "Unterminated string literal", start, this._pos - start);
    }

    return { kind: BlockTokenKind.String, text: sb, start, length: this._pos - start };
  }

  private lexMultilineString(start: number): BlockToken {
    this._pos += 3; // skip """

    // Skip optional whitespace and required newline after opening """
    while (this._pos < this._source.length && (this._source[this._pos] === " " || this._source[this._pos] === "\t")) {
      this._pos++;
    }
    if (this._pos < this._source.length && this._source[this._pos] === "\r") {
      this._pos++;
    }
    if (this._pos < this._source.length && this._source[this._pos] === "\n") {
      this._pos++;
    }

    // Find closing """
    const contentStart = this._pos;
    let closingPos = -1;
    while (this._pos + 2 < this._source.length) {
      if (
        this._source[this._pos] === '"' &&
        this._source[this._pos + 1] === '"' &&
        this._source[this._pos + 2] === '"'
      ) {
        closingPos = this._pos;
        break;
      }

      this._pos++;
    }

    if (closingPos < 0) {
      this._pos = this._source.length;
      this.addError("VSCL003", "Unterminated multiline string", start, this._pos - start);
      return {
        kind: BlockTokenKind.String,
        text: this._source.slice(contentStart),
        start,
        length: this._pos - start,
      };
    }

    // Determine indent from closing """
    let lineStart = closingPos;
    while (lineStart > 0 && this._source[lineStart - 1] !== "\n") {
      lineStart--;
    }
    const indent = closingPos - lineStart;

    // Extract content up to the last newline before closing """
    let contentEnd = closingPos;
    while (contentEnd > contentStart && this._source[contentEnd - 1] !== "\n") {
      contentEnd--;
    }
    if (contentEnd > contentStart) {
      contentEnd--; // strip the \n itself
      if (contentEnd > contentStart && this._source[contentEnd - 1] === "\r") {
        contentEnd--;
      }
    }

    if (contentEnd < contentStart) {
      contentEnd = contentStart;
    }
    let raw = this._source.slice(contentStart, contentEnd);

    // Dedent lines
    if (indent > 0) {
      const lines = raw.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.length >= indent) {
          lines[i] = lines[i]!.slice(indent);
        } else {
          lines[i] = lines[i]!.replace(/^\s+/, "");
        }
      }

      raw = lines.join("\n");
    }

    this._pos = closingPos + 3; // skip closing """
    return { kind: BlockTokenKind.String, text: raw, start, length: this._pos - start };
  }

  private unescapeChar(c: string): string {
    switch (c) {
      case "n":
        return "\n";
      case "t":
        return "\t";
      case "r":
        return "\r";
      case "\\":
        return "\\";
      case '"':
        return '"';
      case "0":
        return "\0";
      case "u":
        return this.unescapeUnicode();
      default:
        return c;
    }
  }

  private unescapeUnicode(): string {
    if (this._pos + 4 >= this._source.length) {
      this.addError("VSCL004", "Invalid unicode escape sequence", this._pos - 1, 2);
      return REPLACEMENT_CHAR;
    }

    const hex = this._source.slice(this._pos + 1, this._pos + 5);
    this._pos += 4;

    if (/^[0-9a-fA-F]{4}$/.test(hex)) {
      return String.fromCharCode(parseInt(hex, 16));
    }

    this.addError("VSCL004", "Invalid unicode escape sequence", this._pos - 5, 6);
    return REPLACEMENT_CHAR;
  }

  private lexPunctuation(): BlockToken {
    const start = this._pos;
    const c = this._source[this._pos]!;
    this._pos++;

    let kind: BlockTokenKind;
    switch (c) {
      case "{":
        kind = BlockTokenKind.LBrace;
        break;
      case "}":
        kind = BlockTokenKind.RBrace;
        break;
      case "[":
        kind = BlockTokenKind.LBracket;
        break;
      case "]":
        kind = BlockTokenKind.RBracket;
        break;
      case "(":
        kind = BlockTokenKind.LParen;
        break;
      case ")":
        kind = BlockTokenKind.RParen;
        break;
      case ":":
        kind = BlockTokenKind.Colon;
        break;
      case "=":
        kind = BlockTokenKind.Equals;
        break;
      case ",":
        kind = BlockTokenKind.Comma;
        break;
      case ".":
        kind = BlockTokenKind.Dot;
        break;
      case "|":
        kind = BlockTokenKind.Pipe;
        break;
      case "<":
        kind = BlockTokenKind.LAngle;
        break;
      case ">":
        kind = BlockTokenKind.RAngle;
        break;
      default:
        kind = BlockTokenKind.Bad;
        break;
    }

    if (kind === BlockTokenKind.Bad) {
      this.addError("VSCL005", `Unexpected character '${c}'`, start, 1);
    }

    return { kind, text: c, start, length: 1 };
  }

  private addError(code: string, message: string, start: number, length: number): void {
    this._diagnostics.push({
      code,
      severity: "error",
      message,
      sourceName: this._sourceName,
      start,
      length,
    });
  }
}
