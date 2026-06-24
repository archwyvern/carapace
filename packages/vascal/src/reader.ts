import { parse } from "./parser.js";
import type { TypeDescriptor, TypeRegistry } from "./registry.js";
import {
  LiteralKind,
  ValueKind,
  type Document,
  type Member,
  type ValueNode,
} from "./syntax.js";

/**
 * Resolves an external `ext(handle)` reference. The consumer supplies the path-to-resource mapping
 * (the engine's `ResourceLoader` analogue). `expectedType` is the declaring member's type hint, when
 * known. Returns the resolved value, or null when unresolved.
 */
export type ExternalLoader = (path: string, expectedType?: string) => unknown;

export interface ReaderOptions {
  /** Resolves `ext(handle)` references via the consumer's loader. */
  loadExternal?: ExternalLoader;
  /** Embedded `sub(id)` shells, prebuilt by the resource/scene readers. */
  subShells?: Map<string, unknown>;
  /** Declared `ext` handle -> path table. */
  externals?: Map<string, string>;
}

const INTEGER_HINTS = new Set(["int", "integer", "long", "uint", "ulong", "short", "ushort", "byte", "sbyte"]);

/**
 * Materializes a parsed value AST into runtime objects, driven by a `TypeRegistry`. Faithful port of
 * the C# `ValueReader` — the structural parts (literals, enums, ctors, bodies, arrays, maps, ext/sub
 * handle resolution) carry over directly; reflection-driven member application is replaced by the
 * descriptor's property setters.
 */
export class ValueReader {
  private readonly _registry: TypeRegistry;
  private readonly _opts: ReaderOptions;

  constructor(registry: TypeRegistry, opts: ReaderOptions = {}) {
    this._registry = registry;
    this._opts = opts;
  }

  /** Reads a `vdat`/`vres`-style document body into an instance of `typeName` (or the document root). */
  readDocument(doc: Document, typeName?: string): unknown {
    const concrete = doc.rootTypeName ?? typeName;
    if (!concrete) {
      throw new Error("Cannot determine the document's root type: no header type and no fallback supplied.");
    }
    const descriptor = this.requireDescriptor(concrete);
    const instance = descriptor.create();
    this.applyMembers(instance, descriptor, doc.body.members);
    this.invokeAfterDeserialize(instance, descriptor);
    return instance;
  }

  /** Populates an already-created instance (used by the resource/scene readers for shells and nodes). */
  populateObject(target: unknown, descriptor: TypeDescriptor, members: Member[]): void {
    this.applyMembers(target, descriptor, members);
    this.invokeAfterDeserialize(target, descriptor);
  }

  materializeValue(node: ValueNode, targetType: string): unknown {
    switch (node.kind) {
      case ValueKind.Literal:
        return this.materializeLiteral(node.text, node.literalKind, targetType);
      case ValueKind.Enum:
        return this.materializeEnum(node.terms, targetType);
      case ValueKind.StructCtor:
        return this.materializeStructCtor(node.typeName, node.args, targetType);
      case ValueKind.StructBody:
        return this.materializeStructBody(node.typeName, node.members, targetType);
      case ValueKind.Array:
        return node.items.map((item) => this.materializeValue(item, elementHint(targetType)));
      case ValueKind.Map: {
        const result = new Map<unknown, unknown>();
        for (const entry of node.entries) {
          result.set(
            this.materializeValue(entry.key, "auto"),
            this.materializeValue(entry.value, "auto"),
          );
        }
        return result;
      }
      case ValueKind.SubRef: {
        const shell = this._opts.subShells?.get(node.handle);
        if (shell !== undefined) {
          return shell;
        }
        throw new Error(`Unresolved sub handle 'sub(${node.handle})': no embedded resource with that id.`);
      }
      case ValueKind.ExtRef: {
        const path = this._opts.externals?.get(node.handle);
        if (path !== undefined && this._opts.loadExternal) {
          return this._opts.loadExternal(path, targetType);
        }
        throw new Error(
          `Unresolved ext handle 'ext(${node.handle})': no external declared with that handle, or no loader supplied.`,
        );
      }
    }
  }

  private materializeLiteral(text: string, kind: LiteralKind, targetType: string): unknown {
    switch (kind) {
      case LiteralKind.Null:
        return null;
      case LiteralKind.True:
        return true;
      case LiteralKind.False:
        return false;
      case LiteralKind.String:
        return text;
      case LiteralKind.Number:
        return INTEGER_HINTS.has(targetType) ? parseInt(text, 10) : parseFloat(text);
    }
  }

  private materializeEnum(terms: string[], targetType: string): unknown {
    // Each term is "EnumType.Member"; resolve the member name against the target type's enum table.
    const members = terms.map((term) => {
      const dot = term.lastIndexOf(".");
      return dot >= 0 ? term.slice(dot + 1) : term;
    });

    const descriptor = this._registry.get(targetType);
    if (descriptor?.enums) {
      const resolved = members.map((m) => lookupEnumCI(descriptor.enums!, m));
      // A single non-flag enum resolves to one value; multiple flag terms join numerically if numeric.
      if (resolved.length === 1) {
        return resolved[0] ?? members[0];
      }
      if (resolved.every((v) => typeof v === "number")) {
        return (resolved as number[]).reduce((acc, v) => acc | v, 0);
      }
      return resolved.map((v, i) => v ?? members[i]);
    }

    // No enum table: preserve the member name(s) as the engine's reader would store the parsed value.
    return members.length === 1 ? members[0] : members;
  }

  private materializeStructCtor(typeName: string | null, args: ValueNode[], targetType: string): unknown {
    const name = typeName ?? targetType;
    const descriptor = this._registry.get(name);
    if (!descriptor?.constructors) {
      throw new Error(`No constructors registered for '${name}'.`);
    }

    for (const ctor of descriptor.constructors) {
      if (ctor.params.length !== args.length) {
        continue;
      }

      const built: any[] = [];
      let ok = true;
      for (let i = 0; i < ctor.params.length; i++) {
        const value = this.materializeValue(args[i]!, ctor.params[i]!);
        if (value === undefined) {
          ok = false;
          break;
        }
        built.push(value);
      }
      if (ok) {
        return ctor.create(...built);
      }
    }

    throw new Error(`No matching constructor for '${name}' with ${args.length} argument(s).`);
  }

  private materializeStructBody(typeName: string | null, members: Member[], targetType: string): unknown {
    const name = typeName ?? targetType;

    // An anonymous empty `{}` against a non-registered/`auto` target is a map (the C# resolves the
    // empty case by target type: dictionary -> empty map). Anonymous bodies with members against a
    // non-descriptor target degrade to a plain record.
    const descriptor = this._registry.get(name);
    if (!descriptor) {
      const record: Record<string, unknown> = {};
      for (const m of members) {
        record[m.name] = this.materializeValue(m.value, "auto");
      }
      return record;
    }

    const instance = descriptor.create();
    this.applyMembers(instance, descriptor, members);
    this.invokeAfterDeserialize(instance, descriptor);
    return instance;
  }

  private applyMembers(instance: unknown, descriptor: TypeDescriptor, members: Member[]): void {
    for (const m of members) {
      const propDesc = descriptor.properties?.[m.name] ?? findPropertyCI(descriptor, m.name);
      if (propDesc) {
        const value = this.materializeValue(m.value, propDesc.type);
        if (value !== undefined) {
          propDesc.set(instance, value);
        }
      } else if (descriptor.fallback) {
        const value = this.materializeValue(m.value, "auto");
        if (value !== undefined) {
          descriptor.fallback(instance, m.name, value);
        }
      }
    }
  }

  private invokeAfterDeserialize(instance: unknown, descriptor: TypeDescriptor): void {
    const hook = descriptor.afterDeserialize;
    if (hook && instance && typeof (instance as any)[hook] === "function") {
      (instance as any)[hook]();
    }
  }

  private requireDescriptor(name: string): TypeDescriptor {
    const descriptor = this._registry.get(name);
    if (!descriptor) {
      throw new Error(`No type descriptor registered for '${name}'.`);
    }
    return descriptor;
  }
}

/**
 * Reads a `vres` resource document into a graph: build every `sub` shell first (so references resolve
 * regardless of order or cycles), populate each shell, then populate the root body. Faithful port of
 * `ResourceDocumentReader`. Returns the root instance plus the embedded sub instances.
 */
export function readResourceDocument(
  doc: Document,
  registry: TypeRegistry,
  rootType: string | undefined,
  loadExternal?: ExternalLoader,
): { root: unknown; subs: Map<string, unknown> } {
  // Pass 1: shells.
  const shells = new Map<string, unknown>();
  for (const sub of doc.subBlocks) {
    const descriptor = requireType(registry, sub.typeName, "Sub-resource");
    shells.set(sub.id, descriptor.create());
  }

  let externals: Map<string, string> | undefined;
  if (doc.externals.length > 0) {
    externals = new Map<string, string>();
    for (const ext of doc.externals) {
      externals.set(ext.handle, ext.path);
    }
  }

  const reader = new ValueReader(registry, { subShells: shells, externals, loadExternal });

  // Pass 2: populate each shell, then the root body.
  for (const sub of doc.subBlocks) {
    const descriptor = requireType(registry, sub.typeName, "Sub-resource");
    reader.populateObject(shells.get(sub.id), descriptor, sub.members);
  }

  const concreteRoot = doc.rootTypeName ?? rootType;
  if (!concreteRoot) {
    throw new Error("Cannot determine the resource document's root type.");
  }
  const rootDescriptor = requireType(registry, concreteRoot, "Resource");
  const root = rootDescriptor.create();
  reader.populateObject(root, rootDescriptor, doc.body.members);

  return { root, subs: shells };
}

function requireType(registry: TypeRegistry, name: string, kind: string): TypeDescriptor {
  const descriptor = registry.get(name);
  if (!descriptor) {
    throw new Error(`${kind} type '${name}' is not registered with the serializer.`);
  }
  return descriptor;
}

function findPropertyCI(descriptor: TypeDescriptor, name: string) {
  if (!descriptor.properties) return null;
  const lower = name.toLowerCase();
  for (const [key, desc] of Object.entries(descriptor.properties)) {
    if (key.toLowerCase() === lower) return desc;
  }
  return null;
}

function lookupEnumCI(enums: Record<string, unknown>, member: string): unknown {
  const lower = member.toLowerCase();
  for (const [key, value] of Object.entries(enums)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

/** Strips a single layer of generic args to a list/array element hint (`List<Foo>` -> `Foo`). */
function elementHint(targetType: string): string {
  const lt = targetType.indexOf("<");
  const gt = targetType.lastIndexOf(">");
  if (lt >= 0 && gt > lt) {
    const inner = targetType.slice(lt + 1, gt).trim();
    // Only a single type arg yields an element hint; anything else (a map) degrades to auto.
    return inner.includes(",") ? "auto" : inner;
  }
  if (targetType.endsWith("[]")) {
    return targetType.slice(0, -2);
  }
  return "auto";
}

/** Convenience: parse + read a `vdat`/`vres` document into an instance in one call. */
export function deserialize(
  source: string,
  registry: TypeRegistry,
  options: { sourceName?: string; rootType?: string; loadExternal?: ExternalLoader } = {},
): unknown {
  const { doc, diagnostics } = parse(source, options.sourceName);
  if (!doc) {
    const first = diagnostics.find((d) => d.severity === "error");
    throw new Error(
      `Failed to parse '${options.sourceName ?? "<inline>"}': ${first ? `${first.code}: ${first.message} (at ${first.start})` : "unknown error"}`,
    );
  }

  if (doc.header === "vres") {
    return readResourceDocument(doc, registry, options.rootType, options.loadExternal).root;
  }
  return new ValueReader(registry, { loadExternal: options.loadExternal }).readDocument(doc, options.rootType);
}
