import {
  Resource,
  isFieldModified,
  resetField,
  getResourceClass,
  instantiateResourceClass,
  isAbstractResourceClass,
} from "@carapace/resources";
import type { FieldInfo } from "@carapace/resources";
import { ColorF, Vector2, Vector3, Vector4 } from "@carapace/primitives";
import type { ReactNode } from "react";
import type { InspectorField, InspectorSectionInfo, ObjectField, ArrayField } from "@carapace/shell";

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
    customRender: sub ? (opts.renderResource?.(sub) ?? undefined) : undefined,
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
  // Other tuple arrays (e.g. CurvePoint) are best edited by a custom widget via `override`.
  return null;
}

/** "FillFrom" -> "Fill From", "UseHDR" -> "Use HDR", "InterpolationMode" -> "Interpolation Mode". */
function humanize(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}
