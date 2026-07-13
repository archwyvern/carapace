import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TypePickerDialog, type TypePickerItem } from "./TypePickerDialog";

const ROOTS: TypePickerItem[] = [
  {
    id: "Resource",
    label: "Resource",
    selectable: false,
    children: [
      {
        id: "Texture",
        label: "Texture",
        selectable: false,
        children: [{ id: "AtlasTexture", label: "AtlasTexture" }],
      },
      { id: "Gradient", label: "Gradient", description: "A colour gradient" },
    ],
  },
];

function setup(overrides: Partial<React.ComponentProps<typeof TypePickerDialog>> = {}) {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    <TypePickerDialog open title="Create New Resource" roots={ROOTS} onPick={onPick} onClose={onClose} {...overrides} />,
  );
  return { onPick, onClose };
}

test("renders nothing when closed", () => {
  setup({ open: false });
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});

test("shows the full expanded tree when open", () => {
  setup();
  const tree = within(screen.getByRole("listbox"));
  expect(tree.getByText("Resource")).toBeInTheDocument();
  expect(tree.getByText("Texture")).toBeInTheDocument();
  expect(tree.getByText("AtlasTexture")).toBeInTheDocument();
  expect(tree.getByText("Gradient")).toBeInTheDocument();
});

test("typing filters to matches and their ancestors", async () => {
  setup();
  await userEvent.type(screen.getByRole("textbox"), "atlas");
  const tree = within(screen.getByRole("listbox"));
  expect(tree.getByText("AtlasTexture")).toBeInTheDocument();
  expect(tree.getByText("Texture")).toBeInTheDocument(); // ancestor kept for context
  expect(tree.queryByText("Gradient")).not.toBeInTheDocument();
});

test("double-clicking a selectable type picks it and closes", async () => {
  const { onPick, onClose } = setup();
  await userEvent.dblClick(screen.getByText("Gradient"));
  expect(onPick).toHaveBeenCalledWith("Gradient");
  expect(onClose).toHaveBeenCalled();
});

test("abstract rows cannot be picked", async () => {
  const { onPick } = setup();
  await userEvent.dblClick(screen.getByText("Texture"));
  expect(onPick).not.toHaveBeenCalled();
});

test("Enter picks the highlighted selectable row (first selectable by default)", async () => {
  const { onPick } = setup();
  await userEvent.type(screen.getByRole("textbox"), "{Enter}");
  expect(onPick).toHaveBeenCalledWith("AtlasTexture");
});

test("the confirm button picks the hovered row", async () => {
  const { onPick } = setup({ confirmLabel: "Pick" });
  await userEvent.hover(screen.getByText("Gradient"));
  await userEvent.click(screen.getByRole("button", { name: "Pick" }));
  expect(onPick).toHaveBeenCalledWith("Gradient");
});
