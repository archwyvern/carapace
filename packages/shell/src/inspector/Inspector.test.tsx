import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inspector } from "./Inspector";
import type { InspectorField } from "./types";

test("dispatches kinds to controls and fires their change handlers", async () => {
  const onBool = vi.fn();
  const onString = vi.fn();
  const fields: InspectorField[] = [
    { kind: "bool", key: "v", label: "Visible", value: false, onChange: onBool },
    { kind: "string", key: "n", label: "Name", value: "", onChange: onString },
    { kind: "enum", key: "m", label: "Mode", value: 0, options: ["A", "B"], onChange: vi.fn() },
  ];
  render(<Inspector fields={fields} />);

  expect(screen.getByRole("combobox", { name: "Mode" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("switch", { name: "Visible" }));
  expect(onBool).toHaveBeenCalledWith(true);
  await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "x");
  expect(onString).toHaveBeenCalledWith("x");
});

test("groups fields into collapsible sections and hides body when collapsed", async () => {
  const fields: InspectorField[] = [
    { kind: "string", key: "a", label: "Top", value: "", onChange: vi.fn() },
    { kind: "string", key: "b", label: "Inner", value: "", onChange: vi.fn(), group: "Advanced" },
  ];
  render(<Inspector fields={fields} sections={[{ name: "Advanced" }]} />);
  expect(screen.getByRole("textbox", { name: "Inner" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Collapse" }));
  expect(screen.queryByRole("textbox", { name: "Inner" })).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Top" })).toBeInTheDocument(); // ungrouped stays
});

test("enabledBy gate hides members until the bool is on", async () => {
  const onGate = vi.fn();
  const fields: InspectorField[] = [
    { kind: "bool", key: "en", label: "Enabled", value: false, onChange: onGate, group: "Warp" },
    { kind: "string", key: "amt", label: "Amount", value: "", onChange: vi.fn(), group: "Warp" },
  ];
  const { rerender } = render(<Inspector fields={fields} sections={[{ name: "Warp", enabledBy: "en" }]} />);
  // gate off → member hidden, but the gate checkbox shows in the header
  expect(screen.queryByRole("textbox", { name: "Amount" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("checkbox", { name: "Enable Warp" }));
  expect(onGate).toHaveBeenCalledWith(true);
  // simulate the provider flipping the value
  fields[0] = { ...fields[0], value: true } as InspectorField;
  rerender(<Inspector fields={[...fields]} sections={[{ name: "Warp", enabledBy: "en" }]} />);
  expect(screen.getByRole("textbox", { name: "Amount" })).toBeInTheDocument();
});

test("respects hidden, and shows a reset only when modified", async () => {
  const onReset = vi.fn();
  const fields: InspectorField[] = [
    { kind: "string", key: "h", label: "Secret", value: "", onChange: vi.fn(), hidden: true },
    { kind: "string", key: "m", label: "Tweaked", value: "x", onChange: vi.fn(), modified: true, onReset },
    { kind: "string", key: "d", label: "Default", value: "", onChange: vi.fn() },
  ];
  render(<Inspector fields={fields} />);
  expect(screen.queryByRole("textbox", { name: "Secret" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reset Tweaked" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Reset Default" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Reset Tweaked" }));
  expect(onReset).toHaveBeenCalled();
});

test("object field renders nested sub-fields and create/clear", async () => {
  const onClear = vi.fn();
  const fields: InspectorField[] = [
    {
      kind: "object",
      key: "noise",
      label: "Noise",
      typeName: "FastNoiseLite",
      onClear,
      fields: [{ kind: "string", key: "seed", label: "Seed", value: "42", onChange: vi.fn() }],
    },
  ];
  render(<Inspector fields={fields} />);
  expect(screen.getByText("FastNoiseLite")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Seed" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Clear Noise" }));
  expect(onClear).toHaveBeenCalled();
});

test("array field renders items with add/remove", async () => {
  const onAdd = vi.fn();
  const onRemove = vi.fn();
  const fields: InspectorField[] = [
    {
      kind: "array",
      key: "pts",
      label: "Points",
      onAdd,
      onRemove,
      items: [
        { kind: "string", key: "p0", label: "0", value: "a", onChange: vi.fn() },
        { kind: "string", key: "p1", label: "1", value: "b", onChange: vi.fn() },
      ],
    },
  ];
  render(<Inspector fields={fields} />);
  await userEvent.click(screen.getByRole("button", { name: "Add to Points" }));
  expect(onAdd).toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Remove item 2" }));
  expect(onRemove).toHaveBeenCalledWith(1);
});

test("custom field renders its node", () => {
  const fields: InspectorField[] = [
    { kind: "custom", key: "c", label: "Curve", render: () => <div>CUSTOM-WIDGET</div> },
  ];
  render(<Inspector fields={fields} />);
  expect(screen.getByText("CUSTOM-WIDGET")).toBeInTheDocument();
});
