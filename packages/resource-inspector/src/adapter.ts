import {
  Resource,
  isFieldModified,
  resetField,
  getResourceClass,
  getResourceView,
  instantiateResourceClass,
  isAbstractResourceClass,
} from "@carapace/resources";
import type { FieldInfo, TupleMember } from "@carapace/resources";
import { ColorF, Vector2, Vector3, Vector4 } from "@carapace/primitives";
import type { ReactNode } from "react";
import type { InspectorField, InspectorSectionInfo, ObjectField, ArrayField } from "@carapace/shell";
import { getRegisteredFieldView, getRegisteredView } from "./view-registry";

/** The class-hierarchy categories for a resource's fields — concrete type first, then the inherited
 *  `Resource` base. Used at the root and in sub-inspectors so category order respects inheritance. */
export function resourceCategories(resource: Resource): string[] {
  return resource.typeName === "Resource" ? ["Resource"] : [resource.typeName, "Resource"];
}

/** Resolve the bespoke whole-resource editor for an instance: a host `renderResource` override wins,
 *  else the view the resource's type declares (`registerResourceClass(..., { view })`). Applied at
 *  the root AND for embedded sub-resources, so widgets like the curve graph appear at any depth. */
export function resolveResourceView(resource: Resource, renderResource?: (r: Resource) => ReactNode | null): ReactNode | undefined {
  const fromHost = renderResource?.(resource);
  if (fromHost) return fromHost;
  const key = getResourceView(resource.typeName);
  return key ? (getRegisteredView(key)?.(resource) ?? undefined) : undefined;
}

export interface ResourceAdapterOptions {
  /**
   * Replace the default mapping for a field — e.g. a custom gradient-bar or curve widget.
   * Return a fully-formed field (used as-is) or null to fall back to the default mapping.
   */
  override?: (resource: Resource, field: FieldInfo) => InspectorField | null;
  /**
   * Assign a value to a `resource`-kind field. The consumer drives type selection (e.g. a
   * type picker), keeping the adapter data-model-policy-free. Return null to cancel. When
   * omitted, a `resource` field whose base type is a single concrete class auto-creates it.
   */
  pickType?: (baseType: string) => Resource | null;
  /**
   * Render a bespoke whole-resource editor for a given resource (e.g. a gradient bar for
   * `Gradient`). Applied at the root AND recursively to every embedded sub-resource. Return
   * null to fall back to the generic field list.
   */
  renderResource?: (resource: Resource) => ReactNode | null;
}

/** A resource's groups, as inspector sections (carrying the enable-gate). */
export function resourceToSections(resource: Resource): InspectorSectionInfo[] {
  return resource.groups().map((g) => ({ name: g.name, enabledBy: g.enabledBy }));
}

/**
 * Project a resource's `FieldInfo[]` onto the shell `InspectorField[]`. Value-types
 * (`ColorF`, `Vector2/3/4`) are converted to `number[]` at the `FormColor`/`FormVec` seam;
 * `resource` fields recurse into a nested object field. Group / visibility / modified / reset
 * metadata is filled from the resource. The shell Inspector never sees a `Resource`.
 */
export function resourceToFields(resource: Resource, opts: ResourceAdapterOptions = {}): InspectorField[] {
  const groupOf = new Map<string, string>();
  for (const g of resource.groups()) for (const fname of g.fields) groupOf.set(fname.toLowerCase(), g.name);
  const visibility = resource.visibility();
  // Fields declared on the Resource base sort under a "Resource" category; the rest under
  // the concrete type. `_baseFieldCount` marks the boundary (base fields come first).
  const baseCount = resource._baseFieldCount;
  const typeName = resource.typeName;

  const out: InspectorField[] = [];
  resource.fields().forEach((fi, i) => {
    const category = i < baseCount ? "Resource" : typeName;
    const overridden = opts.override?.(resource, fi);
    if (overridden) {
      overridden.category = category;
      out.push(overridden);
      return;
    }
    // A field that declares a custom view is rendered by the resource's own component (e.g. a
    // Curve's Points group), not the generic per-kind widget. Falls through if no component is
    // registered for the key.
    if (fi.view) {
      const render = getRegisteredFieldView(fi.view);
      if (render) {
        out.push({ key: fi.name, label: humanize(fi.name), kind: "custom", category, render: () => render(resource, fi) });
        return;
      }
    }
    const field = mapField(fi, opts);
    if (!field) return;
    field.group = groupOf.get(fi.name.toLowerCase());
    field.category = category;
    field.hidden = visibility[fi.name] === false;
    field.readOnly = fi.readonly;
    field.modified = isFieldModified(fi);
    field.onReset = () => resetField(fi);
    out.push(field);
  });
  return out;
}

const VEC_SIZE: Record<string, 2 | 3 | 4> = { Vector2: 2, Vector3: 3, Vector4: 4 };
const VEC_CTOR = { 2: Vector2, 3: Vector3, 4: Vector4 } as const;

function mapField(fi: FieldInfo, opts: ResourceAdapterOptions): InspectorField | null {
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
      return mapResource(key, label, fi, value as Resource | null, opts);
    case "array-number":
      return mapNumberArray(key, label, value as number[], set);
    case "array-ctor":
      return mapCtorArray(key, label, fi, value as unknown[], set);
    case "custom":
      // No generic renderer for opaque custom values — the consumer supplies one via `override`.
      return null;
  }
}

function mapCtor(key: string, label: string, fi: FieldInfo, value: unknown, set: (v: unknown) => void): InspectorField | null {
  if (fi.ctorName === "Color") {
    return { key, label, kind: "color", value: (value as ColorF).toArray(), hasAlpha: true, onChange: (a) => set(ColorF.fromArray(a)) };
  }
  const size = VEC_SIZE[fi.ctorName ?? ""];
  if (size) {
    const ctor = VEC_CTOR[size];
    return { key, label, kind: "vec", value: (value as { toArray(): number[] }).toArray(), size, onChange: (a) => set(ctor.fromArray(a)) };
  }
  return null;
}

function mapResource(key: string, label: string, fi: FieldInfo, sub: Resource | null, opts: ResourceAdapterOptions): ObjectField {
  const baseType = fi.baseType ?? "Resource";
  const cls = getResourceClass(baseType);
  const onCreate = opts.pickType
    ? () => {
        const made = opts.pickType?.(baseType);
        if (made) fi.setValue(made);
      }
    : cls && !isAbstractResourceClass(cls)
      ? () => fi.setValue(instantiateResourceClass(cls))
      : undefined;
  return {
    key,
    label,
    kind: "object",
    fields: sub ? resourceToFields(sub, opts) : null,
    customRender: sub ? resolveResourceView(sub, opts.renderResource) : undefined,
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

function mapCtorArray(key: string, label: string, fi: FieldInfo, arr: unknown[], set: (v: unknown[]) => void): ArrayField | null {
  if (fi.ctorName === "Color") {
    const cols = arr as ColorF[];
    return {
      key,
      label,
      kind: "array",
      items: cols.map((c, i) => ({
        key: `${key}[${i}]`,
        label: String(i),
        kind: "color",
        value: c.toArray(),
        hasAlpha: true,
        onChange: (a: number[]) => set(cols.map((x, j) => (j === i ? ColorF.fromArray(a) : x))),
      })),
      onAdd: () => set([...cols, new ColorF(1, 1, 1, 1)]),
      onRemove: (i) => set(cols.filter((_, j) => j !== i)),
    };
  }
  // Other tuple arrays (e.g. CurvePoint) aren't resources, so each element renders as a light struct
  // card (the `struct` object variant), not a sub-resource box. A resource wanting a bespoke layout
  // (e.g. a Curve's Points group) declares a field `view` instead, intercepted before this.
  if (fi.tupleMembers && fi.tupleMembers.length > 0) {
    return mapStructArray(key, label, fi.tupleMembers, arr as number[][], set as (v: number[][]) => void);
  }
  return null;
}

function mapStructArray(key: string, label: string, members: TupleMember[], arr: number[][], set: (v: number[][]) => void): ArrayField {
  const setMember = (row: number, col: number, value: number) =>
    set(arr.map((t, j) => {
      if (j !== row) return t;
      const copy = t.slice();
      while (copy.length <= col) copy.push(0);
      copy[col] = value;
      return copy;
    }));
  const memberField = (rowKey: string, m: TupleMember, col: number, tuple: number[], row: number): InspectorField => {
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

/** "FillFrom" -> "Fill From", "UseHDR" -> "Use HDR", "InterpolationMode" -> "Interpolation Mode". */
function humanize(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}
