import {
  LiteralKind,
  ValueKind,
  type Document,
  type Member,
  type NodeBlock,
  type ValueNode,
} from "./syntax.js";

const INDENT = "    ";

/**
 * Serializes a block-grammar `Document` AST back to text. The output format mirrors the C#
 * `ValueWriter` exactly: a `vdat`/`vres`/`vscn` header, hoisted `ext`/`sub` blocks, a top-level
 * `body`/`resource` block with indented members, and nested struct bodies / arrays / maps emitted
 * inline (`Type { a: b, c: d }`, `[ x, y ]`).
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
        this._sb += "ext " + ext.handle + ": ";
        this.writeString(ext.path);
        this._sb += "\n";
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
      this._sb += member.name + ": ";
      this.writeValue(member.value);
      this._sb += "\n";
    }
  }

  private writeValue(node: ValueNode): void {
    switch (node.kind) {
      case ValueKind.Literal:
        this.writeLiteral(node.text, node.literalKind);
        return;
      case ValueKind.Enum:
        this._sb += node.terms.join(" | ");
        return;
      case ValueKind.StructCtor:
        this._sb += node.typeName ?? "";
        this._sb += "(";
        for (let i = 0; i < node.args.length; i++) {
          if (i > 0) {
            this._sb += ", ";
          }
          this.writeValue(node.args[i]!);
        }
        this._sb += ")";
        return;
      case ValueKind.StructBody:
        if (node.typeName !== null) {
          this._sb += node.typeName + " ";
        }
        if (node.members.length === 0) {
          this._sb += "{}";
          return;
        }
        this._sb += "{ ";
        this.writeInlineMemberList(node.members);
        this._sb += " }";
        return;
      case ValueKind.Array:
        if (node.items.length === 0) {
          this._sb += "[]";
          return;
        }
        this._sb += "[ ";
        for (let i = 0; i < node.items.length; i++) {
          if (i > 0) {
            this._sb += ", ";
          }
          this.writeValue(node.items[i]!);
        }
        this._sb += " ]";
        return;
      case ValueKind.Map:
        if (node.entries.length === 0) {
          this._sb += "{}";
          return;
        }
        this._sb += "{ ";
        for (let i = 0; i < node.entries.length; i++) {
          if (i > 0) {
            this._sb += ", ";
          }
          this.writeValue(node.entries[i]!.key);
          this._sb += ": ";
          this.writeValue(node.entries[i]!.value);
        }
        this._sb += " }";
        return;
      case ValueKind.ExtRef:
        this._sb += "ext(" + node.handle + ")";
        return;
      case ValueKind.SubRef:
        this._sb += "sub(" + node.handle + ")";
        return;
    }
  }

  private writeInlineMemberList(members: Member[]): void {
    for (let i = 0; i < members.length; i++) {
      if (i > 0) {
        this._sb += ", ";
      }
      this._sb += members[i]!.name + ": ";
      this.writeValue(members[i]!.value);
    }
  }

  private writeLiteral(text: string, kind: LiteralKind): void {
    switch (kind) {
      case LiteralKind.String:
        this.writeString(text);
        return;
      case LiteralKind.True:
        this._sb += "true";
        return;
      case LiteralKind.False:
        this._sb += "false";
        return;
      case LiteralKind.Null:
        this._sb += "null";
        return;
      case LiteralKind.Number:
        this._sb += text;
        return;
    }
  }

  private writeString(s: string): void {
    this._sb += '"';
    for (const c of s) {
      switch (c) {
        case "\\":
          this._sb += "\\\\";
          break;
        case '"':
          this._sb += '\\"';
          break;
        case "\n":
          this._sb += "\\n";
          break;
        case "\r":
          this._sb += "\\r";
          break;
        case "\t":
          this._sb += "\\t";
          break;
        case "\0":
          this._sb += "\\0";
          break;
        default:
          if (c.charCodeAt(0) < 0x20) {
            this._sb += "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
          } else {
            this._sb += c;
          }
          break;
      }
    }
    this._sb += '"';
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
