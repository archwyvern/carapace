import { Fragment, useState } from "react";
import { ucwords } from "../text";
import type { ReactNode } from "react";
import { SpinSlider } from "../primitives/SpinSlider";
import { FormToggle } from "../form/FormToggle";
import { FormString } from "../form/FormString";
import { FormEnum } from "../form/FormEnum";
import { FormColor } from "../form/FormColor";
import { FormVec } from "../form/FormVec";
import { PadInput } from "../form/PadInput";
import { ratioLocked, setAxis } from "../form/ratioLock";
import { AddIcon, ChevronRightIcon, CloseIcon, DeleteIcon, LinkIcon, ResetIcon, UnlinkIcon } from "../icons";
import { StructCard } from "../primitives/StructCard";
import { useNestedSurface, SurfaceProvider } from "../primitives/Surface";
import type { ArrayField, BoolField, InspectorField, InspectorProps, InspectorSectionInfo, ObjectField, VecField } from "./types";

/**
 * Presentational, data-model-agnostic property inspector. The inspector is a TABLE: each group
 * of fields is a CSS grid with three shared columns — `label | control | actions` — and every
 * row is a subgrid, so labels and controls line up across the whole group. How a given item
 * occupies the row is the ITEM's choice (via {@link fieldMode}): scalars sit `inline`, vec3/4
 * `stack` their control on a full-width line below the label, and sub-resources / arrays /
 * custom widgets `span` all columns and bring their own internal layout (a nested table, for
 * sub-resources). Each {@link InspectorField} carries its own value + change handler, so the
 * Inspector never threads a resource — the field provider (e.g. `@carapace/resource-inspector`) does.
 *
 * Visual language mirrors Godot's inspector: filled, centred class CATEGORY bands; chevron
 * SECTIONS with a collapsed-state change count; and sub-resources framed as accent-bordered
 * SUB-INSPECTORS so it's obvious you've stepped into another object.
 */
export function Inspector({ fields, sections = [], categories }: InspectorProps) {
  return (
    <div className="flex flex-col text-fg">
      <CategorizedFields fields={fields} sections={sections} categories={categories} categoryStyle="band" />
    </div>
  );
}

/**
 * Buckets fields by class-hierarchy category in the given order, then by section, then plain rows.
 * The category header is a filled `band` at the top level, or a collapsible group `fold` inside a
 * sub-inspector — so a sub-resource's categories read as groups while keeping inheritance order.
 * With no categories it falls back to a flat section/row list.
 */
function CategorizedFields({
  fields,
  sections,
  categories,
  categoryStyle,
}: {
  fields: InspectorField[];
  sections: InspectorSectionInfo[];
  categories?: string[];
  categoryStyle: "band" | "fold";
}) {
  if (!categories || categories.length === 0) {
    return <FieldGroups fields={fields} sections={sections} />;
  }
  return (
    <>
      {categories.map((cat) => {
        const catFields = fields.filter((f) => (f.category ?? "") === cat);
        if (catFields.length === 0) return null;
        if (categoryStyle === "fold") {
          return <CategoryFold key={cat} name={cat} fields={catFields} sections={sections} />;
        }
        return (
          <div key={cat}>
            <CategoryBand name={cat} />
            <FieldGroups fields={catFields} sections={sections} />
          </div>
        );
      })}
    </>
  );
}

/** A category rendered as a collapsible group (for sub-inspectors): chevron header over the
 *  category's sections + fields. */
function CategoryFold({ name, fields, sections }: { name: string; fields: InspectorField[]; sections: InspectorSectionInfo[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-border first:border-t-0">
      <div className="flex items-center gap-1.5 px-2 py-1.5 select-none hover:bg-surface cursor-pointer" onClick={() => setOpen(!open)}>
        <Chevron open={open} />
        <span className="flex-1 text-base font-semibold text-fg">{ucwords(name)}</span>
      </div>
      {open && <FieldGroups fields={fields} sections={sections} />}
    </div>
  );
}

/** The shared 3-column table grid (`label | control | actions`). Field rows are subgrids of this,
 *  so they align across the whole group. Exported so bespoke editors can drop into the same table. */
const GRID_COLS = "grid grid-cols-2 items-start gap-x-2 gap-y-2";

export function FieldGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${GRID_COLS} ${className}`}>{children}</div>;
}

/** Filled, centred class-name band (e.g. "Sprite2D", "Node2D") — a class-hierarchy divider. */
function CategoryBand({ name }: { name: string }) {
  return (
    <div className="border-y border-border bg-surface-raised px-2 py-1.5 text-center">
      <span className="text-base font-bold text-fg">{ucwords(name)}</span>
    </div>
  );
}

/** A fold chevron — points right when closed, rotates down when open. */
function Chevron({ open }: { open: boolean }) {
  return <ChevronRightIcon aria-hidden className={`h-3.5 w-3.5 shrink-0 text-fg-mid transition-transform ${open ? "rotate-90" : ""}`} />;
}

/** One node of the section TREE. Group names are PATHS ("Layout/Anchor Points") — the
 *  inspector is a tree, so subgroups nest inside their parent fold, Godot-style. */
interface SectionNode {
  path: string;
  label: string;
  info?: InspectorSectionInfo;
  fields: InspectorField[];
  children: SectionNode[];
}

function buildSectionTree(
  fields: InspectorField[],
  sections: InspectorSectionInfo[],
): { ungrouped: InspectorField[]; roots: SectionNode[] } {
  const ungrouped = fields.filter((f) => !f.group);

  // Section order: declared sections first, then any group paths that appear on fields.
  const order: string[] = sections.map((s) => s.name);
  for (const f of fields) if (f.group && !order.includes(f.group)) order.push(f.group);
  const infoByName = new Map(sections.map((s) => [s.name, s]));

  const nodes = new Map<string, SectionNode>();
  const roots: SectionNode[] = [];
  const ensure = (path: string): SectionNode => {
    const existing = nodes.get(path);
    if (existing) return existing;
    const parts = path.split("/");
    const node: SectionNode = {
      path,
      label: parts[parts.length - 1] ?? path,
      info: infoByName.get(path),
      fields: [],
      children: [],
    };
    nodes.set(path, node);
    if (parts.length > 1) ensure(parts.slice(0, -1).join("/")).children.push(node);
    else roots.push(node);
    return node;
  };
  for (const path of order) ensure(path);
  for (const f of fields) if (f.group) ensure(f.group).fields.push(f);
  return { ungrouped, roots };
}

/** A section (or any ancestor with a visible descendant) is worth rendering. */
function sectionVisible(node: SectionNode): boolean {
  return node.fields.some((f) => !f.hidden) || node.children.some(sectionVisible);
}

function sectionChanges(node: SectionNode): number {
  return (
    node.fields.filter((f) => f.modified && !f.hidden).length +
    node.children.reduce((n, c) => n + sectionChanges(c), 0)
  );
}

/** The ungrouped fields + the collapsible section tree for one bucket of fields. */
function FieldGroups({ fields, sections }: { fields: InspectorField[]; sections: InspectorSectionInfo[] }) {
  const { ungrouped, roots } = buildSectionTree(fields, sections);
  return (
    <>
      {ungrouped.length > 0 && (
        <FieldGrid className="p-2">
          {ungrouped.map((f) => (
            <InspectorRow key={f.key} field={f} />
          ))}
        </FieldGrid>
      )}
      {roots.filter(sectionVisible).map((node) => (
        <InspectorSection key={node.path} node={node} depth={0} />
      ))}
    </>
  );
}

function InspectorSection({ node, depth }: { node: SectionNode; depth: number }) {
  const [open, setOpen] = useState(true);
  const gate = node.info?.enabledBy
    ? (node.fields.find((f) => f.key === node.info!.enabledBy && f.kind === "bool") as BoolField | undefined)
    : undefined;
  const enabled = gate ? gate.value : true;
  const members = node.fields.filter((f) => f !== gate);
  const changes = sectionChanges(node);
  const indent = depth * 12;

  return (
    <div className={depth === 0 ? "border-t border-border" : ""}>
      <div
        className="group/sec flex items-center gap-1.5 px-2 py-1.5 select-none hover:bg-surface"
        style={indent ? { paddingLeft: 8 + indent } : undefined}
      >
        <button type="button" aria-label={open ? "Collapse" : "Expand"} onClick={() => setOpen(!open)} className="flex items-center">
          <Chevron open={open} />
        </button>
        {gate && (
          <input
            type="checkbox"
            checked={enabled}
            aria-label={`Enable ${node.label}`}
            onChange={(e) => gate.onChange(e.target.checked)}
            className="accent-accent"
          />
        )}
        <span className="flex-1 cursor-pointer text-base font-semibold text-fg" onClick={() => setOpen(!open)}>
          {ucwords(node.label)}
        </span>
        {!open && changes > 0 && (
          <span className="text-base text-fg-mid">
            ({changes} change{changes > 1 ? "s" : ""})
          </span>
        )}
      </div>
      {open && enabled && (
        <>
          {members.some((f) => !f.hidden) && (
            <div style={indent ? { paddingLeft: indent } : undefined}>
              <FieldGrid className="px-2 pb-2 pt-1">
                {members.map((f) => (
                  <InspectorRow key={f.key} field={f} />
                ))}
              </FieldGrid>
            </div>
          )}
          {node.children.filter(sectionVisible).map((child) => (
            <InspectorSection key={child.path} node={child} depth={depth + 1} />
          ))}
        </>
      )}
    </div>
  );
}

/** How an item occupies its table row. Object/array/custom always span; otherwise the item's
 *  own `layout` hint wins, else scalars are inline and vec3/4 stack. */
function fieldMode(field: InspectorField): "inline" | "stacked" | "span" | "rows" {
  if (field.kind === "object" || field.kind === "array" || field.kind === "custom") return "span";
  if (field.layout) return field.layout;
  if (field.kind === "vec" && field.size >= 3) return "stacked";
  // a pad is a 64px box + two numeric axes — the inline value column truncates the numbers,
  // so take the full row width by default (a field can still force inline via `layout`)
  if (field.kind === "pad") return "stacked";
  return "inline";
}

/** A linked vec rendered as aligned `label | value` rows (rather than one stacked control), with the
 *  chain toggle spanning them on the right. Keeps the inspector's 50/50 label/control rhythm for
 *  grouped scalars like a pipe's radius/radius2. */
function VecRows({ field }: { field: VecField }) {
  const [linked, setLinked] = useState(field.defaultLinked ?? false);
  const labels = field.labels ?? ["X", "Y", "Z", "W"];
  const apply = (i: number, v: number): number[] =>
    field.link && linked ? ratioLocked(field.value, i, v) : setAxis(field.value, i, v);
  return (
    // subgrid so label + value line up exactly with the inspector's other rows; the chain is absolute
    // in a thin right gutter (reserved via pr on the value cell) so it doesn't steal a column.
    <div className="relative col-span-full grid grid-cols-subgrid items-center gap-y-2">
      {field.value.map((val, i) => (
        <Fragment key={i}>
          <span className="flex min-h-[22px] items-center truncate text-base text-fg-mid">{ucwords(labels[i]!)}</span>
          <div className={`min-w-0 ${field.link ? "pr-3.5" : ""}`}>
            <SpinSlider
              value={val}
              onChange={(v) => field.onChange(apply(i, v))}
              onCommit={field.onCommit ? (v) => field.onCommit!(apply(i, v)) : undefined}
              min={field.min}
              max={field.max}
              orLess={field.softMin}
              orGreater={field.softMax}
              integer={field.integer}
              step={field.step}
              spinButtons
              hideSlider={field.min === undefined || field.max === undefined}
            />
          </div>
        </Fragment>
      ))}
      {field.link && (
        <button
          type="button"
          onClick={() => setLinked((v) => !v)}
          aria-pressed={linked}
          aria-label={linked ? "Unlock aspect ratio" : "Lock aspect ratio"}
          title={linked ? "Aspect ratio locked — click to unlink" : "Lock aspect ratio"}
          className={`absolute bottom-0 right-0 top-0 flex w-3.5 flex-col items-center justify-center gap-0.5 py-1 hover:text-fg ${linked ? "text-accent" : "text-fg-mid"}`}
        >
          {/* a centered vertical connector — line · icon · line — so the glyph sits on its axis */}
          <span className="pointer-events-none w-px flex-1 bg-current opacity-70" />
          {linked ? <LinkIcon className="h-3 w-3 shrink-0" /> : <UnlinkIcon className="h-3 w-3 shrink-0" />}
          <span className="pointer-events-none w-px flex-1 bg-current opacity-70" />
        </button>
      )}
    </div>
  );
}

function wrapReadOnly(field: InspectorField, node: ReactNode): ReactNode {
  return field.readOnly ? <div className="pointer-events-none opacity-60">{node}</div> : node;
}

function resetButton(field: InspectorField): ReactNode {
  if (!field.modified || !field.onReset) return null;
  return (
    <button
      type="button"
      onClick={field.onReset}
      title="Reset to default"
      aria-label={`Reset ${field.label}`}
      className="text-fg-mid opacity-0 transition-opacity hover:text-fg group-hover/row:opacity-100"
    >
      <ResetIcon className="h-3.5 w-3.5" />
    </button>
  );
}

/** One field as a table row. `action` overrides the right-hand actions cell (arrays pass a
 *  remove button); otherwise it holds the reset affordance when the field is modified. */
function InspectorRow({ field, action }: { field: InspectorField; action?: ReactNode }) {
  if (field.hidden) return null;
  const mode = fieldMode(field);

  if (mode === "span") {
    return <div className="col-span-full">{wrapReadOnly(field, renderControl(field, action))}</div>;
  }

  if (mode === "rows" && field.kind === "vec") {
    return wrapReadOnly(field, <VecRows field={field} />);
  }

  const actions = action ?? resetButton(field);
  const control = wrapReadOnly(field, renderBareControl(field));

  if (mode === "stacked") {
    return (
      <div className="group/row col-span-full flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-base text-fg-mid">{ucwords(field.label)}</span>
          {actions && <span className="flex w-4 shrink-0 justify-center">{actions}</span>}
        </div>
        {control}
      </div>
    );
  }

  // A vec2 stacks its inputs (and a pad is a box), so the control is multiple rows tall —
  // top-align the row and centre the label/actions within the first input's height.
  const tall = field.kind === "vec" || field.kind === "pad";
  return (
    <div className={`group/row col-span-full grid grid-cols-subgrid ${tall ? "items-start" : "items-center"}`}>
      <span className={`truncate text-base text-fg-mid ${tall ? "flex min-h-[22px] items-center" : ""}`}>{ucwords(field.label)}</span>
      <div className={`flex min-w-0 gap-1 ${tall ? "items-start" : "items-center"}`}>
        <div className="min-w-0 flex-1">{control}</div>
        {actions && <span className={`flex shrink-0 justify-center ${tall ? "min-h-[22px] items-center" : ""}`}>{actions}</span>}
      </div>
    </div>
  );
}

/** The bare control (no label) for an inline/stacked field — the table row owns the label. */
function renderBareControl(field: InspectorField): ReactNode {
  switch (field.kind) {
    case "number":
      return (
        <SpinSlider
          value={field.value}
          onChange={field.onChange}
          onCommit={field.onCommit}
          min={field.min}
          max={field.max}
          orLess={field.softMin}
          orGreater={field.softMax}
          integer={field.integer}
          step={field.step}
          spinButtons
          hideSlider={field.min === undefined || field.max === undefined}
        />
      );
    case "bool":
      return <FormToggle ariaLabel={field.label} value={field.value} onChange={field.onChange} />;
    case "string":
      return <FormString ariaLabel={field.label} value={field.value} onChange={field.onChange} onCommit={field.onCommit} />;
    case "enum":
      return <FormEnum ariaLabel={field.label} value={field.value} options={field.options} onChange={field.onChange} />;
    case "color":
      return <FormColor ariaLabel={field.label} value={field.value} hasAlpha={field.hasAlpha} onChange={field.onChange} />;
    case "vec":
      return (
        <FormVec
          value={field.value}
          size={field.size}
          min={field.min}
          max={field.max}
          softMin={field.softMin}
          softMax={field.softMax}
          integer={field.integer}
          step={field.step}
          labels={field.labels}
          link={field.link}
          defaultLinked={field.defaultLinked}
          onChange={field.onChange}
          onCommit={field.onCommit}
        />
      );
    case "pad":
      // the pad drives both axes at once; the numeric column keeps typed precision (and, with
      // soft bounds, values past ±1 — the pad handle then clamps to the rim)
      return (
        <div className="flex items-start gap-1.5">
          <PadInput
            value={[field.value[0] ?? 0, field.value[1] ?? 0]}
            onChange={field.onChange}
            onCommit={field.onCommit}
            ariaLabel={field.label}
          />
          <div className="min-w-0 flex-1">
            <FormVec
              value={field.value}
              size={2}
              min={field.min}
              max={field.max}
              softMin={field.softMin}
              softMax={field.softMax}
              step={field.step}
              onChange={field.onChange}
              onCommit={field.onCommit}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
}

/** Span-mode controls (object / array / custom), which render their own structure. `action` is the
 *  right-hand affordance an array passes for an element (e.g. its delete button). */
function renderControl(field: InspectorField, action?: ReactNode): ReactNode {
  switch (field.kind) {
    case "object":
      return field.variant === "struct" ? <StructControl field={field} action={action} /> : <ObjectControl field={field} action={action} />;
    case "array":
      return <ArrayControl field={field} />;
    case "custom":
      return field.render();
    default:
      return renderBareControl(field);
  }
}

const ICON_BTN = "text-fg-mid hover:text-fg text-base leading-none";

/**
 * A sub-resource field, framed as a SUB-INSPECTOR: an accent header bar (label + type +
 * assign/clear) attached to an accent-bordered, accent-tinted body that is its OWN field table.
 * The framing makes it unmistakable that the nested fields belong to another object you're
 * editing in place — the carapace take on Godot's `sub_inspector_bg`.
 */
function ObjectControl({ field, action }: { field: ObjectField; action?: ReactNode }) {
  const [open, setOpen] = useState(true);
  const { bg, depth } = useNestedSurface();
  const has = field.fields !== null;
  const hasBody = open && (field.customRender != null || (field.fields != null && field.fields.length > 0));

  return (
    <div className={`overflow-hidden rounded-control border border-border ${bg} shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)]`}>
      <div className="flex items-center gap-1.5 border-b border-border bg-gradient-to-b from-accent/20 to-transparent px-2 py-1">
        <button type="button" aria-label={open ? "Collapse" : "Expand"} onClick={() => setOpen(!open)} className="flex items-center">
          <Chevron open={open} />
        </button>
        <span className="flex-1 truncate text-base font-semibold text-fg-mid">{ucwords(field.label)}</span>
        <div className="flex items-center gap-1.5 text-fg-mid">
          {field.icon}
          {field.typeName ? (
            <span className="truncate rounded border border-accent/40 bg-accent/10 px-1.5 py-px font-mono text-2xs text-accent">{field.typeName}</span>
          ) : (
            !has && <span className="text-base">(empty)</span>
          )}
          {field.onCreate && (
            <button type="button" onClick={field.onCreate} className={ICON_BTN}>
              {has ? "Change" : "New"}
            </button>
          )}
          {has && field.onClear && (
            <button type="button" onClick={field.onClear} className={ICON_BTN} aria-label={`Clear ${field.label}`}>
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          )}
          {action}
        </div>
      </div>
      {hasBody && (
        <SurfaceProvider depth={depth}>
          {field.customRender}
          {field.fields && (
            <CategorizedFields
              fields={field.fields}
              sections={field.sections ?? []}
              categories={field.categories}
              categoryStyle="fold"
            />
          )}
        </SurfaceProvider>
      )}
    </div>
  );
}

/**
 * A non-resource struct in an array (a CurvePoint, a keyframe, a tuple) — a quiet {@link StructCard}
 * with its member rows, NOT the accent sub-inspector framing reserved for nested Resources. `action`
 * (the array's delete) sits in the header.
 */
function StructControl({ field, action }: { field: ObjectField; action?: ReactNode }) {
  return (
    <StructCard title={field.label} trailing={action}>
      {field.customRender && <div className="p-2">{field.customRender}</div>}
      {field.fields != null && field.fields.length > 0 && (
        <FieldGrid className="p-2">
          {field.fields.map((f) => (
            <InspectorRow key={f.key} field={f} />
          ))}
        </FieldGrid>
      )}
    </StructCard>
  );
}

/** An array field — a plain (non-accent) bordered container, so it reads as a list, not a
 *  sub-object. Each item is a row in its own field table (struct elements render as a card), with a
 *  remove button — in the struct card's header, else in the actions column. */
function ArrayControl({ field }: { field: ArrayField }) {
  const { bg, depth } = useNestedSurface();
  return (
    <div className={`overflow-hidden rounded-control border border-border ${bg}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-raised px-2 py-1">
        <span className="text-base font-medium text-fg-mid">{field.label}</span>
        <div className="flex items-center gap-1.5 text-fg-mid">
          <span className="text-base">{field.items.length}</span>
          {field.onAdd && (
            <button type="button" onClick={field.onAdd} className={ICON_BTN} aria-label={`Add to ${field.label}`}>
              <AddIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {field.items.length > 0 && (
        <SurfaceProvider depth={depth}>
          <FieldGrid className="p-2">
          {field.items.map((item, i) => {
            const isStruct = item.kind === "object" && item.variant === "struct";
            const remove = field.onRemove && (
              <button
                type="button"
                onClick={() => field.onRemove?.(i)}
                className={ICON_BTN}
                aria-label={`Remove item ${i + 1}`}
              >
                {isStruct ? <DeleteIcon className="h-3.5 w-3.5" /> : <CloseIcon className="h-3.5 w-3.5" />}
              </button>
            );
            return <InspectorRow key={item.key} field={item} action={remove} />;
          })}
          </FieldGrid>
        </SurfaceProvider>
      )}
    </div>
  );
}
