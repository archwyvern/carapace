import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsModal } from "./SettingsModal";
import type { SettingsScreen } from "./SettingsModal";

const screens: SettingsScreen[] = [
  { id: "general", label: "General", group: "Project", render: () => <div>general-screen</div> },
  { id: "output", label: "Output", group: "Project", render: () => <div>output-screen</div> },
  { id: "canvas", label: "Canvas", group: "Document", render: () => <div>canvas-screen</div> },
];

test("renders the nav with group headings and the first screen", () => {
  render(<SettingsModal screens={screens} onClose={() => {}} />);
  expect(screen.getByText("Project")).toBeInTheDocument();
  expect(screen.getByText("Document")).toBeInTheDocument();
  expect(screen.getByText("general-screen")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "General" })).toHaveAttribute("aria-selected", "true");
});

test("clicking a nav row switches the screen and reports it", async () => {
  const onScreenChange = vi.fn();
  render(<SettingsModal screens={screens} onScreenChange={onScreenChange} onClose={() => {}} />);
  await userEvent.click(screen.getByRole("tab", { name: "Canvas" }));
  expect(screen.getByText("canvas-screen")).toBeInTheDocument();
  expect(screen.queryByText("general-screen")).not.toBeInTheDocument();
  expect(onScreenChange).toHaveBeenCalledWith("canvas");
});

test("initialScreen opens on that screen; unknown ids fall back to the first", () => {
  const { unmount } = render(<SettingsModal screens={screens} initialScreen="output" onClose={() => {}} />);
  expect(screen.getByText("output-screen")).toBeInTheDocument();
  unmount();
  render(<SettingsModal screens={screens} initialScreen="nope" onClose={() => {}} />);
  expect(screen.getByText("general-screen")).toBeInTheDocument();
});

test("Escape and the close button both close", async () => {
  const onClose = vi.fn();
  render(<SettingsModal screens={screens} onClose={onClose} />);
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", { name: "Close settings" }));
  expect(onClose).toHaveBeenCalledTimes(2);
});

test("arrow keys walk the screen list", async () => {
  render(<SettingsModal screens={screens} onClose={() => {}} />);
  screen.getByRole("tab", { name: "General" }).focus();
  await userEvent.keyboard("{ArrowDown}");
  expect(screen.getByText("output-screen")).toBeInTheDocument();
  await userEvent.keyboard("{ArrowUp}");
  expect(screen.getByText("general-screen")).toBeInTheDocument();
});
