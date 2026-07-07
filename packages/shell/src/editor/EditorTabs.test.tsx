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

// --- tab context menu + pin ---
import { tabVerbIds } from "./EditorTabs";

const four: EditorTab[] = [
  { id: "p", title: "pinned.ts", pinned: true },
  { id: "a2", title: "one.ts", dirty: true },
  { id: "b2", title: "two.ts" },
  { id: "c2", title: "three.ts" },
];

test("verb id math: others/right/saved skip pinned; close-all includes pinned", () => {
  expect(tabVerbIds("close", four, "b2")).toEqual(["b2"]);
  expect(tabVerbIds("close-others", four, "b2")).toEqual(["a2", "c2"]);
  expect(tabVerbIds("close-right", four, "a2")).toEqual(["b2", "c2"]);
  expect(tabVerbIds("close-saved", four, "b2")).toEqual(["b2", "c2"]);
  expect(tabVerbIds("close-all", four, "b2")).toEqual(["p", "a2", "b2", "c2"]);
});

test("right-click opens the verb menu; Close Others closes the others", async () => {
  const onCloseMany = vi.fn();
  render(<EditorTabs tabs={four} activeId="a2" onSelect={() => {}} onCloseMany={onCloseMany} />);
  fireEvent.contextMenu(screen.getByRole("tab", { name: /two\.ts/ }));
  await userEvent.click(await screen.findByRole("menuitem", { name: /Close Others/ }));
  expect(onCloseMany).toHaveBeenCalledWith(["a2", "c2"]);
});

test("menu shows the host shortcut hint and extra items; Pin flips to Unpin when pinned", async () => {
  const onPin = vi.fn();
  render(
    <EditorTabs
      tabs={four}
      activeId="a2"
      onSelect={() => {}}
      onCloseMany={() => {}}
      onPin={onPin}
      menuShortcut={(v) => (v === "close" ? "Ctrl+W" : undefined)}
      extraMenuItems={(tab) => [{ label: `Copy Path ${tab.id}`, run: () => {} }]}
    />,
  );
  fireEvent.contextMenu(screen.getByRole("tab", { name: /pinned\.ts/ }));
  expect(await screen.findByRole("menuitem", { name: /Unpin/ })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: /Copy Path p/ })).toBeInTheDocument();
  expect(screen.getByText("Ctrl+W")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("menuitem", { name: /Unpin/ }));
  expect(onPin).toHaveBeenCalledWith("p", false);
});

test("a pinned tab renders compact: no title text, no close button, middle-click ignored", () => {
  const onClose = vi.fn();
  render(<EditorTabs tabs={four} activeId="a2" onSelect={() => {}} onClose={onClose} />);
  const pinnedTab = screen.getByRole("tab", { name: /pinned\.ts/ });
  expect(pinnedTab.querySelector("span.truncate")).toBeNull(); // no title span
  expect(screen.queryByRole("button", { name: "Close pinned.ts" })).not.toBeInTheDocument();
  fireEvent(pinnedTab, new MouseEvent("auxclick", { bubbles: true, button: 1 }));
  expect(onClose).not.toHaveBeenCalled();
});
