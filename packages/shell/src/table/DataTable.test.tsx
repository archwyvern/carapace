import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable";
import type { DataTableColumn } from "./tableTypes";

// jsdom has no PointerEvent (so fireEvent.pointer* can't construct one and React never dispatches the
// handlers) and its setPointerCapture throws on synthetic ids. Polyfill PointerEvent as a MouseEvent
// subclass (clientX/button/buttons flow through) and stub capture to a no-op. (Same rig as Sash.test.tsx.)
class PointerEventPolyfill extends MouseEvent {
  pointerId: number;
  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.pointerId = props.pointerId ?? 1;
  }
}
beforeAll(() => {
  (globalThis as { PointerEvent: typeof PointerEvent }).PointerEvent =
    PointerEventPolyfill as unknown as typeof PointerEvent;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
});

export interface User {
  id: string;
  name: string;
  role: string;
}

export const users: User[] = [
  { id: "u1", name: "charlie", role: "viewer" },
  { id: "u2", name: "alice", role: "admin" },
  { id: "u3", name: "bob", role: "editor" },
];

export const userColumns: DataTableColumn<User>[] = [
  { id: "name", header: "Name", cell: (u) => u.name, sortBy: (u) => u.name },
  { id: "role", header: "Role", cell: (u) => u.role, width: 100, align: "right" },
];

describe("DataTable render", () => {
  it("renders headers and cell content in row order", () => {
    render(<DataTable rows={users} columns={userColumns} rowId={(u) => u.id} ariaLabel="Users" />);
    const grid = screen.getByRole("grid", { name: "Users" });
    expect(within(grid).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Name", "Role"]);
    const dataRows = within(grid).getAllByRole("row").slice(1); // row 0 is the header
    expect(dataRows).toHaveLength(3);
    expect(within(dataRows[0]!).getAllByRole("gridcell").map((c) => c.textContent)).toEqual([
      "charlie",
      "viewer",
    ]);
  });

  it("sets the grid template from the columns", () => {
    render(<DataTable rows={users} columns={userColumns} rowId={(u) => u.id} ariaLabel="Users" />);
    const grid = screen.getByRole("grid", { name: "Users" });
    expect(grid.style.getPropertyValue("--dt-cols")).toBe("minmax(60px,1fr) 100px");
  });

  it("renders emptyState centered when rows is empty", () => {
    render(
      <DataTable rows={[]} columns={userColumns} rowId={(u: User) => u.id} emptyState={<span>No users</span>} />,
    );
    expect(screen.getByText("No users")).toBeInTheDocument();
    expect(screen.queryAllByRole("row")).toHaveLength(1); // header only
  });

  it("shows a loading overlay without hiding the header", () => {
    render(<DataTable rows={users} columns={userColumns} rowId={(u) => u.id} loading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  });
});

describe("DataTable sorting", () => {
  it("header click cycles asc -> desc -> none and reorders rows", () => {
    render(<DataTable rows={users} columns={userColumns} rowId={(u) => u.id} ariaLabel="Users" />);
    const nameHeader = screen.getByRole("columnheader", { name: /name/i });
    const names = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((r) => within(r).getAllByRole("gridcell")[0]!.textContent);

    fireEvent.click(nameHeader);
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    expect(names()).toEqual(["alice", "bob", "charlie"]);
    fireEvent.click(nameHeader);
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");
    expect(names()).toEqual(["charlie", "bob", "alice"]);
    fireEvent.click(nameHeader);
    expect(nameHeader).not.toHaveAttribute("aria-sort");
    expect(names()).toEqual(["charlie", "alice", "bob"]); // input order restored
  });

  it("unsortable headers are not buttons", () => {
    render(<DataTable rows={users} columns={userColumns} rowId={(u) => u.id} ariaLabel="Users" />);
    expect(screen.getByRole("columnheader", { name: /role/i }).tagName).not.toBe("BUTTON");
  });

  it("controlled sort: renders the prop and only notifies", () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        rows={users}
        columns={userColumns}
        rowId={(u) => u.id}
        ariaLabel="Users"
        sort={{ columnId: "name", direction: "asc" }}
        onSortChange={onSortChange}
      />,
    );
    const nameHeader = screen.getByRole("columnheader", { name: /name/i });
    fireEvent.click(nameHeader);
    expect(onSortChange).toHaveBeenCalledWith({ columnId: "name", direction: "desc" });
    // still ascending — parent didn't re-render with a new prop
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  });

  it("defaultSort applies on mount", () => {
    render(
      <DataTable
        rows={users}
        columns={userColumns}
        rowId={(u) => u.id}
        ariaLabel="Users"
        defaultSort={{ columnId: "name", direction: "desc" }}
      />,
    );
    expect(screen.getByRole("columnheader", { name: /name/i })).toHaveAttribute("aria-sort", "descending");
  });
});

describe("DataTable selection", () => {
  it("click selects a single row and reports primary + set", () => {
    const onSelectionChange = vi.fn();
    const onSelectedChange = vi.fn();
    render(
      <DataTable
        rows={users}
        columns={userColumns}
        rowId={(u) => u.id}
        ariaLabel="Users"
        onSelectionChange={onSelectionChange}
        onSelectedChange={onSelectedChange}
      />,
    );
    fireEvent.click(screen.getByText("alice"));
    expect(onSelectionChange).toHaveBeenCalledWith(users[1]);
    expect(onSelectedChange).toHaveBeenCalledWith([users[1]]);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[1]).toHaveAttribute("aria-selected", "true");
    expect(rows[0]).toHaveAttribute("aria-selected", "false");
  });

  it("ctrl-click toggles, shift-click ranges from the anchor", () => {
    const onSelectedChange = vi.fn();
    render(
      <DataTable
        rows={users}
        columns={userColumns}
        rowId={(u) => u.id}
        ariaLabel="Users"
        onSelectedChange={onSelectedChange}
      />,
    );
    fireEvent.click(screen.getByText("charlie"));
    fireEvent.click(screen.getByText("bob"), { ctrlKey: true });
    expect(onSelectedChange).toHaveBeenLastCalledWith([users[0], users[2]]);
    fireEvent.click(screen.getByText("bob"), { ctrlKey: true }); // toggle off — anchor moves to bob
    expect(onSelectedChange).toHaveBeenLastCalledWith([users[0]]);
    // shift-click ranges from the anchor (bob, per TreeView/VS Code semantics), replacing the set
    fireEvent.click(screen.getByText("alice"), { shiftKey: true });
    expect(onSelectedChange).toHaveBeenLastCalledWith([users[1], users[2]]);
  });

  it("multiSelect=false degrades modifiers to plain select", () => {
    const onSelectedChange = vi.fn();
    render(
      <DataTable
        rows={users}
        columns={userColumns}
        rowId={(u) => u.id}
        ariaLabel="Users"
        multiSelect={false}
        onSelectedChange={onSelectedChange}
      />,
    );
    fireEvent.click(screen.getByText("charlie"));
    fireEvent.click(screen.getByText("bob"), { ctrlKey: true });
    expect(onSelectedChange).toHaveBeenLastCalledWith([users[2]]);
  });

  it("controlled selection renders selectedIds and does not self-update", () => {
    render(
      <DataTable
        rows={users}
        columns={userColumns}
        rowId={(u) => u.id}
        ariaLabel="Users"
        selectedIds={new Set(["u3"])}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[2]).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByText("alice"));
    expect(rows[2]).toHaveAttribute("aria-selected", "true");
    expect(rows[1]).toHaveAttribute("aria-selected", "false");
  });

  it("keyboard: arrows move selection in SORTED order, Home/End jump, Enter activates", () => {
    const onActivate = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        rows={users}
        columns={userColumns}
        rowId={(u) => u.id}
        ariaLabel="Users"
        defaultSort={{ columnId: "name", direction: "asc" }}
        onActivate={onActivate}
        onSelectionChange={onSelectionChange}
      />,
    );
    const grid = screen.getByRole("grid", { name: "Users" });
    fireEvent.click(screen.getByText("alice")); // sorted index 0
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    expect(onSelectionChange).toHaveBeenLastCalledWith(users[2]); // bob is sorted index 1
    fireEvent.keyDown(grid, { key: "End" });
    expect(onSelectionChange).toHaveBeenLastCalledWith(users[0]); // charlie sorted last
    fireEvent.keyDown(grid, { key: "Enter" });
    expect(onActivate).toHaveBeenCalledWith(users[0]);
  });

  it("ctrl+A selects all when multiSelect", () => {
    const onSelectedChange = vi.fn();
    render(
      <DataTable
        rows={users}
        columns={userColumns}
        rowId={(u) => u.id}
        ariaLabel="Users"
        onSelectedChange={onSelectedChange}
      />,
    );
    const grid = screen.getByRole("grid", { name: "Users" });
    fireEvent.click(screen.getByText("alice"));
    fireEvent.keyDown(grid, { key: "a", ctrlKey: true });
    expect(onSelectedChange).toHaveBeenLastCalledWith(users);
  });

  it("double-click activates", () => {
    const onActivate = vi.fn();
    render(
      <DataTable rows={users} columns={userColumns} rowId={(u) => u.id} ariaLabel="Users" onActivate={onActivate} />,
    );
    fireEvent.doubleClick(screen.getByText("bob"));
    expect(onActivate).toHaveBeenCalledWith(users[2]);
  });
});

describe("DataTable row menu", () => {
  const rowMenu = (u: User) => [{ label: `Delete ${u.name}`, run: vi.fn() }];

  it("renders a trailing menu button per row and opens with the right row", () => {
    render(
      <DataTable rows={users} columns={userColumns} rowId={(u) => u.id} ariaLabel="Users" rowMenu={rowMenu} />,
    );
    const buttons = screen.getAllByRole("button", { name: "Row actions" });
    expect(buttons).toHaveLength(3);
    fireEvent.click(buttons[1]!);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Delete alice")).toBeInTheDocument();
  });

  it("right-click opens the context menu and selects the row first", () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        rows={users}
        columns={userColumns}
        rowId={(u) => u.id}
        ariaLabel="Users"
        rowMenu={rowMenu}
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.contextMenu(screen.getByText("bob"));
    expect(screen.getByText("Delete bob")).toBeInTheDocument();
    expect(onSelectionChange).toHaveBeenCalledWith(users[2]);
  });

  it("no rowMenu -> no trailing buttons, no context menu", () => {
    render(<DataTable rows={users} columns={userColumns} rowId={(u) => u.id} ariaLabel="Users" />);
    expect(screen.queryByRole("button", { name: "Row actions" })).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("bob"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("DataTable virtualization", () => {
  const many: User[] = Array.from({ length: 500 }, (_, i) => ({
    id: `u${i}`,
    name: `user ${i}`,
    role: "viewer",
  }));

  function renderVirtual() {
    render(
      <DataTable rows={many} columns={userColumns} rowId={(u) => u.id} ariaLabel="Users" rowHeight={28} />,
    );
    const grid = screen.getByRole("grid", { name: "Users" });
    // jsdom has no layout: give the scroll container a viewport height.
    Object.defineProperty(grid, "clientHeight", { value: 280, configurable: true });
    fireEvent.scroll(grid, { target: { scrollTop: 0 } });
    return grid;
  }

  it("renders a bounded slice, not all 500 rows", () => {
    renderVirtual();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.length).toBeLessThan(50);
    expect(screen.getByText("user 0")).toBeInTheDocument();
    expect(screen.queryByText("user 499")).not.toBeInTheDocument();
  });

  it("scrolling moves the window", () => {
    const grid = renderVirtual();
    fireEvent.scroll(grid, { target: { scrollTop: 250 * 28 } });
    expect(screen.getByText("user 250")).toBeInTheDocument();
    expect(screen.queryByText("user 0")).not.toBeInTheDocument();
  });

  it("small tables stay fully materialized", () => {
    render(<DataTable rows={users} columns={userColumns} rowId={(u) => u.id} ariaLabel="Users" />);
    expect(screen.getAllByRole("row").slice(1)).toHaveLength(3);
  });
});

describe("DataTable column resize", () => {
  function dragSash(sash: HTMLElement, dx: number) {
    fireEvent.pointerDown(sash, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(sash, { buttons: 1, clientX: 100 + dx, pointerId: 1 });
    fireEvent.pointerUp(sash, { pointerId: 1 });
  }

  it("dragging pins the column to px and fires onColumnWidthsChange on drag end", () => {
    const onColumnWidthsChange = vi.fn();
    render(
      <DataTable
        rows={users}
        columns={userColumns}
        rowId={(u) => u.id}
        ariaLabel="Users"
        defaultColumnWidths={{ name: 150 }}
        onColumnWidthsChange={onColumnWidthsChange}
      />,
    );
    const grid = screen.getByRole("grid", { name: "Users" });
    expect(grid.style.getPropertyValue("--dt-cols")).toBe("150px 100px");
    const sash = screen.getAllByRole("separator")[0]!;
    dragSash(sash, 30);
    expect(grid.style.getPropertyValue("--dt-cols")).toBe("180px 100px");
    expect(onColumnWidthsChange).toHaveBeenCalledTimes(1);
    expect(onColumnWidthsChange).toHaveBeenCalledWith({ name: 180 });
  });

  it("clamps at minWidth", () => {
    render(
      <DataTable
        rows={users}
        columns={userColumns}
        rowId={(u) => u.id}
        ariaLabel="Users"
        defaultColumnWidths={{ name: 80 }}
      />,
    );
    const grid = screen.getByRole("grid", { name: "Users" });
    dragSash(screen.getAllByRole("separator")[0]!, -100);
    expect(grid.style.getPropertyValue("--dt-cols")).toBe("60px 100px"); // default minWidth 60
  });
});
