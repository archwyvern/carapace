import { fireEvent, render, screen } from "@testing-library/react";
import { IconButton } from "./IconButton";

test("plain IconButton carries a native title from its label", () => {
  render(<IconButton label="Lock guides" icon={<svg />} />);
  expect(screen.getByRole("button", { name: "Lock guides" })).toHaveAttribute("title", "Lock guides");
});

test("tooltip={true} uses the label; the native title is suppressed", () => {
  render(<IconButton label="Snap to guides" icon={<svg />} tooltip />);
  expect(screen.getByRole("button", { name: "Snap to guides" })).not.toHaveAttribute("title");
});

test("tooltip prop swaps the native title for the styled Tooltip", async () => {
  render(<IconButton label="Lock guides" icon={<svg />} tooltip="Guides locked — click to unlock" />);
  const btn = screen.getByRole("button", { name: "Lock guides" });
  expect(btn).not.toHaveAttribute("title");
  fireEvent.focus(btn.parentElement!); // the Tooltip wrapper span carries the show/hide handlers
  // the overlay Tooltip's default dwell is 400ms; findByRole polls past it
  expect(await screen.findByRole("tooltip", {}, { timeout: 1500 })).toHaveTextContent("Guides locked — click to unlock");
});
