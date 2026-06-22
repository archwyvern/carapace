import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MenuBar } from "./MenuBar";
import type { MenuModel } from "../menu/model";

function makeMenu(spies: { onNew?: () => void; onCut?: () => void } = {}): MenuModel {
  return [
    {
      label: "&&File",
      items: [
        { id: "new", label: "New", shortcut: "Ctrl+N", run: spies.onNew ?? (() => {}) },
        { id: "open", label: "Open", run: () => {} },
        { separator: true },
        {
          label: "Open &&Recent",
          items: [{ id: "r1", label: "project-a", run: () => {} }],
        },
      ],
    },
    {
      label: "&&Edit",
      items: [{ id: "cut", label: "Cut", enabled: false, run: spies.onCut ?? (() => {}) }],
    },
  ];
}

describe("MenuBar", () => {
  it("renders every top-level label", () => {
    render(<MenuBar menu={makeMenu()} />);
    expect(screen.getByRole("menuitem", { name: "File" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
  });

  it("clicking a top menu opens its dropdown", async () => {
    render(<MenuBar menu={makeMenu()} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
    expect(await screen.findByText("New")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("clicking an action runs it and closes the dropdown", async () => {
    const onNew = vi.fn();
    render(<MenuBar menu={makeMenu({ onNew })} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
    await userEvent.click(await screen.findByText("New"));
    expect(onNew).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("New")).not.toBeInTheDocument());
  });

  it("a disabled action is not run", async () => {
    const onCut = vi.fn();
    render(<MenuBar menu={makeMenu({ onCut })} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cut" }));
    expect(onCut).not.toHaveBeenCalled();
  });

  it("a separator renders", async () => {
    render(<MenuBar menu={makeMenu()} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
    expect(await screen.findByRole("separator")).toBeInTheDocument();
  });

  it("hovering a submenu reveals its child items", async () => {
    render(<MenuBar menu={makeMenu()} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
    await userEvent.hover(await screen.findByRole("menuitem", { name: /Open Recent/ }));
    expect(await screen.findByText("project-a")).toBeInTheDocument();
  });

  it("clicking outside closes the dropdown", async () => {
    render(<MenuBar menu={makeMenu()} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
    expect(await screen.findByText("New")).toBeInTheDocument();
    await userEvent.click(document.body);
    await waitFor(() => expect(screen.queryByText("New")).not.toBeInTheDocument());
  });

  it("Escape closes the dropdown", async () => {
    render(<MenuBar menu={makeMenu()} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
    expect(await screen.findByText("New")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("New")).not.toBeInTheDocument());
  });

  it("moves between top-level menus with ArrowRight when open", async () => {
    render(<MenuBar menu={makeMenu()} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
    expect(await screen.findByText("New")).toBeInTheDocument();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveAttribute("aria-expanded", "true"));
    expect(await screen.findByText("Cut")).toBeInTheDocument();
  });
});
