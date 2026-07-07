import { describe, expect, it } from "vitest";
import { applySort, clampWidth, gridTemplate, nextSort } from "./tableModel";
import type { DataTableColumn } from "./tableTypes";

interface Row {
  id: string;
  name: string;
  age: number | null;
}

const rows: Row[] = [
  { id: "1", name: "charlie", age: 30 },
  { id: "2", name: "alice", age: null },
  { id: "3", name: "bob", age: 20 },
  { id: "4", name: "alice", age: 25 },
];

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", cell: (r) => r.name, sortBy: (r) => r.name },
  { id: "age", header: "Age", cell: (r) => r.age, sortBy: (r) => r.age },
  { id: "plain", header: "Plain", cell: (r) => r.id },
  {
    id: "custom",
    header: "Custom",
    cell: (r) => r.id,
    compare: (a, b) => a.id.localeCompare(b.id),
  },
];

describe("nextSort", () => {
  it("cycles asc -> desc -> none on the same column", () => {
    expect(nextSort(null, "name")).toEqual({ columnId: "name", direction: "asc" });
    expect(nextSort({ columnId: "name", direction: "asc" }, "name")).toEqual({
      columnId: "name",
      direction: "desc",
    });
    expect(nextSort({ columnId: "name", direction: "desc" }, "name")).toBeNull();
  });

  it("switching columns starts at asc", () => {
    expect(nextSort({ columnId: "name", direction: "desc" }, "age")).toEqual({
      columnId: "age",
      direction: "asc",
    });
  });
});

describe("applySort", () => {
  it("returns the input array for null sort", () => {
    expect(applySort(rows, columns, null)).toBe(rows);
  });

  it("returns the input for an unknown or unsortable column", () => {
    expect(applySort(rows, columns, { columnId: "nope", direction: "asc" })).toBe(rows);
    expect(applySort(rows, columns, { columnId: "plain", direction: "asc" })).toBe(rows);
  });

  it("sorts strings with localeCompare, stable on ties", () => {
    const asc = applySort(rows, columns, { columnId: "name", direction: "asc" });
    // alice(2) before alice(4): input order preserved on equal keys
    expect(asc.map((r) => r.id)).toEqual(["2", "4", "3", "1"]);
  });

  it("sorts numbers numerically and flips for desc", () => {
    const asc = applySort(rows, columns, { columnId: "age", direction: "asc" });
    expect(asc.map((r) => r.age)).toEqual([20, 25, 30, null]);
    const desc = applySort(rows, columns, { columnId: "age", direction: "desc" });
    expect(desc.map((r) => r.age)).toEqual([30, 25, 20, null]);
  });

  it("sorts nulls last in BOTH directions", () => {
    const asc = applySort(rows, columns, { columnId: "age", direction: "asc" });
    const desc = applySort(rows, columns, { columnId: "age", direction: "desc" });
    expect(asc[asc.length - 1]!.id).toBe("2");
    expect(desc[desc.length - 1]!.id).toBe("2");
  });

  it("compare overrides sortBy and negates for desc", () => {
    const asc = applySort(rows, columns, { columnId: "custom", direction: "asc" });
    expect(asc.map((r) => r.id)).toEqual(["1", "2", "3", "4"]);
    const desc = applySort(rows, columns, { columnId: "custom", direction: "desc" });
    expect(desc.map((r) => r.id)).toEqual(["4", "3", "2", "1"]);
  });

  it("does not mutate the input", () => {
    const copy = [...rows];
    applySort(rows, columns, { columnId: "name", direction: "asc" });
    expect(rows).toEqual(copy);
  });
});

describe("gridTemplate", () => {
  const cols: DataTableColumn<Row>[] = [
    { id: "a", header: "A", cell: (r) => r.id, width: 120 },
    { id: "b", header: "B", cell: (r) => r.id, flex: 2, minWidth: 80 },
    { id: "c", header: "C", cell: (r) => r.id },
  ];

  it("fixed px, flex minmax with weight/min, defaults flex 1 min 60", () => {
    expect(gridTemplate(cols, {}, false)).toBe("120px minmax(80px,2fr) minmax(60px,1fr)");
  });

  it("overrides pin a column to px and clamp to minWidth", () => {
    expect(gridTemplate(cols, { b: 40, c: 200 }, false)).toBe("120px 80px 200px");
  });

  it("appends the menu column track", () => {
    expect(gridTemplate(cols, {}, true)).toBe("120px minmax(80px,2fr) minmax(60px,1fr) 36px");
  });
});

describe("clampWidth", () => {
  it("clamps to the column minWidth, defaulting 60", () => {
    expect(clampWidth({ id: "x", header: "", cell: () => null, minWidth: 100 }, 50)).toBe(100);
    expect(clampWidth({ id: "x", header: "", cell: () => null }, 50)).toBe(60);
    expect(clampWidth({ id: "x", header: "", cell: () => null }, 500)).toBe(500);
  });
});
