import { isAction, isSeparator, isSubmenu } from "./model";
import type { MenuItem } from "./model";

const action: MenuItem = { id: "new", label: "New", run: () => {} };
const sep: MenuItem = { separator: true };
const submenu: MenuItem = { label: "Recent", items: [] };

test("isSeparator only matches separators", () => {
  expect(isSeparator(sep)).toBe(true);
  expect(isSeparator(action)).toBe(false);
  expect(isSeparator(submenu)).toBe(false);
});

test("isSubmenu only matches submenus", () => {
  expect(isSubmenu(submenu)).toBe(true);
  expect(isSubmenu(action)).toBe(false);
  expect(isSubmenu(sep)).toBe(false);
});

test("isAction only matches actions", () => {
  expect(isAction(action)).toBe(true);
  expect(isAction(submenu)).toBe(false);
  expect(isAction(sep)).toBe(false);
});
