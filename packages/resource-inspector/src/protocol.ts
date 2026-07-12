/**
 * The inspector's input contract: a structural, Godot-inspired property-description protocol.
 * Any object satisfying these shapes is inspectable — carapace deliberately does NOT import an
 * object-model package (independence rule: the engine mirror and the shell never import each
 * other; they meet by shape, composed by host apps). Value-typed properties (colors, vectors)
 * cross this boundary as `number[]` via duck-typed `toArray()` on read and `fromArray` on write,
 * so the inspector never names a concrete value class.
 */

/** A subscription handle; mirrors the object model's Observable contract structurally. */
export interface Subscription {
  unsubscribe(): void;
}

/** A readable/observable value slot. */
export interface ValueSlot {
  get(): unknown;
  subscribe(fn: (value: unknown, previous: unknown) => void): Subscription;
}

export type PropertyKind =
  | "int" | "float" | "bool" | "string" | "enum"
  | "ctor" | "resource" | "array-number" | "array-ctor" | "array-struct" | "custom";

/** One column of a tuple/struct array element. */
export interface TupleMemberDesc {
  name: string;
  kind?: "number" | "enum" | "color";
  options?: string[];
  enumType?: string;
  default?: number;
  /** For color columns: rebuild the typed color value from `[r,g,b,a]`. */
  fromArray?: (nums: number[]) => unknown;
}

/** One inspectable property. */
export interface PropertyDescriptor {
  name: string;
  kind: PropertyKind;
  observable: ValueSlot;
  setValue(v: unknown): void;
  /** The revert pair — equality and defaults live in the object model, not here. */
  isModified(): boolean;
  reset(): void;
  /** For ctor / array-ctor kinds: rebuild the typed (element) value from a number array. */
  fromArray?: (nums: number[]) => unknown;
  baseType?: string;
  ctorName?: string;
  tupleMembers?: TupleMemberDesc[];
  view?: string;
  sorted?: boolean;
  min?: number;
  max?: number;
  step?: number;
  enumOptions?: string[];
  readonly?: boolean;
  order: number;
}

/** An inspectable object. */
export interface PropertySource {
  readonly typeName: string;
  /** Fields declared by the object-model base vs the concrete type — the category split point. */
  readonly baseFieldCount: number;
  sourcePath: string | null;
  fields(): readonly PropertyDescriptor[];
  findField(name: string): PropertyDescriptor | undefined;
  groups(): readonly { name: string; fields: string[]; enabledBy?: string }[];
  visibility(): Record<string, boolean>;
  onChanged(fn: () => void): Subscription;
}

/** Host services the inspector cannot own — type registry concerns supplied by the app. */
export interface PropertyHost {
  /** Instantiate a concrete type by name (base types resolve when exactly one concrete class
   *  satisfies them, host's choice); null when unknown/abstract. */
  createInstance(typeName: string): PropertySource | null;
  /** Whether createInstance would succeed — gates the "create" affordance. */
  canCreate(typeName: string): boolean;
  /** The registered whole-source inspector view key for a type, if any. */
  viewOf?(typeName: string): string | undefined;
}
