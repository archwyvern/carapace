/**
 * The language layer: lexing, the AST, parsing, and AST serialization. This is the generic block
 * grammar — it has no knowledge of the resource model and depends on nothing outside the package.
 */

export {
  BlockTokenKind,
  type BlockToken,
  type Diagnostic,
  type DiagnosticSeverity,
} from "./tokens.js";

export {
  LiteralKind,
  ValueKind,
  type ArrayNode,
  type BodyBlock,
  type ComponentBlock,
  type Document,
  type DocumentHeader,
  type EnumNode,
  type ExtDecl,
  type ExtRefNode,
  type LiteralNode,
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

export { BlockLexer } from "./lexer.js";
export { BlockParser, parse, type ParseResult } from "./parser.js";
export { ValueWriter, serialize } from "./writer.js";
