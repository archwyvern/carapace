import { useState } from "react";
import type { ReactNode } from "react";
import { SpinSlider } from "../primitives/SpinSlider";
import { FieldLayout } from "../form/FieldLayout";
import { FormToggle } from "../form/FormToggle";
import { FormString } from "../form/FormString";
import { FormEnum } from "../form/FormEnum";
import { FormColor } from "../form/FormColor";
import { FormVec } from "../form/FormVec";
import type { ArrayField, BoolField, InspectorField, InspectorProps, InspectorSectionInfo, ObjectField } from "./types";

/**
 * Presentational, data-model-agnostic property inspector. Renders a flat list of
 * self-contained {@link InspectorField}s, grouped into collapsible sections. Each field
 * carries its own value + change handler, so the Inspector never threads a resource (or
 * any data model) — the field provider (e.g. `@carapace/resource-inspector`) does the binding.
 */
export function Inspector({ fields, sections = [], categories }: InspectorProps) {
  if (categories && categories.length > 0) {
    return (
      <div className="flex flex-col text-fg">
        {categories.map((cat) => {
          const catFields = fields.filter((f) => (f.category ?? "") === cat);
          if (catFields.length === 0) return null;
          return (
            <div key={cat}>
              <div className="border-y border-border bg-surface px-2 py-1.5">
                <span className="text-sm font-bold text-fg">{cat}</span>
              </div>
              <FieldGroups fields={catFields} sections={sections} />
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex flex-col text-fg">
      <FieldGroups fields={fields} sections={sections} />
    </div>
  );
}

/** The ungrouped fields + collapsible sections for one bucket of fields. */
function FieldGroups({ fields, sections }: { fields: InspectorField[]; sections: InspectorSectionInfo[] }) {
  const ungrouped = fields.filter((f) => !f.group);

  // Section order: declared sections first, then any group names that appear on fields.
  const order: string[] = sections.map((s) => s.name);
  for (const f of fields) if (f.group && !order.includes(f.group)) order.push(f.group);
  const infoByName = new Map(sections.map((s) => [s.name, s]));

  return (
    <>
      {ungrouped.length > 0 && (
        <div className="flex flex-col gap-2 p-2">
          {ungrouped.map((f) => (
            <InspectorRow key={f.key} field={f} />
          ))}
        </div>
      )}
      {order.map((name) => {
        const members = fields.filter((f) => f.group === name);
        if (members.length === 0) return null;
        return <InspectorSection key={name} name={name} info={infoByName.get(name)} fields={members} />;
      })}
    </>
  );
}

function InspectorSection({ name, info, fields }: { name: string; info?: InspectorSectionInfo; fields: InspectorField[] }) {
  const [open, setOpen] = useState(true);
  const gate = info?.enabledBy
    ? (fields.find((f) => f.key === info.enabledBy && f.kind === "bool") as BoolField | undefined)
    : undefined;
  const enabled = gate ? gate.value : true;
  const members = fields.filter((f) => f !== gate);

  return (
    <div className="border-t border-border">
      <div className="flex items-center gap-1 px-2 py-1 select-none">
        <button
          type="button"
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => setOpen(!open)}
          className="flex w-4 shrink-0 items-center justify-center text-fg-mid"
        >
          {open ? "▾" : "▸"}
        </button>
        {gate && (
          <input
            type="checkbox"
            checked={enabled}
            aria-label={`Enable ${name}`}
            onChange={(e) => gate.onChange(e.target.checked)}
            className="accent-accent"
          />
        )}
        <span className="text-sm font-medium uppercase tracking-wide text-fg-mid">{name}</span>
      </div>
      {open && enabled && (
        <div className="flex flex-col gap-2 px-2 pb-2">
          {members.map((f) => (
            <InspectorRow key={f.key} field={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function InspectorRow({ field }: { field: InspectorField }) {
  if (field.hidden) return null;
  const control = renderControl(field);
  const body = field.readOnly ? <div className="pointer-events-none opacity-60">{control}</div> : control;
  return (
    <div className="group/insrow flex items-start gap-1">
      <div className="min-w-0 flex-1">{body}</div>
      <div className="w-4 shrink-0 pt-1 text-center">
        {field.modified && field.onReset && (
          <button
            type="button"
            onClick={field.onReset}
            title="Reset to default"
            aria-label={`Reset ${field.label}`}
            className="hidden text-fg-mid hover:text-fg group-hover/insrow:block"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  );
}

function renderControl(field: InspectorField): ReactNode {
  switch (field.kind) {
    case "number":
      return (
        <FieldLayout label={field.label} layout="inline">
          <SpinSlider
            value={field.value}
            onChange={field.onChange}
            onCommit={field.onCommit}
            min={field.min}
            max={field.max}
            step={field.step}
            integer={field.integer}
            dragScale={field.dragScale}
            shiftScale={field.shiftScale}
            hideSlider={field.min === undefined || field.max === undefined}
          />
        </FieldLayout>
      );
    case "bool":
      return <FormToggle label={field.label} layout="inline" value={field.value} onChange={field.onChange} />;
    case "string":
      return <FormString label={field.label} layout="inline" value={field.value} onChange={field.onChange} onCommit={field.onCommit} />;
    case "enum":
      return <FormEnum label={field.label} layout="inline" value={field.value} options={field.options} onChange={field.onChange} />;
    case "color":
      return <FormColor label={field.label} layout="inline" value={field.value} hasAlpha={field.hasAlpha} onChange={field.onChange} />;
    case "vec":
      return (
        <FormVec
          label={field.label}
          layout={field.size <= 2 ? "inline" : "stacked"}
          value={field.value}
          size={field.size}
          step={field.step}
          min={field.min}
          max={field.max}
          integer={field.integer}
          dragScale={field.dragScale}
          shiftScale={field.shiftScale}
          onChange={field.onChange}
          onCommit={field.onCommit}
        />
      );
    case "object":
      return <ObjectControl field={field} />;
    case "array":
      return <ArrayControl field={field} />;
    case "custom":
      return field.render();
  }
}

const ICON_BTN = "text-fg-mid hover:text-fg text-sm";

function ObjectControl({ field }: { field: ObjectField }) {
  const has = field.fields !== null;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-fg-mid">{field.label}</span>
        <div className="flex items-center gap-1.5 text-sm text-fg-mid">
          {field.icon}
          <span className="truncate">{field.typeName ?? (has ? "" : "(empty)")}</span>
          {field.onCreate && (
            <button type="button" onClick={field.onCreate} className={ICON_BTN}>
              {has ? "Change" : "New"}
            </button>
          )}
          {has && field.onClear && (
            <button type="button" onClick={field.onClear} className={ICON_BTN} aria-label={`Clear ${field.label}`}>
              ✕
            </button>
          )}
        </div>
      </div>
      {field.customRender && <div className="ml-1 border-l border-border pl-2">{field.customRender}</div>}
      {field.fields && field.fields.length > 0 && (
        <div className="ml-1 flex flex-col gap-2 border-l border-border pl-2">
          {field.fields.map((f) => (
            <InspectorRow key={f.key} field={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArrayControl({ field }: { field: ArrayField }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-fg-mid">{field.label}</span>
        {field.onAdd && (
          <button type="button" onClick={field.onAdd} className={ICON_BTN} aria-label={`Add to ${field.label}`}>
            +
          </button>
        )}
      </div>
      <div className="ml-1 flex flex-col gap-2 border-l border-border pl-2">
        {field.items.map((item, i) => (
          <div key={item.key} className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <InspectorRow field={item} />
            </div>
            {field.onRemove && (
              <button
                type="button"
                onClick={() => field.onRemove?.(i)}
                className={ICON_BTN}
                aria-label={`Remove item ${i + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
