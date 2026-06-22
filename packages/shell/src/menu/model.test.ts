import { describe, expect, it } from "vitest";
import {
  isAction, isCommandRef, isCustom, isHeader, isRadioGroup, isSeparator, isSubmenu,
} from "./model";
import type { MenuItem } from "./model";

describe("menu model guards", () => {
  const action: MenuItem = { label: "A", run: () => {} };
  const checkbox: MenuItem = { label: "C", role: "checkbox", checked: true, run: () => {} };
  const sep: MenuItem = { separator: true };
  const header: MenuItem = { header: "Group" };
  const submenuEager: MenuItem = { label: "S", items: [action] };
  const submenuLazy: MenuItem = { label: "S", items: () => [action] };
  const radio: MenuItem = { radio: true, value: "a", options: [{ value: "a", label: "A" }], onChange: () => {} };
  const cmd: MenuItem = { command: "file.save" };
  const custom: MenuItem = { render: () => null };

  it("classifies separators", () => {
    expect(isSeparator(sep)).toBe(true);
    expect(isSeparator(action)).toBe(false);
  });
  it("classifies headers", () => {
    expect(isHeader(header)).toBe(true);
    expect(isHeader(action)).toBe(false);
  });
  it("classifies eager and lazy submenus", () => {
    expect(isSubmenu(submenuEager)).toBe(true);
    expect(isSubmenu(submenuLazy)).toBe(true);
    expect(isSubmenu(action)).toBe(false);
  });
  it("classifies actions including checkboxes", () => {
    expect(isAction(action)).toBe(true);
    expect(isAction(checkbox)).toBe(true);
    expect(isAction(sep)).toBe(false);
    expect(isAction(submenuEager)).toBe(false);
  });
  it("classifies radio groups", () => {
    expect(isRadioGroup(radio)).toBe(true);
    expect(isRadioGroup(action)).toBe(false);
  });
  it("classifies command refs", () => {
    expect(isCommandRef(cmd)).toBe(true);
    expect(isCommandRef(action)).toBe(false);
  });
  it("classifies custom rows", () => {
    expect(isCustom(custom)).toBe(true);
    expect(isCustom(action)).toBe(false);
  });
});
