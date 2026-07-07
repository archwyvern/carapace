import { fireEvent, render, screen } from "@testing-library/react";
import { Segmented, ToggleButton } from "./ToggleButton";

test("ToggleButton reflects pressed state and reports the flip", () => {
  const onChange = vi.fn();
  render(
    <ToggleButton pressed={false} onChange={onChange}>
      snap
    </ToggleButton>,
  );
  const btn = screen.getByRole("button", { name: "snap" });
  expect(btn).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(btn);
  expect(onChange).toHaveBeenCalledWith(true);
});

test("Segmented renders a group; exactly the active segment is pressed; click reports the value", () => {
  const onChange = vi.fn();
  render(<Segmented options={["diffuse", "normal", "lit"] as const} value="lit" onChange={onChange} label="View mode" />);
  expect(screen.getByRole("group", { name: "View mode" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "lit" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "diffuse" })).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(screen.getByRole("button", { name: "normal" }));
  expect(onChange).toHaveBeenCalledWith("normal");
});

test("Segmented option tones tint only the selected segment", () => {
  const options = [
    { value: "none", tone: "danger" as const },
    { value: "view" },
    { value: "manage", tone: "accent" as const },
  ];
  const classes = (name: string) => Array.from(screen.getByRole("button", { name }).classList);
  const { rerender } = render(<Segmented options={options} value="none" onChange={() => {}} label="Level" />);
  expect(classes("none")).toContain("text-error");
  // Unselected toned options stay neutral (hover:text-accent is a different token).
  expect(classes("manage")).not.toContain("text-accent");
  rerender(<Segmented options={options} value="manage" onChange={() => {}} label="Level" />);
  expect(classes("manage")).toContain("text-accent");
  expect(classes("none")).not.toContain("text-error");
});
