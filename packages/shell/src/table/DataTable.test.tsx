import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable } from "./DataTable";
import type { DataTableColumn } from "./tableTypes";

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
