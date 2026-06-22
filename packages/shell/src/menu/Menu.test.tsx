import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu } from "./Menu";
import type { MenuProps } from "./Menu";
import type { MenuItem } from "./model";

function open(items: MenuItem[], extra: Partial<MenuProps> = {}) {
  return render(
    <Menu items={items} open onOpenChange={() => {}} anchor={{ x: 0, y: 0 }} ariaLabel="test" {...extra} />,
  );
}

// Real browsers move focus into the menu on open (FloatingFocusManager modal); jsdom does
// not, so establish it explicitly before exercising keyboard navigation.
function focusMenu() {
  (screen.getByRole("menu") as HTMLElement).focus();
}

describe("Menu surface", () => {
  it("renders actions with shortcuts and runs on click", async () => {
    const run = vi.fn();
    open([{ label: "Save", shortcut: "Ctrl+S", run }]);
    expect(screen.getByText("Ctrl+S")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Save"));
    expect(run).toHaveBeenCalledOnce();
  });

  it("navigates with arrow keys and activates with Enter", async () => {
    const a = vi.fn();
    const b = vi.fn();
    open([{ label: "Alpha", run: a }, { label: "Beta", run: b }]);
    focusMenu();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(b).toHaveBeenCalledOnce();
    expect(a).not.toHaveBeenCalled();
  });

  it("skips disabled items during navigation", async () => {
    const a = vi.fn();
    const c = vi.fn();
    open([
      { label: "Alpha", run: a },
      { label: "Beta", enabled: false, run: () => {} },
      { label: "Gamma", run: c },
    ]);
    focusMenu();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(c).toHaveBeenCalledOnce();
  });

  it("typeahead jumps to a matching item", async () => {
    const g = vi.fn();
    open([{ label: "Alpha", run: () => {} }, { label: "Gamma", run: g }]);
    focusMenu();
    await userEvent.keyboard("g{Enter}");
    expect(g).toHaveBeenCalledOnce();
  });

  it("checkbox toggles and reports aria-checked", async () => {
    const run = vi.fn();
    open([{ label: "Wrap", role: "checkbox", checked: true, run }]);
    const item = screen.getByRole("menuitemcheckbox");
    expect(item).toHaveAttribute("aria-checked", "true");
    await userEvent.click(item);
    expect(run).toHaveBeenCalledOnce();
  });

  it("radio group renders options and fires onChange", async () => {
    const onChange = vi.fn();
    open([{ radio: true, value: "a", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }], onChange }]);
    const radios = screen.getAllByRole("menuitemradio");
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    await userEvent.click(radios[1]!);
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("renders headers and separators non-interactively", () => {
    open([{ header: "Group" }, { label: "X", run: () => {} }, { separator: true }]);
    expect(screen.getByText("Group")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("Escape requests close", async () => {
    const onOpenChange = vi.fn();
    open([{ label: "X", run: () => {} }], { onOpenChange });
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange.mock.calls.some((c) => c[0] === false)).toBe(true);
  });

  it("filterable shows a search field that narrows items", async () => {
    open([{ label: "Apple", run: () => {} }, { label: "Banana", run: () => {} }], { filterable: true });
    const field = screen.getByRole("textbox");
    await userEvent.type(field, "ban");
    expect(screen.queryByText("Apple")).toBeNull();
    expect(screen.getByText("Banana")).toBeInTheDocument();
  });
});
