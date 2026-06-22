import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextMenu, ContextMenuTrigger } from "./ContextMenu";
import type { MenuItem } from "./model";

const items: MenuItem[] = [
  { label: "Copy", run: () => {} },
  { label: "Paste", run: () => {} },
];

describe("ContextMenuTrigger", () => {
  it("opens on right-click and shows items", async () => {
    render(
      <ContextMenuTrigger items={items}>
        <div data-testid="surface">right-click me</div>
      </ContextMenuTrigger>,
    );
    await userEvent.pointer({ keys: "[MouseRight]", target: screen.getByTestId("surface") });
    expect(await screen.findByText("Copy")).toBeInTheDocument();
  });

  it("closes on outside press", async () => {
    render(
      <div>
        <ContextMenuTrigger items={items}>
          <div data-testid="surface">x</div>
        </ContextMenuTrigger>
        <button>outside</button>
      </div>,
    );
    await userEvent.pointer({ keys: "[MouseRight]", target: screen.getByTestId("surface") });
    expect(await screen.findByText("Copy")).toBeInTheDocument();
    await userEvent.click(screen.getByText("outside"));
    await waitFor(() => expect(screen.queryByText("Copy")).toBeNull());
  });

  it("supports per-target dynamic items", async () => {
    const dynamic = (e: MouseEvent) =>
      [{ label: `at ${(e.target as HTMLElement).dataset.testid}`, run: () => {} }] as MenuItem[];
    render(
      <ContextMenuTrigger items={dynamic}>
        <div data-testid="surface">x</div>
      </ContextMenuTrigger>,
    );
    await userEvent.pointer({ keys: "[MouseRight]", target: screen.getByTestId("surface") });
    expect(await screen.findByText("at surface")).toBeInTheDocument();
  });
});

describe("ContextMenu (direct anchor)", () => {
  it("renders items at a point and runs + closes on click", async () => {
    const run = vi.fn();
    const onClose = vi.fn();
    render(<ContextMenu items={[{ label: "X", run }]} anchor={{ x: 0, y: 0 }} onClose={onClose} />);
    await userEvent.click(await screen.findByText("X"));
    expect(run).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
  });

  it("does not run a disabled item", async () => {
    const run = vi.fn();
    render(
      <ContextMenu items={[{ label: "Del", enabled: false, run }]} anchor={{ x: 0, y: 0 }} onClose={() => {}} />,
    );
    await userEvent.click(screen.getByRole("menuitem", { name: "Del" }));
    expect(run).not.toHaveBeenCalled();
  });

  it("Escape closes", async () => {
    const onClose = vi.fn();
    render(<ContextMenu items={items} anchor={{ x: 0, y: 0 }} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
