/**
 * The consumer-driven type registry. The format engine is generic: it knows nothing about the
 * resource model. A consumer registers a `TypeDescriptor` per serialized type name, and those
 * descriptors drive (de)serialization — the TypeScript analogue of the C# serializer's reflection
 * over `[Export]`-marked members and resolved constructors (`VresSerializer`).
 *
 * A descriptor supplies:
 *  - `create()` — a factory for a fresh instance (the C# public parameterless ctor)
 *  - `properties` — the named `[Export]` members, each with a type hint and a setter
 *  - `constructors` — value-type constructor forms (`Vec2(x, y)`), matched by arity then params
 *  - `enums` — nested enum values keyed by member name, for `EnumType.Member` resolution
 *  - `afterDeserialize` — a method name invoked once the body is populated (`IAfterDeserialize`)
 */

/** A `[Export]` member descriptor. `type` is a type hint used to materialize the value. */
export interface PropertyDescriptor {
  /** Type hint: a registered type name, a builtin (`int`, `float`, `string`, `bool`, ...), or `auto`. */
  type: string;
  /** Writes the materialized value onto the instance. */
  set: (instance: any, value: any) => void;
  /** Reads the value from the instance, for serialization. Optional. */
  get?: (instance: any) => unknown;
}

/** A value-type constructor form. `params` are per-argument type hints; `create` builds the value. */
export interface ConstructorDescriptor {
  params: string[];
  create: (...args: any[]) => any;
}

export interface TypeDescriptor {
  name: string;
  create: () => any;
  properties?: Record<string, PropertyDescriptor>;
  constructors?: ConstructorDescriptor[];
  /** Nested enum values keyed by member name (case-insensitive lookup). */
  enums?: Record<string, unknown>;
  /** Method name invoked on the instance after its body is populated. */
  afterDeserialize?: string;
  /** Receives any member with no matching property descriptor (lenient bag types). */
  fallback?: (instance: any, name: string, value: unknown) => void;
}

export class TypeRegistry {
  private _types = new Map<string, TypeDescriptor>();

  register(descriptor: TypeDescriptor): void {
    this._types.set(descriptor.name.toLowerCase(), descriptor);
  }

  get(name: string): TypeDescriptor | undefined {
    return this._types.get(name.toLowerCase());
  }

  has(name: string): boolean {
    return this._types.has(name.toLowerCase());
  }
}
