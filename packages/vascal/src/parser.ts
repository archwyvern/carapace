import { BlockLexer } from "./lexer.js";
import { BlockTokenKind, type BlockToken, type Diagnostic } from "./tokens.js";
import {
  LiteralKind,
  ValueKind,
  type BodyBlock,
  type ComponentBlock,
  type Document,
  type DocumentHeader,
  type EnumNode,
  type ExtDecl,
  type ExtRefNode,
  type MapEntryNode,
  type MapNode,
  type Member,
  type NodeBlock,
  type StructBodyNode,
  type StructCtorNode,
  type SubBlock,
  type SubRefNode,
  type ValueNode,
} from "./syntax.js";

export interface ParseResult {
  doc: Document | null;
  diagnostics: Diagnostic[];
}

function max0(value: number): number {
  return value < 0 ? 0 : value;
}

/**
 * Entry point: lex + parse a block-grammar source into a `Document`. Faithful port of the C#
 * `BlockParseDriver.Parse`. Returns `doc: null` when any error diagnostic was produced.
 */
export function parse(source: string, sourceName?: string): ParseResult {
  const diagnostics: Diagnostic[] = [];
  const tokens = new BlockLexer(source, sourceName, diagnostics).lex();
  const doc = new BlockParser(tokens, sourceName, diagnostics).parse();

  let hasError = false;
  for (const d of diagnostics) {
    if (d.severity === "error") {
      hasError = true;
      break;
    }
  }

  return { doc: hasError ? null : doc, diagnostics };
}

/** Recursive-descent parser. Faithful port of the C# `BlockParser`. */
export class BlockParser {
  private readonly _tokens: BlockToken[];
  private readonly _sourceName: string | undefined;
  private readonly _diagnostics: Diagnostic[];
  private _pos = 0;

  constructor(tokens: BlockToken[], sourceName: string | undefined, diagnostics: Diagnostic[]) {
    this._tokens = tokens;
    this._sourceName = sourceName;
    this._diagnostics = diagnostics;
  }

  private get current(): BlockToken {
    if (this._pos < this._tokens.length) {
      return this._tokens[this._pos]!;
    }
    const lastStart = this._tokens.length > 0 ? this._tokens[this._tokens.length - 1]!.start : 0;
    return { kind: BlockTokenKind.EndOfFile, text: "", start: lastStart, length: 0 };
  }

  parse(): Document {
    this.skipNewlines();

    const keyword = this.expectIdentifier("Expected a format header ('vdat', 'vres', or 'vscn')");
    let rootType: string | null = null;
    if (!equalsIgnoreCase(keyword, "vscn")) {
      rootType = this.parseTypeName();
    }
    this.skipNewlines();

    if (equalsIgnoreCase(keyword, "vres")) {
      return this.parseResourceDocument(headerOf(keyword), rootType);
    }

    if (equalsIgnoreCase(keyword, "vscn")) {
      return this.parseSceneDocument(headerOf(keyword));
    }

    // vdat (value-only) — a single 'body' block.
    const bodyKeyword = this.expectIdentifier("Expected 'body'");
    if (!equalsIgnoreCase(bodyKeyword, "body")) {
      this.addError("VSCL110", "Expected a 'body' block", this.current.start, this.current.length);
    }
    const body = this.parseBodyBlock();
    this.skipNewlines();

    return {
      header: headerOf(keyword),
      rootTypeName: rootType,
      body,
      externals: [],
      subBlocks: [],
      nodes: [],
    };
  }

  private parseResourceDocument(header: DocumentHeader, rootType: string | null): Document {
    const externals = this.parseExternals();
    const subBlocks = this.parseSubBlocks();

    const resKeyword = this.expectIdentifier("Expected a 'resource' block");
    if (!equalsIgnoreCase(resKeyword, "resource")) {
      this.addError("VSCL111", "Expected a 'resource' block", this.current.start, this.current.length);
    }
    const body = this.parseBodyBlock();
    this.skipNewlines();

    return {
      header,
      rootTypeName: rootType,
      body,
      externals,
      subBlocks,
      nodes: [],
    };
  }

  /**
   * Parses a scene document: hoisted `ext`/`sub` blocks (shared with resources) followed by a flat
   * list of `node` blocks. The root type lives on the root node's `type=`, so the document's
   * `rootTypeName` stays null and its `body` is empty.
   */
  private parseSceneDocument(header: DocumentHeader): Document {
    const externals = this.parseExternals();
    const subBlocks = this.parseSubBlocks();

    const nodes: NodeBlock[] = [];
    while (this.isKeyword("node")) {
      nodes.push(this.parseNodeBlock());
      this.skipNewlines();
    }

    return {
      header,
      rootTypeName: null,
      body: { members: [], start: this.current.start, length: 0 },
      externals,
      subBlocks,
      nodes,
    };
  }

  private parseNodeBlock(): NodeBlock {
    this.advance(); // consume 'node'
    const name = this.parseNodeName();

    let parent: string | null = null;
    let type: string | null = null;
    // Attributes: parent=<id>, type=<Type>. (instance=/inherits= are reserved for scene
    // instancing/inheritance — consumed but not yet acted on.)
    while (this.isAt(BlockTokenKind.Identifier) && isNodeAttribute(this.current.text)) {
      const attr = this.current.text;
      this.advance();
      this.expect(BlockTokenKind.Equals, `Expected '=' after node attribute '${attr}'`);
      switch (attr) {
        case "type":
          type = this.parseTypeName();
          break;
        case "parent":
          parent = this.expectIdentifier("Expected a parent node id after 'parent='");
          break;
        default:
          // Reserved instance=/inherits=: accept a type name or quoted path, ignore for now.
          if (this.isAt(BlockTokenKind.String)) {
            this.advance();
          } else {
            this.parseTypeName();
          }
          break;
      }
    }

    if (type === null) {
      this.addError(
        "VSCL120",
        `Scene node '${name}' is missing a 'type=' attribute`,
        this.current.start,
        this.current.length,
      );
    }

    const members: Member[] = [];
    const components: ComponentBlock[] = [];
    if (this.isAt(BlockTokenKind.LBrace)) {
      this.parseNodeBody(members, components);
    }

    return {
      name,
      parent,
      typeName: type ?? "",
      members,
      components,
    };
  }

  /** Parses a node body: a brace block of `key: value` members and `component` blocks. */
  private parseNodeBody(members: Member[], components: ComponentBlock[]): void {
    this.expect(BlockTokenKind.LBrace, "Expected '{'");
    this.skipNewlines();

    while (!this.isAt(BlockTokenKind.RBrace) && !this.isAt(BlockTokenKind.EndOfFile)) {
      if (this.isKeyword("component")) {
        this.advance();
        const typeName = this.parseTypeName();
        const compMembers = this.parseMemberList();
        components.push({ typeName, members: compMembers });
        this.skipNewlines();
        continue;
      }

      const memberStart = this.current.start;
      const name = this.expectIdentifier("Expected a member name or 'component'");
      this.expect(BlockTokenKind.Colon, "Expected ':' after member name");
      const value = this.parseValue();
      members.push({
        name,
        value,
        start: memberStart,
        length: value.start + value.length - memberStart,
      });
      this.skipNewlines();
      if (this.isAt(BlockTokenKind.Comma)) {
        this.advance();
        this.skipNewlines();
      }
    }

    this.expect(BlockTokenKind.RBrace, "Expected '}'");
  }

  private parseNodeName(): string {
    if (this.current.kind === BlockTokenKind.String) {
      const text = this.current.text;
      this.advance();
      return text;
    }
    return this.expectIdentifier("Expected a node name");
  }

  private parseExternals(): ExtDecl[] {
    const externals: ExtDecl[] = [];
    while (this.isKeyword("ext")) {
      this.advance();
      const handle = this.expectIdentifier("Expected ext handle name");
      this.expect(BlockTokenKind.Colon, "Expected ':' after ext handle");
      const path = this.expectString("Expected a quoted path after 'ext <handle>:'");
      externals.push({ handle, path });
      this.skipNewlines();
    }
    return externals;
  }

  private parseSubBlocks(): SubBlock[] {
    const subBlocks: SubBlock[] = [];
    while (this.isKeyword("sub")) {
      this.advance();
      const id = this.expectIdentifier("Expected sub id");
      this.expect(BlockTokenKind.Colon, "Expected ':' after sub id");
      const typeName = this.parseTypeName();
      const members = this.parseMemberList();
      subBlocks.push({ id, typeName, members });
      this.skipNewlines();
    }
    return subBlocks;
  }

  private parseBodyBlock(): BodyBlock {
    const start = this.current.start;
    const members = this.parseMemberList();
    return {
      members,
      start,
      length: max0(this.current.start - start),
    };
  }

  /** Parses `{ member* }` where each member is `Ident ":" value`. */
  private parseMemberList(): Member[] {
    this.expect(BlockTokenKind.LBrace, "Expected '{'");
    this.skipNewlines();

    const members: Member[] = [];
    while (!this.isAt(BlockTokenKind.RBrace) && !this.isAt(BlockTokenKind.EndOfFile)) {
      const memberStart = this.current.start;
      const name = this.expectIdentifier("Expected member name");
      this.expect(BlockTokenKind.Colon, "Expected ':' after member name");
      const value = this.parseValue();
      members.push({
        name,
        value,
        start: memberStart,
        length: value.start + value.length - memberStart,
      });
      this.skipNewlines();
      if (this.isAt(BlockTokenKind.Comma)) {
        this.advance();
        this.skipNewlines();
      }
    }

    this.expect(BlockTokenKind.RBrace, "Expected '}'");
    return members;
  }

  private parseValue(): ValueNode {
    const token = this.current;

    switch (token.kind) {
      case BlockTokenKind.Number:
        this.advance();
        return {
          kind: ValueKind.Literal,
          text: token.text,
          literalKind: LiteralKind.Number,
          start: token.start,
          length: token.length,
        };
      case BlockTokenKind.String:
        this.advance();
        return {
          kind: ValueKind.Literal,
          text: token.text,
          literalKind: LiteralKind.String,
          start: token.start,
          length: token.length,
        };
      case BlockTokenKind.LBracket:
        return this.parseArray();
      case BlockTokenKind.LParen:
        return this.parseStructCtor(null, token.start);
      case BlockTokenKind.LBrace:
        return this.parseBraces();
      case BlockTokenKind.Identifier:
        return this.parseIdentifierStartedValue();
      default:
        this.addError("VSCL101", `Unexpected token '${token.text}'`, token.start, token.length);
        this.advance();
        return {
          kind: ValueKind.Literal,
          text: "",
          literalKind: LiteralKind.Null,
          start: token.start,
          length: token.length,
        };
    }
  }

  private parseIdentifierStartedValue(): ValueNode {
    const nameToken = this.current;
    let name = nameToken.text;

    if (equalsIgnoreCase(name, "true")) {
      this.advance();
      return {
        kind: ValueKind.Literal,
        text: "true",
        literalKind: LiteralKind.True,
        start: nameToken.start,
        length: nameToken.length,
      };
    }
    if (equalsIgnoreCase(name, "false")) {
      this.advance();
      return {
        kind: ValueKind.Literal,
        text: "false",
        literalKind: LiteralKind.False,
        start: nameToken.start,
        length: nameToken.length,
      };
    }
    if (equalsIgnoreCase(name, "null")) {
      this.advance();
      return {
        kind: ValueKind.Literal,
        text: "null",
        literalKind: LiteralKind.Null,
        start: nameToken.start,
        length: nameToken.length,
      };
    }

    this.advance(); // consume the leading identifier (enum type, struct type, or ext/sub keyword)

    // Resource handle references: ext(handle) / sub(handle). Checked before the generic
    // `(` constructor path so the keyword isn't mistaken for a type name.
    if ((name === "ext" || name === "sub") && this.isAt(BlockTokenKind.LParen)) {
      return this.parseHandleRef(name, nameToken.start);
    }

    if (this.isAt(BlockTokenKind.Dot)) {
      return this.parseEnumValue(name, nameToken.start);
    }

    if (this.isAt(BlockTokenKind.LAngle)) {
      name = this.consumeGenericArgs(name);
    }

    if (this.isAt(BlockTokenKind.LParen)) {
      return this.parseStructCtor(name, nameToken.start);
    }

    if (this.isAt(BlockTokenKind.LBrace)) {
      const members = this.parseMemberList();
      const node: StructBodyNode = {
        kind: ValueKind.StructBody,
        typeName: name,
        members,
        start: nameToken.start,
        length: max0(this.current.start - nameToken.start),
      };
      return node;
    }

    this.addError(
      "VSCL104",
      `Bare identifier '${name}' is not a value. Qualify enums as 'EnumType.Member', or follow a type ` +
        `name with '(' (constructor) or '{' (body).`,
      nameToken.start,
      nameToken.length,
    );
    return {
      kind: ValueKind.Literal,
      text: "",
      literalKind: LiteralKind.Null,
      start: nameToken.start,
      length: nameToken.length,
    };
  }

  /**
   * Parses `Type.Member` (the leading `firstType` is already consumed) plus any `| Type.Member`
   * flag terms.
   */
  private parseEnumValue(firstType: string, start: number): EnumNode {
    const terms: string[] = [];

    this.expect(BlockTokenKind.Dot, "Expected '.' in qualified enum value");
    const member = this.expectIdentifier("Expected enum member after '.'");
    terms.push(firstType + "." + member);
    let end = this.current.start;

    while (this.isAt(BlockTokenKind.Pipe)) {
      this.advance();
      const t = this.expectIdentifier("Expected enum type after '|'");
      this.expect(BlockTokenKind.Dot, "Expected '.' in qualified enum value");
      const m = this.expectIdentifier("Expected enum member after '.'");
      terms.push(t + "." + m);
      end = this.current.start;
    }

    return { kind: ValueKind.Enum, terms, start, length: max0(end - start) };
  }

  private parseStructCtor(typeName: string | null, start: number): StructCtorNode {
    this.expect(BlockTokenKind.LParen, "Expected '('");
    this.skipNewlines();

    const args: ValueNode[] = [];
    while (!this.isAt(BlockTokenKind.RParen) && !this.isAt(BlockTokenKind.EndOfFile)) {
      args.push(this.parseValue());
      this.skipNewlines();
      if (this.isAt(BlockTokenKind.Comma)) {
        this.advance();
        this.skipNewlines();
      }
    }

    const end = this.current.start + this.current.length;
    this.expect(BlockTokenKind.RParen, "Expected ')'");
    return { kind: ValueKind.StructCtor, typeName, args, start, length: end - start };
  }

  private parseArray(): ValueNode {
    const start = this.current.start;
    this.expect(BlockTokenKind.LBracket, "Expected '['");
    this.skipNewlines();

    const items: ValueNode[] = [];
    while (!this.isAt(BlockTokenKind.RBracket) && !this.isAt(BlockTokenKind.EndOfFile)) {
      items.push(this.parseValue());
      this.skipNewlines();
      if (this.isAt(BlockTokenKind.Comma)) {
        this.advance();
        this.skipNewlines();
      }
    }

    const end = this.current.start + this.current.length;
    this.expect(BlockTokenKind.RBracket, "Expected ']'");
    return { kind: ValueKind.Array, items, start, length: end - start };
  }

  /**
   * Parses an anonymous brace block: a map when the first key is a string/number, a struct body when
   * the first key is an identifier, and an empty struct body for `{}` (the reader resolves the empty
   * case by target type).
   */
  private parseBraces(): ValueNode {
    const start = this.current.start;
    this.expect(BlockTokenKind.LBrace, "Expected '{'");
    this.skipNewlines();

    if (this.isAt(BlockTokenKind.RBrace)) {
      const endEmpty = this.current.start + this.current.length;
      this.advance();
      const node: StructBodyNode = {
        kind: ValueKind.StructBody,
        typeName: null,
        members: [],
        start,
        length: endEmpty - start,
      };
      return node;
    }

    if (this.isAt(BlockTokenKind.String) || this.isAt(BlockTokenKind.Number)) {
      return this.parseMapEntries(start);
    }

    const members: Member[] = [];
    while (!this.isAt(BlockTokenKind.RBrace) && !this.isAt(BlockTokenKind.EndOfFile)) {
      const memberStart = this.current.start;
      const name = this.expectIdentifier("Expected member name");
      this.expect(BlockTokenKind.Colon, "Expected ':' after member name");
      const value = this.parseValue();
      members.push({
        name,
        value,
        start: memberStart,
        length: value.start + value.length - memberStart,
      });
      this.skipNewlines();
      if (this.isAt(BlockTokenKind.Comma)) {
        this.advance();
        this.skipNewlines();
      }
    }

    const end = this.current.start + this.current.length;
    this.expect(BlockTokenKind.RBrace, "Expected '}'");
    const node: StructBodyNode = {
      kind: ValueKind.StructBody,
      typeName: null,
      members,
      start,
      length: end - start,
    };
    return node;
  }

  private parseMapEntries(start: number): MapNode {
    const entries: MapEntryNode[] = [];
    while (!this.isAt(BlockTokenKind.RBrace) && !this.isAt(BlockTokenKind.EndOfFile)) {
      const key = this.parseValue();
      this.skipNewlines();
      this.expect(BlockTokenKind.Colon, "Expected ':' between map key and value");
      const value = this.parseValue();
      entries.push({ key, value });
      this.skipNewlines();
      if (this.isAt(BlockTokenKind.Comma)) {
        this.advance();
        this.skipNewlines();
      }
    }

    const end = this.current.start + this.current.length;
    this.expect(BlockTokenKind.RBrace, "Expected '}'");
    return { kind: ValueKind.Map, entries, start, length: end - start };
  }

  private parseHandleRef(kind: "ext" | "sub", start: number): ExtRefNode | SubRefNode {
    this.expect(BlockTokenKind.LParen, "Expected '(' after handle keyword");
    const handle = this.expectIdentifier("Expected handle name");
    const end = this.current.start + this.current.length;
    this.expect(BlockTokenKind.RParen, "Expected ')'");
    return kind === "ext"
      ? { kind: ValueKind.ExtRef, handle, start, length: end - start }
      : { kind: ValueKind.SubRef, handle, start, length: end - start };
  }

  private isKeyword(keyword: string): boolean {
    return this.current.kind === BlockTokenKind.Identifier && this.current.text === keyword;
  }

  private expectString(message: string): string {
    if (this.current.kind === BlockTokenKind.String) {
      const text = this.current.text;
      this.advance();
      return text;
    }

    this.addError("VSCL112", message, this.current.start, this.current.length);
    return "";
  }

  private parseTypeName(): string {
    const name = this.expectIdentifier("Expected type name");
    if (this.isAt(BlockTokenKind.LAngle)) {
      return this.consumeGenericArgs(name);
    }
    return name;
  }

  private consumeGenericArgs(baseName: string): string {
    this.advance(); // skip <
    const args: string[] = [this.parseTypeName()];
    while (this.isAt(BlockTokenKind.Comma)) {
      this.advance();
      args.push(this.parseTypeName());
    }

    this.expect(BlockTokenKind.RAngle, "Expected '>'");
    return baseName + "<" + args.join(", ") + ">";
  }

  private isAt(kind: BlockTokenKind): boolean {
    return this.current.kind === kind;
  }

  private advance(): void {
    if (this._pos < this._tokens.length) {
      this._pos++;
    }
  }

  private skipNewlines(): void {
    while (this.isAt(BlockTokenKind.Newline)) {
      this.advance();
    }
  }

  private expect(kind: BlockTokenKind, message: string): void {
    if (this.current.kind === kind) {
      this.advance();
    } else {
      this.addError("VSCL102", message, this.current.start, this.current.length);
    }
  }

  private expectIdentifier(message: string): string {
    if (this.current.kind === BlockTokenKind.Identifier) {
      const text = this.current.text;
      this.advance();
      return text;
    }

    this.addError("VSCL103", message, this.current.start, this.current.length);
    return "";
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

function equalsIgnoreCase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function isNodeAttribute(name: string): boolean {
  return name === "parent" || name === "type" || name === "instance" || name === "inherits";
}

function headerOf(keyword: string): DocumentHeader {
  const lower = keyword.toLowerCase();
  if (lower === "vdat" || lower === "vres" || lower === "vscn") {
    return lower;
  }
  // The parser only reaches a header branch for a recognized keyword; default keeps the type total.
  return "vdat";
}
