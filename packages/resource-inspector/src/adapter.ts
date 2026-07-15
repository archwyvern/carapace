import type { ReactNode } from "react";
import type { InspectorField, InspectorSectionInfo, ObjectField, ArrayField } from "@carapace/shell";
import { ColorF, Vector2, Vector3, Vector4 } from "@carapace/primitives";
import type { PropertyDescriptor, PropertyHost, PropertySource, TupleMemberDesc } from "./protocol";
import { getRegisteredFieldView, getRegisteredView } from "./view-registry";

/** The class-hierarchy categories for a source's fields — concrete type first, then ancestors.
 *  A source declaring its own chain (scene-graph objects) wins; otherwise the binary
 *  typeName/"Resource" split. Used at the root and in sub-inspectors so category order respects
 *  inheritance. */
export function resourceCategories(source: PropertySource): string[] {
  const declared = source.categories?.();
  if (declared && declared.length > 0) return [...declared];
  return source.typeName === "Resource" ? ["Resource"] : [source.typeName, "Resource"];
}

/** Resolve the bespoke whole-source editor: a host `renderResource` override wins, else the view
 *  key the host's registry declares for the type. Applied at the root AND for embedded
 *  sub-sources, so widgets like the curve graph appear at any depth. */
export function resolveResourceView(
  source: PropertySource,
  opts: ResourceAdapterOptions,
): ReactNode | undefined {
  const fromHost = opts.renderResource?.(source);
  if (fromHost) return fromHost;
  const key = opts.host?.viewOf?.(source.typeName);
  return key ? (getRegisteredView(key)?.(source) ?? undefined) : undefined;
}

export interface ResourceAdapterOptions {
  /** Type-registry services from the app (instantiation for "create", type-level view keys). */
  host?: PropertyHost;
  /**
   * Replace the default mapping for a field — e.g. a custom gradient-bar or curve widget.
   * Return a fully-formed field (used as-is) or null to fall back to the default mapping.
   */
  override?: (source: PropertySource, field: PropertyDescriptor) => InspectorField | null;
  /**
   * Editor-supplied visibility, merged OVER the source's own `visibility()` (false hides).
   * For editor-state-dependent rules the data model can't know — e.g. hiding anchor fields
   * while an Anchors Preset is active.
   */
  extraVisibility?: Record<string, boolean>;
  /**
   * Assign a value to a `resource`-kind field. The consumer drives type selection (e.g. a
   * type picker — may resolve asynchronously via a dialog), keeping the adapter
   * data-model-policy-free. Resolve null to cancel. When omitted, creation falls back to
   * `host.createInstance(baseType)`.
   */
  pickType?: (baseType: string) => PropertySource | null | Promise<PropertySource | null>;
  /**
   * Render a bespoke whole-source editor for a given source (e.g. a gradient bar for
   * `Gradient`). Applied at the root AND recursively to every embedded sub-source. Return
   * null to fall back to the generic field list.
   */
  renderResource?: (source: PropertySource) => ReactNode | null;
}

/** A source's groups, as inspector sections (carrying the enable-gate). */
export function resourceToSections(source: PropertySource): InspectorSectionInfo[] {
  return source.groups().map((g) => ({ name: g.name, enabledBy: g.enabledBy }));
}

/**
 * Project a source's `PropertyDescriptor[]` onto the shell `InspectorField[]`. Value-types
 * cross as `number[]` (duck-typed `toArray()` / descriptor `fromArray`); `resource` fields
 * recurse into a nested object field. Group / visibility / modified / reset metadata is filled
 * from the source. The shell Inspector never sees the object model.
 */
export function resourceToFields(source: PropertySource, opts: ResourceAdapterOptions = {}): InspectorField[] {
  const groupOf = new Map<string, string>();
  for (const g of source.groups()) for (const fname of g.fields) groupOf.set(fname.toLowerCase(), g.name);
  const visibility = { ...source.visibility(), ...opts.extraVisibility };
  const baseCount = source.baseFieldCount;
  const typeName = source.typeName;

  const out: InspectorField[] = [];
  source.fields().forEach((fi, i) => {
    const category = fi.category ?? (i < baseCount ? "Resource" : typeName);
    const overridden = opts.override?.(source, fi);
    if (overridden) {
      overridden.category = category;
      out.push(overridden);
      return;
    }
    if (fi.view) {
      const render = getRegisteredFieldView(fi.view);
      if (render) {
        out.push({ key: fi.name, label: humanize(fi.name), kind: "custom", category, render: () => render(source, fi) });
        return;
      }
    }
    const field = mapField(fi, opts);
    if (!field) return;
    field.group = groupOf.get(fi.name.toLowerCase());
    field.category = category;
    field.hidden = visibility[fi.name] === false;
    field.readOnly = fi.readonly;
    // Read-only fields get no revert affordance — "no edit, no reset button".
    field.modified = fi.readonly ? false : fi.isModified();
    field.onReset = fi.readonly ? undefined : () => fi.reset();
    out.push(field);
  });
  return out;
}

const VEC_SIZE: Record<string, 2 | 3 | 4> = { Vector2: 2, Vector3: 3, Vector4: 4 };

/** A value that can render as numbers (colors, vectors) — duck-typed, no value-class import. */
interface ArrayLikeValue {
  toArray(): number[];
}

/** A color value as [r,g,b,a]: typed values via toArray(), raw arrays as-is (a color column
 *  without a fromArray factory stores number[] — render it rather than crash). */
function colorAsArray(value: unknown): number[] {
  if (typeof (value as ArrayLikeValue | undefined)?.toArray === "function") return (value as ArrayLikeValue).toArray();
  if (Array.isArray(value)) return value as number[];
  return [1, 1, 1, 1];
}

function mapField(fi: PropertyDescriptor, opts: ResourceAdapterOptions): InspectorField | null {
  const key = fi.name;
  const label = humanize(fi.name);
  const value = fi.observable.get();
  const set = (v: unknown) => fi.setValue(v);

  switch (fi.kind) {
    case "int":
      return { key, label, kind: "number", value: value as number, integer: true, min: fi.min, max: fi.max, step: fi.step, onChange: set };
    case "float":
      return { key, label, kind: "number", value: value as number, min: fi.min, max: fi.max, step: fi.step, onChange: set };
    case "bool":
      return { key, label, kind: "bool", value: value as boolean, onChange: set };
    case "string":
      return { key, label, kind: "string", value: value as string, onChange: set };
    case "enum": {
      const options = fi.enumOptions ?? [];
      const idx = Math.max(0, options.indexOf(value as string));
      return { key, label, kind: "enum", value: idx, options, onChange: (i) => set(options[i]) };
    }
    case "ctor":
      return mapCtor(key, label, fi, value, set);
    case "resource":
      return mapResource(key, label, fi, value as PropertySource | null, opts);
    case "array-number":
      return mapNumberArray(key, label, value as number[], set);
    case "array-ctor":
      return mapCtorArray(key, label, fi, value as unknown[], set);
    case "array-struct":
      return mapStructBodyArray(key, label, fi, value as Record<string, unknown>[], set);
    case "custom":
      // No generic renderer for opaque custom values — the consumer supplies one via `override`.
      return null;
  }
}

/** The primitive factory for a ctor name — the fallback when a descriptor omits `fromArray`. */
function ctorFromArray(ctorName: string | undefined): ((nums: number[]) => unknown) | undefined {
  switch (ctorName) {
    case "Color": return (n) => ColorF.fromArray(n);
    case "Vector2": return (n) => Vector2.fromArray(n);
    case "Vector3": return (n) => Vector3.fromArray(n);
    case "Vector4": return (n) => Vector4.fromArray(n);
    default: return undefined;
  }
}

function mapCtor(key: string, label: string, fi: PropertyDescriptor, value: unknown, set: (v: unknown) => void): InspectorField | null {
  const fromArray = fi.fromArray ?? ctorFromArray(fi.ctorName);
  if (!fromArray) return null;
  const nums = (value as ArrayLikeValue).toArray();
  if (fi.ctorName === "Color") {
    return { key, label, kind: "color", value: nums, hasAlpha: true, onChange: (a) => set(fromArray(a)) };
  }
  const size = VEC_SIZE[fi.ctorName ?? ""];
  if (size) {
    return { key, label, kind: "vec", value: nums, size, onChange: (a) => set(fromArray(a)) };
  }
  return null;
}

function mapResource(key: string, label: string, fi: PropertyDescriptor, sub: PropertySource | null, opts: ResourceAdapterOptions): ObjectField {
  const baseType = fi.baseType ?? "Resource";
  // The create affordance is gated by the host's assignability answer either way; pickType only
  // changes HOW a type is chosen (dialog vs unique-concrete resolution).
  const creatable = opts.host ? opts.host.canCreate(baseType) : opts.pickType != null;
  const onCreate = !creatable
    ? undefined
    : opts.pickType
      ? () => {
          void Promise.resolve(opts.pickType!(baseType)).then((made) => {
            if (made) fi.setValue(made);
          });
        }
      : opts.host
        ? () => {
            const made = opts.host!.createInstance(baseType);
            if (made) fi.setValue(made);
          }
        : undefined;
  return {
    key,
    label,
    kind: "object",
    fields: sub ? resourceToFields(sub, opts) : null,
    customRender: sub ? resolveResourceView(sub, opts) : undefined,
    categories: sub ? resourceCategories(sub) : undefined,
    sections: sub ? resourceToSections(sub) : undefined,
    typeName: sub?.typeName,
    onCreate,
    onClear: sub ? () => fi.setValue(null) : undefined,
  };
}

function mapNumberArray(key: string, label: string, arr: number[], set: (v: number[]) => void): ArrayField {
  return {
    key,
    label,
    kind: "array",
    items: arr.map((n, i) => ({
      key: `${key}[${i}]`,
      label: String(i),
      kind: "number",
      value: n,
      onChange: (v: number) => set(arr.map((x, j) => (j === i ? v : x))),
    })),
    onAdd: () => set([...arr, 0]),
    onRemove: (i) => set(arr.filter((_, j) => j !== i)),
  };
}

function mapCtorArray(key: string, label: string, fi: PropertyDescriptor, arr: unknown[], set: (v: unknown[]) => void): ArrayField | null {
  if (fi.ctorName === "Color" && fi.fromArray) {
    return {
      key,
      label,
      kind: "array",
      items: arr.map((c, i) => ({
        key: `${key}[${i}]`,
        label: String(i),
        kind: "color",
        value: (c as ArrayLikeValue).toArray(),
        hasAlpha: true,
        onChange: (a: number[]) => set(arr.map((x, j) => (j === i ? fi.fromArray!(a) : x))),
      })),
      onAdd: () => set([...arr, fi.fromArray!([1, 1, 1, 1])]),
      onRemove: (i) => set(arr.filter((_, j) => j !== i)),
    };
  }
  // Other tuple arrays (e.g. CurvePoint) aren't resources, so each element renders as a light struct
  // card (the `struct` object variant), not a sub-resource box. A source wanting a bespoke layout
  // (e.g. a Curve's Points group) declares a field `view` instead, intercepted before this.
  if (fi.tupleMembers && fi.tupleMembers.length > 0) {
    return mapStructArray(key, label, fi.tupleMembers, arr as number[][], set as (v: number[][]) => void);
  }
  return null;
}

function mapStructArray(key: string, label: string, members: TupleMemberDesc[], arr: number[][], set: (v: number[][]) => void): ArrayField {
  const setMember = (row: number, col: number, value: number) =>
    set(arr.map((t, j) => {
      if (j !== row) return t;
      const copy = t.slice();
      while (copy.length <= col) copy.push(0);
      copy[col] = value;
      return copy;
    }));
  const memberField = (rowKey: string, m: TupleMemberDesc, col: number, tuple: number[], row: number): InspectorField => {
    const base = { key: `${rowKey}.${m.name}`, label: humanize(m.name) };
    const value = tuple[col] ?? m.default ?? 0;
    return m.kind === "enum"
      ? { ...base, kind: "enum", value: Math.max(0, value), options: m.options ?? [], onChange: (idx: number) => setMember(row, col, idx) }
      : { ...base, kind: "number", value, onChange: (v: number) => setMember(row, col, v) };
  };
  return {
    key,
    label,
    kind: "array",
    items: arr.map((tuple, i) => ({
      key: `${key}[${i}]`,
      label: String(i),
      kind: "object",
      variant: "struct",
      fields: members.map((m, col) => memberField(`${key}[${i}]`, m, col, tuple, i)),
    })),
    onAdd: () => set([...arr, members.map(m => m.default ?? 0)]),
    onRemove: (i) => set(arr.filter((_, j) => j !== i)),
  };
}

/** Named-member struct-body arrays (engine value types like GradientPoint): elements are objects
 *  keyed by member name; columns typed number | enum | color per TupleMemberDesc. */
function mapStructBodyArray(
  key: string,
  label: string,
  fi: PropertyDescriptor,
  arr: Record<string, unknown>[],
  set: (v: Record<string, unknown>[]) => void,
): ArrayField | null {
  const members = fi.tupleMembers;
  if (!members || members.length === 0) return null;

  const setMember = (row: number, name: string, value: unknown) =>
    set(arr.map((el, j) => (j === row ? { ...el, [name]: value } : el)));

  const defaultElement = (): Record<string, unknown> => {
    const el: Record<string, unknown> = {};
    for (const m of members) {
      el[m.name] = m.kind === "color"
        ? m.fromArray?.([1, 1, 1, 1]) ?? [1, 1, 1, 1]
        : m.kind === "enum"
          ? m.options?.[m.default ?? 0] ?? ""
          : m.default ?? 0;
    }
    return el;
  };

  const memberField = (rowKey: string, m: TupleMemberDesc, element: Record<string, unknown>, row: number): InspectorField => {
    const base = { key: `${rowKey}.${m.name}`, label: humanize(m.name) };
    const value = element[m.name];
    switch (m.kind) {
      case "color":
        return {
          ...base,
          kind: "color",
          value: colorAsArray(value),
          hasAlpha: true,
          onChange: (a: number[]) => setMember(row, m.name, m.fromArray?.(a) ?? a),
        };
      case "enum": {
        const options = m.options ?? [];
        const idx = Math.max(0, options.indexOf(value as string));
        return { ...base, kind: "enum", value: idx, options, onChange: (i: number) => setMember(row, m.name, options[i]) };
      }
      default:
        return { ...base, kind: "number", value: typeof value === "number" ? value : m.default ?? 0, onChange: (v: number) => setMember(row, m.name, v) };
    }
  };

  return {
    key,
    label,
    kind: "array",
    items: arr.map((element, i) => ({
      key: `${key}[${i}]`,
      label: String(i),
      kind: "object",
      variant: "struct",
      fields: members.map((m) => memberField(`${key}[${i}]`, m, element, i)),
    })),
    onAdd: () => set([...arr, defaultElement()]),
    onRemove: (i) => set(arr.filter((_, j) => j !== i)),
  };
}

/** "FillFrom" -> "Fill From", "UseHDR" -> "Use HDR", "InterpolationMode" -> "Interpolation Mode". */
function humanize(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}
