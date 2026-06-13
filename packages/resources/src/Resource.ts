import { Observable, equal, type Subscription } from "./Observable";
import { Vector2, Vector3, Vector4, ColorF } from "@carapace/primitives";

/**
 * Mirrors `Archwyvern.Hardcoded.ExportMode`: controls whether an exported member
 * accepts an inline definition, a path reference, or both. Retained as field
 * metadata; the serialization that consumes it is deferred (no vascal yet).
 */
export const ExportMode = {
  Any: "Any",
  Inline: "Inline",
  Reference: "Reference",
} as const;

export type ExportModeValue = typeof ExportMode[keyof typeof ExportMode];

/** Sentinel for "no explicit emit-order hint" (engine `ExportAttribute.Unordered`). */
const UNORDERED = Number.MAX_SAFE_INTEGER;

export type FieldKind =
  | "int"
  | "float"
  | "bool"
  | "string"
  | "enum"
  | "ctor"           // typed tuple, e.g. Color(r,g,b,a), Vector2(x,y)
  | "resource"
  | "array-number"
  | "array-ctor"     // array of typed tuples, e.g. [Color(...)]
  | "custom";

/** Groups fields under a named collapsible section in the inspector. */
export interface GroupInfo {
  name: string;
  fields: string[];
  /**
   * Name of a bool field that enables/disables the group. Rendered as a checkbox in the
   * group header; when off, the other fields in the group are hidden.
   */
  enabledBy?: string;
}

export interface FieldInfo {
  name: string;
  kind: FieldKind;
  observable: Observable<unknown>;
  /** Assign a value to the field's observable, hiding the captured generic type T. */
  setValue(v: unknown): void;
  /** Default value used for reset and modified-state detection. */
  defaultValue: unknown;
  /** For resource fields, the expected base type name. */
  baseType?: string;
  /** For ctor / array-ctor, the typed constructor name (e.g. "Color", "Vector2"). */
  ctorName?: string;
  /** For int/float with a known range, used by widgets. */
  min?: number;
  max?: number;
  step?: number;
  /** For enum fields, allowed identifier names. */
  enumOptions?: string[];
  /** When true, the field renders as read-only (no edit, no reset button). */
  readonly?: boolean;
  /** When true, the field is not written on save (once serialization exists). */
  transient?: boolean;
  /** Ellipsis direction for string truncation; "start" is useful for paths. */
  ellipsis?: "start" | "end";
  /** Engine emit-order hint mirroring `[VascalProperty(Order = N)]`. */
  order: number;
  /** Set at registration so order sorting can break ties on declaration order. */
  declarationIndex: number;
  /** Engine `[VascalProperty(ExportMode.X)]` constraint. Defaults to `Any`. */
  mode: ExportModeValue;
}

/** True when the field's current value differs from its declared default. */
export function isFieldModified(field: FieldInfo): boolean {
  return !equal(field.observable.get(), field.defaultValue);
}

/**
 * Count fields on an instance (recursing into inlined sub-resources) whose value
 * differs from its declared default. File-backed resources stop the recursion.
 */
export function countModifiedFields(instance: Resource): number {
  let count = 0;
  for (const field of instance.fields()) {
    if (field.kind === "custom") continue;
    if (isFieldModified(field)) count++;
    if (field.kind === "resource") {
      const sub = field.observable.get();
      if (sub instanceof Resource && !sub.sourcePath) {
        count += countModifiedFields(sub);
      }
    }
  }
  return count;
}

/** Restore a field to its declared default. Arrays are deep-cloned to keep the stored default intact. */
export function resetField(field: FieldInfo): void {
  const def = field.defaultValue;
  const next = deepCloneValue(def);
  (field.observable as Observable<unknown>).set(next);
}

function deepCloneValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(deepCloneValue);
  return v;
}

/** Base class for live, observable resource instances. */
export abstract class Resource {
  owner: Resource | null = null;
  private _changeListeners = new Set<() => void>();
  private _fields: FieldInfo[] = [];

  protected readonly prop = createPropFactory(this);

  /** File path on disk, or empty string for embedded/unsaved resources. */
  readonly path = this.prop.string("Path", "", { readonly: true, transient: true, ellipsis: "start" });

  /** Number of fields declared on Resource itself — marks the boundary for the automatic
   *  Resource category. Set at the end of this class's constructor, before subclass initialisers. */
  readonly _baseFieldCount: number;

  constructor() {
    this._baseFieldCount = this._fields.length;
  }

  get typeName(): string {
    return this.constructor.name;
  }

  get sourcePath(): string | null {
    const v = this.path.get();
    return v === "" ? null : v;
  }

  set sourcePath(v: string | null) {
    this.path.set(v ?? "");
  }

  fields(): readonly FieldInfo[] {
    return this._fields;
  }

  /**
   * Override to declare inspector property groups. Listed fields are moved under a named section.
   * Subclass overrides should `...super.groups()` to retain inherited groups.
   */
  groups(): readonly GroupInfo[] {
    return [];
  }

  /**
   * Override to declare conditional visibility. Return a map of field name → visible.
   * Omitted fields are visible by default.
   */
  visibility(): Record<string, boolean> {
    return {};
  }

  findField(name: string): FieldInfo | undefined {
    const lower = name.toLowerCase();
    return this._fields.find(f => f.name.toLowerCase() === lower);
  }

  _registerField(field: FieldInfo): void {
    this._fields.push(field);
  }

  _onPropertyChanged(name: string, _prev: unknown, _next: unknown): void {
    for (const fn of this._changeListeners) fn();
    this.owner?._onPropertyChanged(`${this.typeName}.${name}`, _prev, _next);
  }

  onChanged(fn: () => void): Subscription {
    this._changeListeners.add(fn);
    return { unsubscribe: () => { this._changeListeners.delete(fn); } };
  }
}

// -- Field factory --

interface PropOpts {
  min?: number;
  max?: number;
  step?: number;
  readonly?: boolean;
  transient?: boolean;
  ellipsis?: "start" | "end";
  /** Engine emit-order hint. Mirrors `[VascalProperty(Order = N)]`. */
  order?: number;
  /** Engine `[VascalProperty(ExportMode.X)]`. */
  mode?: ExportModeValue;
}

type StringOpts = Pick<PropOpts, "readonly" | "transient" | "ellipsis" | "order">;
type ScalarOpts = Pick<PropOpts, "readonly" | "transient" | "order">;
type CtorOpts = Pick<PropOpts, "order">;
type ResourceOpts = Pick<PropOpts, "order" | "mode">;

function createPropFactory(instance: Resource) {
  const register = <T>(name: string, kind: FieldKind, initial: T, opts: PropOpts & Partial<FieldInfo> = {}): Observable<T> => {
    const obs = new Observable<T>(name, initial, (n, p, v) => instance._onPropertyChanged(n, p, v));
    const defaultValue = Array.isArray(initial) ? deepCloneValue(initial) : initial;
    const { readonly, transient, ellipsis, order, mode, ...extra } = opts;
    const info: FieldInfo = {
      name, kind,
      observable: obs as Observable<unknown>,
      setValue: (v) => obs.set(v as T),
      defaultValue,
      order: order ?? UNORDERED,
      declarationIndex: instance.fields().length,
      mode: mode ?? ExportMode.Any,
      ...extra,
      ...(readonly ? { readonly: true } : {}),
      ...(transient ? { transient: true } : {}),
      ...(ellipsis ? { ellipsis } : {}),
    };
    instance._registerField(info);

    // Resource fields auto-wire ownership: the assigned sub-instance's .owner points at us,
    // and a displaced sub-instance has its owner cleared if we were still its parent.
    if (kind === "resource") {
      const resourceObs = obs as unknown as Observable<Resource | null>;
      resourceObs.subscribe((next, prev) => {
        if (prev instanceof Resource && !prev.sourcePath && prev.owner === instance) {
          prev.owner = null;
        }
        if (next instanceof Resource && !next.sourcePath) {
          next.owner = instance;
        }
      });
    }

    return obs;
  };
  return {
    int: (name: string, def = 0, opts: PropOpts = {}) => register<number>(name, "int", def, opts),
    float: (name: string, def = 0, opts: PropOpts = {}) => register<number>(name, "float", def, opts),
    bool: (name: string, def = false, opts: ScalarOpts = {}) => register<boolean>(name, "bool", def, opts),
    string: (name: string, def = "", opts: StringOpts = {}) => register<string>(name, "string", def, opts),
    enum: (name: string, def: string, enumOptions?: string[], opts: CtorOpts = {}) => register<string>(name, "enum", def, { enumOptions, ...opts }),
    vector2: (name: string, x = 0, y = 0, opts: CtorOpts = {}) => register<Vector2>(name, "ctor", new Vector2(x, y), { ctorName: "Vector2", ...opts }),
    vector3: (name: string, x = 0, y = 0, z = 0, opts: CtorOpts = {}) => register<Vector3>(name, "ctor", new Vector3(x, y, z), { ctorName: "Vector3", ...opts }),
    vector4: (name: string, x = 0, y = 0, z = 0, w = 0, opts: CtorOpts = {}) => register<Vector4>(name, "ctor", new Vector4(x, y, z, w), { ctorName: "Vector4", ...opts }),
    color: (name: string, r = 1, g = 1, b = 1, a = 1, opts: CtorOpts = {}) => register<ColorF>(name, "ctor", new ColorF(r, g, b, a), { ctorName: "Color", ...opts }),
    resource: <T extends Resource | null>(name: string, baseType: string, def: T, opts: ResourceOpts = {}) =>
      register<T>(name, "resource", def, { baseType, ...opts }),
    arrayNumber: (name: string, def: number[] = [], opts: CtorOpts = {}) => register<number[]>(name, "array-number", def, opts),
    arrayColor: (name: string, def: ColorF[] = [], opts: CtorOpts = {}) => register<ColorF[]>(name, "array-ctor", def, { ctorName: "Color", ...opts }),
    arrayTuple: (name: string, ctorName: string, def: number[][] = [], opts: CtorOpts = {}) => register<number[][]>(name, "array-ctor", def, { ctorName, ...opts }),
    custom: <T>(name: string, def: T, opts: CtorOpts = {}) => register<T>(name, "custom", def, opts),
  };
}
