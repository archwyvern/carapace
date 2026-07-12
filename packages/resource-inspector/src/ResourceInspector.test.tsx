import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResourceInspector } from "./ResourceInspector";
import { resourceToFields } from "./adapter";
import type { PropertyDescriptor, PropertyKind, PropertySource, TupleMemberDesc } from "./protocol";

/**
 * Protocol-only fixtures: the inspector must work against ANY object satisfying
 * PropertySource — no @carapace/resources, no concrete classes. This harness builds
 * live sources over local slots with working observables, revert, and change bubbling.
 */
interface FieldSpec {
  name: string;
  kind: PropertyKind;
  value: unknown;
  enumOptions?: string[];
  ctorName?: string;
  fromArray?: (nums: number[]) => unknown;
  tupleMembers?: TupleMemberDesc[];
  baseType?: string;
  view?: string;
}

function fakeSource(
  typeName: string,
  specs: FieldSpec[],
  extra: {
    groups?: { name: string; fields: string[]; enabledBy?: string }[];
    visibility?: (get: (name: string) => unknown) => Record<string, boolean>;
  } = {},
): PropertySource {
  const changed = new Set<() => void>();
  const notify = () => { for (const fn of changed) fn(); };

  const fields: PropertyDescriptor[] = specs.map((spec, i) => {
    let current = spec.value;
    const defaultValue = spec.value;
    const subs = new Set<(v: unknown, p: unknown) => void>();
    return {
      name: spec.name,
      kind: spec.kind,
      observable: {
        get: () => current,
        subscribe: (fn: (v: unknown, p: unknown) => void) => {
          subs.add(fn);
          return { unsubscribe: () => subs.delete(fn) };
        },
      },
      setValue: (v: unknown) => {
        const prev = current;
        current = v;
        for (const fn of subs) fn(v, prev);
        notify();
      },
      isModified: () => current !== defaultValue,
      reset: () => { current = defaultValue; notify(); },
      ...(spec.fromArray ? { fromArray: spec.fromArray } : {}),
      ...(spec.enumOptions ? { enumOptions: spec.enumOptions } : {}),
      ...(spec.ctorName ? { ctorName: spec.ctorName } : {}),
      ...(spec.tupleMembers ? { tupleMembers: spec.tupleMembers } : {}),
      ...(spec.baseType ? { baseType: spec.baseType } : {}),
      ...(spec.view ? { view: spec.view } : {}),
      order: i,
    };
  });

  const get = (name: string) => fields.find(f => f.name === name)?.observable.get();
  return {
    typeName,
    baseFieldCount: 0,
    sourcePath: null,
    fields: () => fields,
    findField: (name: string) => fields.find(f => f.name.toLowerCase() === name.toLowerCase()),
    groups: () => extra.groups ?? [],
    visibility: () => extra.visibility?.(get) ?? {},
    onChanged: (fn: () => void) => {
      changed.add(fn);
      return { unsubscribe: () => changed.delete(fn) };
    },
  };
}

/** number[]-backed fake vec/color value, standing in for ColorF/Vector2 without importing them. */
function arrayValue(nums: number[]): { toArray(): number[] } {
  return { toArray: () => [...nums] };
}

test("a tuple array maps to a struct-variant array (light card, not a sub-resource)", () => {
  const source = fakeSource("Demo", [{
    name: "Pairs",
    kind: "array-ctor",
    ctorName: "Pair",
    value: [[1, 0], [3, 1]],
    tupleMembers: [{ name: "Amount", kind: "number" }, { name: "Kind", kind: "enum", options: ["Add", "Mul"] }],
  }]);
  const arr = resourceToFields(source).find(f => f.key === "Pairs");
  expect(arr?.kind).toBe("array");
  if (arr?.kind !== "array") throw new Error("expected array field");
  expect(arr.items).toHaveLength(2);
  const item = arr.items[0];
  expect(item?.kind).toBe("object");
  if (item?.kind !== "object") throw new Error("expected object item");
  expect(item.variant).toBe("struct");
  expect(item.typeName).toBeUndefined();
  expect(item.fields?.map(f => `${f.label}:${f.kind}`)).toEqual(["Amount:number", "Kind:enum"]);
  const item1 = arr.items[1];
  if (item1?.kind !== "object") throw new Error("expected object item");
  const kind = item1.fields?.[1];
  expect(kind?.kind === "enum" && kind.options).toEqual(["Add", "Mul"]);
  expect(kind?.kind === "enum" && kind.value).toBe(1);
});

test("an array-struct field renders struct cards with color columns via member fromArray", () => {
  const written: number[][] = [];
  const source = fakeSource("Gradient", [{
    name: "Points",
    kind: "array-struct",
    ctorName: "GradientPoint",
    value: [
      { Offset: 0, Color: arrayValue([0, 0, 0, 1]) },
      { Offset: 1, Color: arrayValue([1, 1, 1, 1]) },
    ],
    tupleMembers: [
      { name: "Offset", kind: "number" },
      { name: "Color", kind: "color", fromArray: (nums) => { written.push(nums); return arrayValue(nums); } },
    ],
  }]);
  const arr = resourceToFields(source).find(f => f.key === "Points");
  if (arr?.kind !== "array") throw new Error("expected array field");
  expect(arr.items).toHaveLength(2);
  const item = arr.items[0];
  if (item?.kind !== "object") throw new Error("expected object item");
  expect(item.variant).toBe("struct");
  const color = item.fields?.[1];
  expect(color?.kind).toBe("color");
  if (color?.kind !== "color") throw new Error("expected color column");
  expect(color.value).toEqual([0, 0, 0, 1]);
  color.onChange([1, 0, 0, 1]);
  expect(written).toEqual([[1, 0, 0, 1]]);
});

function demoSource() {
  return fakeSource("GradientTexture2D", [
    { name: "Fill", kind: "enum", value: "Linear", enumOptions: ["Linear", "Radial", "Square"] },
    { name: "FillFrom", kind: "ctor", ctorName: "Vector2", value: arrayValue([0, 0]), fromArray: arrayValue },
    { name: "UseHDR", kind: "bool", value: false },
  ]);
}

test("renders a source's fields with humanized labels and the right controls", () => {
  render(<ResourceInspector source={demoSource()} />);
  expect(screen.getByRole("combobox", { name: "Fill" })).toBeInTheDocument();
  expect(screen.getByText("Fill From")).toBeInTheDocument();
  expect(screen.getByRole("switch", { name: "Use HDR" })).toBeInTheDocument();
});

test("toggling a bool field writes through to the source and re-renders from it", async () => {
  const source = demoSource();
  render(<ResourceInspector source={source} />);
  expect(source.findField("UseHDR")!.observable.get()).toBe(false);
  await userEvent.click(screen.getByRole("switch", { name: "Use HDR" }));
  expect(source.findField("UseHDR")!.observable.get()).toBe(true);
  expect(screen.getByRole("switch", { name: "Use HDR" })).toHaveAttribute("aria-checked", "true");
});

test("an enum field writes the option name (not the index) back to the source", async () => {
  const source = demoSource();
  render(<ResourceInspector source={source} />);
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Fill" }), "Radial");
  expect(source.findField("Fill")!.observable.get()).toBe("Radial");
});

test("a resource field recurses into a nested object inspector", () => {
  const nested = fakeSource("Gradient", [
    { name: "InterpolationMode", kind: "enum", value: "Linear", enumOptions: ["Linear", "Constant", "Cubic"] },
  ]);
  const source = fakeSource("GradientTexture2D", [
    { name: "Gradient", kind: "resource", value: nested, baseType: "Gradient" },
  ]);
  render(<ResourceInspector source={source} />);
  expect(screen.getByRole("combobox", { name: "Interpolation Mode" })).toBeInTheDocument();
});

test("honors group sections and conditional visibility from the source", async () => {
  const source = fakeSource(
    "FastNoiseLite",
    [
      { name: "NoiseType", kind: "enum", value: "Simplex", enumOptions: ["Simplex", "Cellular"] },
      { name: "CellularJitter", kind: "float", value: 1 },
      { name: "FractalGain", kind: "float", value: 0.5 },
    ],
    {
      groups: [{ name: "Fractal", fields: ["FractalGain"] }],
      visibility: (get) => ({ CellularJitter: get("NoiseType") === "Cellular" }),
    },
  );
  render(<ResourceInspector source={source} />);
  expect(screen.getByText("Fractal")).toBeInTheDocument();
  expect(screen.queryByText("Cellular Jitter")).not.toBeInTheDocument();
  source.findField("NoiseType")!.setValue("Cellular");
  expect(await screen.findByText("Cellular Jitter")).toBeInTheDocument();
});

test("modified state and reset flow through the descriptor revert pair", () => {
  const source = demoSource();
  const field = source.findField("Fill")!;
  field.setValue("Square");
  const mapped = resourceToFields(source).find(f => f.key === "Fill")!;
  expect(mapped.modified).toBe(true);
  mapped.onReset!();
  expect(field.observable.get()).toBe("Linear");
});
