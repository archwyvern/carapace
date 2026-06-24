/**
 * @carapace/vascal — a faithful TypeScript port of the Hardcoded engine's "Vres" block-grammar
 * serializer (the `.vres` / `.vscn` resource text format).
 *
 * The package is a generic format engine in two layers:
 *  - the language layer (`./language`): lexer, AST, parser, AST writer — knows the grammar only;
 *  - the serialization layer (`./serialization`): a consumer-driven `TypeRegistry` + reader that
 *    materialize a parsed document into runtime objects.
 *
 * It depends on no resource-model types; consumers register `TypeDescriptor`s to drive
 * (de)serialization.
 */

export * from "./language.js";
export * from "./serialization.js";
