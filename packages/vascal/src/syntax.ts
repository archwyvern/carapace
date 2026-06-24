/**
 * The block-grammar AST. Faithful port of the C# `BlockSyntax.cs` node types.
 *
 * A parsed document is one of three headers:
 *  - `vdat <Type>` + `body { ... }`  (value data)
 *  - `vres <Type>` + optional `ext`/`sub` hoist decls + `resource { ... }`  (resource)
 *  - `vscn` + flat `node`/`component` blocks  (scene)
 *
 * All nodes carry `start`/`length` source spans (as the C# does), so the writer and
 * round-trip tests can compare structurally while spans are excluded from value equality.
 */

export type DocumentHeader = "vdat" | "vres" | "vscn";

/**
 * A parsed block-grammar document. `header` is the format keyword; `rootTypeName` is the
 * declared root type (null for `vscn`, whose root type lives on the root node block).
 * A `vdat`/`vres` document carries `body`; a `vscn` document carries `nodes` (with an empty
 * `body`). All three may carry hoisted `externals` / `subBlocks`.
 */
export interface Document {
  header: DocumentHeader;
  rootTypeName: string | null;
  body: BodyBlock;
  externals: ExtDecl[];
  subBlocks: SubBlock[];
  nodes: NodeBlock[];
}

/**
 * A flat scene node block: `node <Name> [parent=<id>] type=<Type> { members, component blocks }`.
 * `parent` is null for the root node. Children are expressed by other node blocks naming this
 * node as their `parent`, not by nesting.
 */
export interface NodeBlock {
  name: string;
  parent: string | null;
  typeName: string;
  members: Member[];
  components: ComponentBlock[];
}

/** An inline component block within a node: `component <Type> { members }`. */
export interface ComponentBlock {
  typeName: string;
  members: Member[];
}

/** An external-file handle declaration: `ext <handle>: "<path>"`. */
export interface ExtDecl {
  handle: string;
  path: string;
}

/** An embedded resource block: `sub <id>: <Type> { ... }`. */
export interface SubBlock {
  id: string;
  typeName: string;
  members: Member[];
}

export interface BodyBlock {
  members: Member[];
  start: number;
  length: number;
}

export interface Member {
  name: string;
  value: ValueNode;
  start: number;
  length: number;
}

export enum LiteralKind {
  Number = "Number",
  String = "String",
  True = "True",
  False = "False",
  Null = "Null",
}

export enum ValueKind {
  Literal = "Literal",
  Enum = "Enum",
  StructCtor = "StructCtor",
  StructBody = "StructBody",
  Array = "Array",
  Map = "Map",
  ExtRef = "ExtRef",
  SubRef = "SubRef",
}

interface ValueNodeBase {
  kind: ValueKind;
  start: number;
  length: number;
}

export interface LiteralNode extends ValueNodeBase {
  kind: ValueKind.Literal;
  text: string;
  literalKind: LiteralKind;
}

/** A qualified enum value. `terms` holds one `EnumType.Member` per flag term. */
export interface EnumNode extends ValueNodeBase {
  kind: ValueKind.Enum;
  terms: string[];
}

/** A struct constructor: `Type(arg, arg)` or inferred `(arg, arg)`. */
export interface StructCtorNode extends ValueNodeBase {
  kind: ValueKind.StructCtor;
  typeName: string | null;
  args: ValueNode[];
}

/** A struct body: `Type { member: value }` or inferred `{ member: value }`. */
export interface StructBodyNode extends ValueNodeBase {
  kind: ValueKind.StructBody;
  typeName: string | null;
  members: Member[];
}

export interface ArrayNode extends ValueNodeBase {
  kind: ValueKind.Array;
  items: ValueNode[];
}

export interface MapNode extends ValueNodeBase {
  kind: ValueKind.Map;
  entries: MapEntryNode[];
}

export interface MapEntryNode {
  key: ValueNode;
  value: ValueNode;
}

/** An external resource handle reference: `ext(handle)`. */
export interface ExtRefNode extends ValueNodeBase {
  kind: ValueKind.ExtRef;
  handle: string;
}

/** An embedded resource handle reference: `sub(handle)`. */
export interface SubRefNode extends ValueNodeBase {
  kind: ValueKind.SubRef;
  handle: string;
}

export type ValueNode =
  | LiteralNode
  | EnumNode
  | StructCtorNode
  | StructBodyNode
  | ArrayNode
  | MapNode
  | ExtRefNode
  | SubRefNode;
