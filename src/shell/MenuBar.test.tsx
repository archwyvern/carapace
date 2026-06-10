import { render, screen } from "@testing-library/react";
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

test("renders every top-level label", () => {
  render(<MenuBar menu={makeMenu()} />);
  expect(screen.getByRole("menuitem", { name: "File" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
});

test("clicking a top menu opens its dropdown", async () => {
  render(<MenuBar menu={makeMenu()} />);
  await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
  expect(screen.getByText("New")).toBeInTheDocument();
  expect(screen.getByText("Open")).toBeInTheDocument();
});

test("clicking an action runs it and closes the dropdown", async () => {
  const onNew = vi.fn();
  render(<MenuBar menu={makeMenu({ onNew })} />);
  await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
  await userEvent.click(screen.getByText("New"));
  expect(onNew).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("New")).not.toBeInTheDocument();
});

test("a disabled action is not run", async () => {
  const onCut = vi.fn();
  render(<MenuBar menu={makeMenu({ onCut })} />);
  await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
  await userEvent.click(screen.getByRole("menuitem", { name: "Cut" }));
  expect(onCut).not.toHaveBeenCalled();
});

test("a separator renders", async () => {
  render(<MenuBar menu={makeMenu()} />);
  await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
  expect(screen.getByRole("separator")).toBeInTheDocument();
});

test("hovering a submenu reveals its child items", async () => {
  render(<MenuBar menu={makeMenu()} />);
  await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
  await userEvent.hover(screen.getByRole("menuitem", { name: /Open Recent/ }));
  expect(screen.getByText("project-a")).toBeInTheDocument();
});

test("clicking outside closes the dropdown", async () => {
  render(<MenuBar menu={makeMenu()} />);
  await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
  expect(screen.getByText("New")).toBeInTheDocument();
  await userEvent.click(document.body);
  expect(screen.queryByText("New")).not.toBeInTheDocument();
});

test("Escape closes the dropdown", async () => {
  render(<MenuBar menu={makeMenu()} />);
  await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByText("New")).not.toBeInTheDocument();
});
