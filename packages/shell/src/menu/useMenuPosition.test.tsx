import { describe, expect, it } from "vitest";
import { menuMiddleware, pointReference } from "./useMenuPosition";

describe("useMenuPosition helpers", () => {
  it("builds a virtual reference at a point", () => {
    const ref = pointReference({ x: 10, y: 20 });
    const rect = ref.getBoundingClientRect();
    expect(rect.x).toBe(10);
    expect(rect.y).toBe(20);
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
  });
  it("produces a middleware array for root and submenu", () => {
    expect(menuMiddleware().length).toBeGreaterThan(0);
    expect(menuMiddleware({ submenu: true }).length).toBeGreaterThan(0);
  });
});
