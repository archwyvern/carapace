import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShortcutEditor } from "./ShortcutEditor";
import type { ShortcutRow } from "./ShortcutEditor";

const rows: ShortcutRow[] = [
  { id: "save", command: "File: Save", keys: "Ctrl+S", source: "default" },
  { id: "export", command: "File: Export", keys: "Ctrl+E", source: "user" },
  { id: "tool-pen", command: "Tools: Pen", keys: "P", when: "editor", source: "default" },
  { id: "pan", command: "Canvas: Pan", keys: null, source: "default", mouse: "Middle-drag" },
];

test("renders the table with bindings, scope, source, and mouse rows", () => {
  render(<ShortcutEditor rows={rows} onChange={() => {}} onReset={() => {}} />);
  expect(screen.getByText("File: Save")).toBeInTheDocument();
  expect(screen.getByText("Ctrl+S")).toBeInTheDocument();
  expect(screen.getByText("editor")).toBeInTheDocument();
  expect(screen.getByText("user")).toBeInTheDocument();
  expect(screen.getByText("Middle-drag")).toBeInTheDocument();
});

test("filter narrows the rows", async () => {
  render(<ShortcutEditor rows={rows} onChange={() => {}} onReset={() => {}} />);
  await userEvent.type(screen.getByLabelText("Filter commands"), "pen");
  expect(screen.getByText("Tools: Pen")).toBeInTheDocument();
  expect(screen.queryByText("File: Save")).not.toBeInTheDocument();
});

test("recording a chord: press combination, Enter accepts", async () => {
  const onChange = vi.fn();
  render(<ShortcutEditor rows={rows} onChange={onChange} onReset={() => {}} />);
  await userEvent.click(screen.getByRole("button", { name: "Change keybinding for File: Save" }));
  const box = screen.getByRole("textbox", { name: /Recording keybinding/ });
  await userEvent.keyboard("{Control>}{Shift>}k{/Shift}{/Control}");
  expect(box).toHaveTextContent("Ctrl+Shift+K");
  await userEvent.keyboard("{Enter}");
  expect(onChange).toHaveBeenCalledWith("save", "Ctrl+Shift+K");
});

test("recording cancels on Escape without changing anything", async () => {
  const onChange = vi.fn();
  render(<ShortcutEditor rows={rows} onChange={onChange} onReset={() => {}} />);
  await userEvent.click(screen.getByRole("button", { name: "Change keybinding for File: Save" }));
  await userEvent.keyboard("k{Escape}");
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.queryByRole("textbox", { name: /Recording keybinding/ })).not.toBeInTheDocument();
});

test("unbind and reset fire their callbacks", async () => {
  const onChange = vi.fn();
  const onReset = vi.fn();
  render(<ShortcutEditor rows={rows} onChange={onChange} onReset={onReset} />);
  await userEvent.click(screen.getByRole("button", { name: "Remove keybinding for File: Save" }));
  expect(onChange).toHaveBeenCalledWith("save", null);
  await userEvent.click(screen.getByRole("button", { name: "Reset keybinding for File: Export" }));
  expect(onReset).toHaveBeenCalledWith("export");
});

test("conflicting chords in the same scope are flagged; different scopes are not", () => {
  const conflicted: ShortcutRow[] = [
    { id: "a", command: "A", keys: "Ctrl+K", source: "default" },
    { id: "b", command: "B", keys: "Ctrl+K", source: "user" },
    { id: "c", command: "C", keys: "Ctrl+K", when: "editor", source: "default" },
  ];
  render(<ShortcutEditor rows={conflicted} onChange={() => {}} onReset={() => {}} />);
  expect(screen.getAllByLabelText(/Conflicts with another command/)).toHaveLength(2);
});
