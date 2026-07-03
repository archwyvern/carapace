import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorTabs } from "./EditorTabs";
import type { EditorTab } from "./EditorTabs";

const tabs: EditorTab[] = [
  { id: "a", title: "main.tsx", dirty: true },
  { id: "b", title: "app.css" },
];

test("renders a tab per entry; the active tab is selected", () => {
  render(<EditorTabs tabs={tabs} activeId="a" onSelect={() => {}} />);
  expect(screen.getByRole("tab", { name: /main\.tsx/ })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: /app\.css/ })).toHaveAttribute("aria-selected", "false");
});

test("clicking a tab selects it", async () => {
  const onSelect = vi.fn();
  render(<EditorTabs tabs={tabs} activeId="a" onSelect={onSelect} />);
  await userEvent.click(screen.getByRole("tab", { name: /app\.css/ }));
  expect(onSelect).toHaveBeenCalledWith("b");
});

test("clicking the close button calls onClose", async () => {
  const onClose = vi.fn();
  render(<EditorTabs tabs={tabs} activeId="a" onSelect={() => {}} onClose={onClose} />);
  await userEvent.click(screen.getByRole("button", { name: "Close app.css" }));
  expect(onClose).toHaveBeenCalledWith("b");
});

test("a dirty tab shows a dot", () => {
  render(<EditorTabs tabs={tabs} activeId="a" onSelect={() => {}} />);
  expect(screen.getByText("●")).toBeInTheDocument();
});

test("drag-reorder reports the dragged id and the insertion slot", () => {
  const onReorder = vi.fn();
  render(<EditorTabs tabs={tabs} activeId="a" onSelect={() => {}} onReorder={onReorder} />);
  const a = screen.getByRole("tab", { name: /main\.tsx/ });
  const b = screen.getByRole("tab", { name: /app\.css/ });
  expect(a).toHaveAttribute("draggable", "true");
  const dataTransfer = { effectAllowed: "", dropEffect: "", setData: vi.fn(), getData: () => "a" };
  fireEvent.dragStart(a, { dataTransfer });
  // drop on the right half of b -> slot AFTER b (index 2); jsdom rects are 0-wide, so clientX 1 > mid 0
  fireEvent.dragOver(b, { dataTransfer, clientX: 1 });
  fireEvent.drop(b, { dataTransfer, clientX: 1 });
  expect(onReorder).toHaveBeenCalledWith("a", 2);
});

test("without onReorder, tabs are not draggable", () => {
  render(<EditorTabs tabs={tabs} activeId="a" onSelect={() => {}} />);
  expect(screen.getByRole("tab", { name: /main\.tsx/ })).toHaveAttribute("draggable", "false");
});
