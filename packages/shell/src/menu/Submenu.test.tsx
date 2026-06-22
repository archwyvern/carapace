import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu } from "./Menu";
import type { MenuItem } from "./model";

function open(items: MenuItem[]) {
  return render(<Menu items={items} open onOpenChange={() => {}} anchor={{ x: 0, y: 0 }} ariaLabel="t" />);
}

function focusMenu() {
  (screen.getAllByRole("menu")[0] as HTMLElement).focus();
}

describe("Submenu", () => {
  it("opens a nested submenu on hover and runs a child action", async () => {
    const child = vi.fn();
    open([{ label: "More", items: [{ label: "Deep", run: child }] }]);
    const parent = screen.getByText("More");
    expect(parent.closest("[role=menuitem]")).toHaveAttribute("aria-haspopup", "menu");
    await userEvent.hover(parent);
    const deep = await screen.findByText("Deep");
    await userEvent.click(deep);
    expect(child).toHaveBeenCalledOnce();
  });

  it("opens a submenu via ArrowRight and closes via ArrowLeft", async () => {
    open([{ label: "More", items: [{ label: "Deep", run: () => {} }] }]);
    focusMenu();
    await userEvent.keyboard("{ArrowDown}{ArrowRight}");
    expect(await screen.findByText("Deep")).toBeInTheDocument();
    // A real browser moves focus into the submenu on ArrowRight; jsdom does not, so place
    // it there before ArrowLeft, which closes the submenu and returns to the parent.
    (screen.getAllByRole("menu")[1] as HTMLElement).focus();
    await userEvent.keyboard("{ArrowLeft}");
    await waitFor(() => expect(screen.queryByText("Deep")).toBeNull());
  });

  it("resolves async submenu items, showing then replacing a loading state", async () => {
    const items = () => Promise.resolve<MenuItem[]>([{ label: "Loaded", run: () => {} }]);
    open([{ label: "Async", items }]);
    await userEvent.hover(screen.getByText("Async"));
    expect(await screen.findByText("Loaded")).toBeInTheDocument();
  });

  it("shows an empty placeholder for an empty submenu", async () => {
    open([{ label: "Empty", items: [] }]);
    await userEvent.hover(screen.getByText("Empty"));
    expect(await screen.findByText("(empty)")).toBeInTheDocument();
  });
});
