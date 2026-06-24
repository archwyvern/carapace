/**
 * Token kinds for the block-grammar Vascal text. Faithful port of the C#
 * `BlockTokenKind` enum (`Archwyvern.Hardcoded.Serialization.Vres.BlockTokenKind`).
 */
export enum BlockTokenKind {
  // Structural
  EndOfFile = "EndOfFile",
  Bad = "Bad",

  // Literals
  Identifier = "Identifier",
  Number = "Number",
  String = "String",

  // Punctuation
  LBrace = "LBrace", // {
  RBrace = "RBrace", // }
  LBracket = "LBracket", // [
  RBracket = "RBracket", // ]
  LParen = "LParen", // (
  RParen = "RParen", // )
  Colon = "Colon", // :  (member separator, map entry separator)
  Equals = "Equals", // =  (node-block attribute: parent=, type=)
  Comma = "Comma", // ,
  Dot = "Dot", // .  (EnumType.Member)
  Pipe = "Pipe", // |  (flag-enum terms)
  LAngle = "LAngle", // <  (generic type args)
  RAngle = "RAngle", // >

  Newline = "Newline", // significant newline
}

/** A lexed token. Port of the C# `BlockToken` readonly record struct. */
export interface BlockToken {
  readonly kind: BlockTokenKind;
  readonly text: string;
  readonly start: number;
  readonly length: number;
}

export type DiagnosticSeverity = "error" | "warning" | "info";

/** A lex/parse diagnostic. Mirrors the engine's `Diagnostic`. */
export interface Diagnostic {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  sourceName?: string;
  start: number;
  length: number;
}
