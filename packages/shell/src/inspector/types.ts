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
  /**
   * Override the row layout the Inspector picks by kind. The Inspector is a table: `inline`
   * places the control beside the label in the shared control column; `stacked` drops it to a
   * full-width line below the label; `rows` (vec only) splits each component onto its own
   * label|value row, keeping the 50/50 rhythm, with a `link` chain spanning them. By default
   * scalars are `inline`, vec3/4 are `stacked`, and object/array/custom always span full width.
   */
  layout?: "inline" | "stacked" | "rows";
}

export interface NumberField extends InspectorFieldBase {
  kind: "number";
  value: number;
  onChange: (v: number) => void;
  /** Fired on commit (drag-release / Enter / blur). Pair with onChange for undo coalescing. */
  onCommit?: (v: number) => void;
  min?: number;
  max?: number;
  /** Treat min/max as SOFT: the slider bar spans them, but drag/type may go below/above (an
   *  unbounded value with a sane default scrub range — e.g. a slope that can approach vertical). */
  softMin?: boolean;
  softMax?: boolean;
  integer?: boolean;
  /** Increment for spin buttons / arrow keys (defaults to 1, or a value-scaled step). */
  step?: number;
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
  min?: number;
  max?: number;
  /** Soft min/max (see NumberField): the bar spans min..max but drag/type may exceed them. */
  softMin?: boolean;
  softMax?: boolean;
  integer?: boolean;
  /** Discrete arrow/spin/wheel increment for every axis (default 1; Shift = ×10). */
  step?: number;
  /** Per-component text labels, overriding the X/Y/Z axis letters + colours (for non-spatial
   *  groupings like a pipe's radius/radius2). */
  labels?: string[];
  /** Show a chain toggle that locks the components' aspect ratio: editing one scales the others to
   *  preserve their current proportions. */
  link?: boolean;
  /** Initial lock state for `link`. Ephemeral UI state — never persisted. */
  defaultLinked?: boolean;
  onChange: (v: number[]) => void;
  /** Fired on per-axis commit (drag-release / Enter / blur) with the full array. */
  onCommit?: (v: number[]) => void;
}

export interface ObjectField extends InspectorFieldBase {
  kind: "object";
  /**
   * How the object is framed. `resource` (default) = accent sub-inspector box with a type chip and
   * assign/clear, for a nested Resource. `struct` = a quiet StructCard (header + member rows), for
   * a non-resource struct such as an array element — data, not its own object.
   */
  variant?: "resource" | "struct";
  /** Sub-fields of the current value, or null when unset/empty. */
  fields: InspectorField[] | null;
  /** A bespoke editor for this whole sub-resource (e.g. a curve graph), rendered above its fields. */
  customRender?: ReactNode;
  /** Class-hierarchy categories for `fields` (e.g. `["Curve", "Resource"]`, concrete first). In a
   *  sub-inspector these render as group-style folds, not the top-level category bands. */
  categories?: string[];
  /** Collapsible group metadata for `fields` (mirrors the inspector's top-level `sections`). */
  sections?: InspectorSectionInfo[];
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

/** A [-1,1]² XY pad (drag handle, double-click reset, arrow-key nudge) PAIRED with the numeric
 *  X/Y inputs. For direction/tilt-style vec2 params where dragging a dot beats scrubbing two
 *  axes. OPT-IN per field — deliberately not the default vec2 editor (that stays `vec`). The
 *  pad itself always spans ±1; soft min/max let TYPED values exceed it (the handle then renders
 *  clamped to the rim). */
export interface PadField extends InspectorFieldBase {
  kind: "pad";
  /** [x, y]. */
  value: number[];
  min?: number;
  max?: number;
  /** Soft min/max (see NumberField): the numeric bar spans min..max but typing may exceed. */
  softMin?: boolean;
  softMax?: boolean;
  /** Discrete arrow/spin/wheel increment for the numeric inputs (default 1; Shift = ×10). */
  step?: number;
  onChange: (v: number[]) => void;
  /** Fired when a gesture settles (pad drag release / nudge / per-axis commit). */
  onCommit?: (v: number[]) => void;
}

export type InspectorField =
  | NumberField
  | BoolField
  | StringField
  | EnumField
  | ColorField
  | VecField
  | PadField
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
