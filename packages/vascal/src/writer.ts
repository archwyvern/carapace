import {
  LiteralKind,
  ValueKind,
  type Document,
  type Member,
  type NodeBlock,
  type ValueNode,
} from "./syntax.js";

const INDENT = "    ";

/** Lines wider than this (including indent) break their arrays / struct bodies / maps onto their own
 *  indented lines. Keeps short values inline (`[ x, y ]`, `{ a: b }`) but lays long ones out readably,
 *  matching the hand-authored corpus. Block-grammar treats newlines and commas alike as separators,
 *  so a broken layout re-parses to the same AST. */
const WRAP_WIDTH = 120;

const indentOf = (depth: number): string => INDENT.repeat(depth);

/**
 * Serializes a block-grammar `Document` AST back to text: a `vdat`/`vres`/`vscn` header, hoisted
 * `ext`/`sub` blocks, a `body`/`resource` block with indented members, and nested values rendered
 * fit-or-break — inline when short (`Type { a: b }`, `[ x, y ]`), broken across indented lines when
 * the inline form would exceed {@link WRAP_WIDTH}.
 *
 * Where the C# writer drives from a CLR value graph (and always emits a struct's type name), this
 * writer drives from the parsed AST and preserves whatever the AST carries — including anonymous
 * (`typeName: null`) struct bodies, which appear in hand-authored corpus files. This keeps the
 * write a faithful inverse of the parse so that AST -> text -> AST round-trips are stable.
 */
export class ValueWriter {
  private _sb = "";
  private _indent = 0;

  /** Writes a full document (chooses the body/resource/scene shape from the header). */
  writeDocument(doc: Document): string {
    this._sb = "";
    this._indent = 0;

    switch (doc.header) {
      case "vdat":
        return this.writeValueDocument(doc);
      case "vres":
        return this.writeResourceDocument(doc);
      case "vscn":
        return this.writeSceneDocument(doc);
    }
  }

  private writeValueDocument(doc: Document): string {
    this._sb += "vdat " + (doc.rootTypeName ?? "") + "\n\n";
    this._sb += "body {\n";
    this._indent++;
    this.writeBodyMembers(doc.body.members);
    this._indent--;
    this._sb += "}\n";
    return this._sb;
  }

  private writeResourceDocument(doc: Document): string {
    this._sb += "vres " + (doc.rootTypeName ?? "") + "\n\n";
    this.writeHoistBlocks(doc);

    this._sb += "resource {\n";
    this._indent++;
    this.writeBodyMembers(doc.body.members);
    this._indent--;
    this._sb += "}\n";
    return this._sb;
  }

  private writeSceneDocument(doc: Document): string {
    this._sb += "vscn\n\n";
    this.writeHoistBlocks(doc);

    for (let i = 0; i < doc.nodes.length; i++) {
      this.writeNodeBlock(doc.nodes[i]!);
      this._sb += i < doc.nodes.length - 1 ? "\n" : "";
    }
    return this._sb;
  }

  private writeNodeBlock(node: NodeBlock): void {
    this._sb += "node " + node.name;
    if (node.parent !== null) {
      this._sb += " parent=" + node.parent;
    }
    this._sb += " type=" + node.typeName + " {\n";
    this._indent++;
    this.writeBodyMembers(node.members);
    for (const comp of node.components) {
      this.writeIndent();
      this._sb += "component " + comp.typeName + " {";
      if (comp.members.length === 0) {
        this._sb += "}\n";
        continue;
      }
      this._sb += " ";
      this.writeInlineMemberList(comp.members);
      this._sb += " }\n";
    }
    this._indent--;
    this._sb += "}\n";
  }

  private writeHoistBlocks(doc: Document): void {
    if (doc.externals.length > 0) {
      for (const ext of doc.externals) {
        this._sb += "ext " + ext.handle + ": " + this.renderString(ext.path) + "\n";
      }
      this._sb += "\n";
    }

    for (const sub of doc.subBlocks) {
      this._sb += "sub " + sub.id + ": " + sub.typeName + " {\n";
      this._indent++;
      this.writeBodyMembers(sub.members);
      this._indent--;
      this._sb += "}\n\n";
    }
  }

  private writeBodyMembers(members: Member[]): void {
    for (const member of members) {
      this.writeIndent();
      this._sb += member.name + ": " + this.renderValue(member.value, this._indent) + "\n";
    }
  }

  /** Renders a value to text, breaking arrays / struct bodies / maps onto indented lines when the
   *  inline form would exceed {@link WRAP_WIDTH}; `depth` is the indent the value sits at. */
  private renderValue(node: ValueNode, depth: number): string {
    switch (node.kind) {
      case ValueKind.Literal:
        return this.renderLiteral(node.text, node.literalKind);
      case ValueKind.Enum:
        return node.terms.join(" | ");
      case ValueKind.StructCtor:
        return (node.typeName ?? "") + "(" + node.args.map(a => this.renderValue(a, depth)).join(", ") + ")";
      case ValueKind.StructBody: {
        const prefix = node.typeName !== null ? node.typeName + " " : "";
        if (node.members.length === 0) return prefix + "{}";
        const parts = node.members.map(m => m.name + ": " + this.renderValue(m.value, depth + 1));
        const inline = prefix + "{ " + parts.join(", ") + " }";
        if (this.fits(inline, depth)) return inline;
        return prefix + "{\n" + parts.map(p => indentOf(depth + 1) + p).join("\n") + "\n" + indentOf(depth) + "}";
      }
      case ValueKind.Array: {
        if (node.items.length === 0) return "[]";
        const items = node.items.map(it => this.renderValue(it, depth + 1));
        const inline = "[ " + items.join(", ") + " ]";
        if (this.fits(inline, depth)) return inline;
        return "[\n" + items.map(it => indentOf(depth + 1) + it).join("\n") + "\n" + indentOf(depth) + "]";
      }
      case ValueKind.Map: {
        if (node.entries.length === 0) return "{}";
        const parts = node.entries.map(e => this.renderValue(e.key, depth + 1) + ": " + this.renderValue(e.value, depth + 1));
        const inline = "{ " + parts.join(", ") + " }";
        if (this.fits(inline, depth)) return inline;
        return "{\n" + parts.map(p => indentOf(depth + 1) + p).join("\n") + "\n" + indentOf(depth) + "}";
      }
      case ValueKind.ExtRef:
        return "ext(" + node.handle + ")";
      case ValueKind.SubRef:
        return "sub(" + node.handle + ")";
    }
  }

  /** A rendered value fits inline when it has no internal break and stays within {@link WRAP_WIDTH}. */
  private fits(inline: string, depth: number): boolean {
    return !inline.includes("\n") && depth * INDENT.length + inline.length <= WRAP_WIDTH;
  }

  private writeInlineMemberList(members: Member[]): void {
    for (let i = 0; i < members.length; i++) {
      if (i > 0) {
        this._sb += ", ";
      }
      this._sb += members[i]!.name + ": " + this.renderValue(members[i]!.value, this._indent);
    }
  }

  private renderLiteral(text: string, kind: LiteralKind): string {
    switch (kind) {
      case LiteralKind.String:
        return this.renderString(text);
      case LiteralKind.True:
        return "true";
      case LiteralKind.False:
        return "false";
      case LiteralKind.Null:
        return "null";
      case LiteralKind.Number:
        return text;
    }
  }

  private renderString(s: string): string {
    let out = '"';
    for (const c of s) {
      switch (c) {
        case "\\": out += "\\\\"; break;
        case '"': out += '\\"'; break;
        case "\n": out += "\\n"; break;
        case "\r": out += "\\r"; break;
        case "\t": out += "\\t"; break;
        case "\0": out += "\\0"; break;
        default:
          out += c.charCodeAt(0) < 0x20 ? "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0") : c;
          break;
      }
    }
    return out + '"';
  }

  private writeIndent(): void {
    for (let i = 0; i < this._indent; i++) {
      this._sb += INDENT;
    }
  }
}

/** Serializes a parsed `Document` AST back to block-grammar text. */
export function serialize(doc: Document): string {
  return new ValueWriter().writeDocument(doc);
}
