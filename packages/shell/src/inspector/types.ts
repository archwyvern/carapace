import type { ReactNode } from "react";

/**
 * Common to every field. Fields are SELF-CONTAINED: each carries its own value +
 * change handler (rather than the Inspector threading a single `onChange(key, value)`).
 * This maps directly onto a resource's per-property `observable`/`setValue` and works
 * the same for plain objects — the field provider owns the mutate-vs-clone decision.
 */
export interface InspectorFieldBase {
  /** Stable identity within its level (typically the property key). */
  key: string;
  label: string;
  /** Section this field belongs to (matches an `InspectorSectionInfo.name`). */
  group?: string;
  /** Class-hierarchy category (e.g. the declaring type vs an inherited base). When the
   *  Inspector is given `categories`, fields are bucketed under a header per category. */
  category?: string;
  readOnly?: boolean;
  /** Recomputed each render by the provider (e.g. from a resource's `visibility()`). */
  hidden?: boolean;
  /** Value differs from its declared default — drives the modified dot + reset. */
  modified?: boolean;
  onReset?: () => void;
}

export interface NumberField extends InspectorFieldBase {
  kind: "number";
  value: number;
  onChange: (v: number) => void;
  /** Fired on commit (drag-release / Enter / blur). Pair with onChange for undo coalescing. */
  onCommit?: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
}

export interface BoolField extends InspectorFieldBase {
  kind: "bool";
  value: boolean;
  onChange: (v: boolean) => void;
}

export interface StringField extends InspectorFieldBase {
  kind: "string";
  value: string;
  onChange: (v: string) => void;
  onCommit?: (v: string) => void;
}

export interface EnumField extends InspectorFieldBase {
  kind: "enum";
  /** Selected option index. */
  value: number;
  options: string[];
  onChange: (v: number) => void;
}

export interface ColorField extends InspectorFieldBase {
  kind: "color";
  /** [r,g,b] or [r,g,b,a], components 0..1. */
  value: number[];
  hasAlpha?: boolean;
  onChange: (v: number[]) => void;
}

export interface VecField extends InspectorFieldBase {
  kind: "vec";
  value: number[];
  size: 2 | 3 | 4;
  step?: number;
  onChange: (v: number[]) => void;
}

export interface ObjectField extends InspectorFieldBase {
  kind: "object";
  /** Sub-fields of the current value, or null when unset/empty. */
  fields: InspectorField[] | null;
  /** A bespoke editor for this whole sub-resource (e.g. a gradient bar). When set, it
   *  replaces the generic `fields` list under the header. */
  customRender?: ReactNode;
  /** Display name of the assigned type (e.g. "FastNoiseLite"). */
  typeName?: string;
  /** Leading icon for the assigned type. */
  icon?: ReactNode;
  /** Assign / replace the value (the consumer drives type selection). */
  onCreate?: () => void;
  /** Clear the value back to unset. */
  onClear?: () => void;
}

export interface ArrayField extends InspectorFieldBase {
  kind: "array";
  /** One self-contained field per element. */
  items: InspectorField[];
  onAdd?: () => void;
  onRemove?: (index: number) => void;
}

export interface CustomField extends InspectorFieldBase {
  kind: "custom";
  render: () => ReactNode;
}

export type InspectorField =
  | NumberField
  | BoolField
  | StringField
  | EnumField
  | ColorField
  | VecField
  | ObjectField
  | ArrayField
  | CustomField;

/** A named, collapsible group of fields (mirrors a resource's `GroupInfo`). */
export interface InspectorSectionInfo {
  name: string;
  /** Key of a bool field that gates the section: a header checkbox; members hide when off. */
  enabledBy?: string;
}

export interface InspectorProps {
  fields: InspectorField[];
  /**
   * Section metadata. Fields are grouped by `field.group` -> `section.name`; fields with
   * no group render first, ungrouped. Group names present on fields but absent here still
   * render as (un-gated) sections, in first-appearance order after the listed ones.
   */
  sections?: InspectorSectionInfo[];
  /**
   * Ordered class-hierarchy categories (e.g. `["Gradient", "Resource"]`). When set, fields
   * are bucketed under a bold header per category (matched on `field.category`), each
   * category rendering its own ungrouped fields + sections. Omit for a flat list.
   */
  categories?: string[];
}
