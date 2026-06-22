import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CheckSlot, KeybindingChip, RowHeader, RowSeparator, SubmenuArrow } from "./MenuRow";

describe("MenuRow presentational helpers", () => {
  it("renders a header with group semantics", () => {
    render(<RowHeader text="Recent" />);
    expect(screen.getByText("Recent")).toBeInTheDocument();
  });
  it("renders a separator", () => {
    render(<RowSeparator />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
  it("shows a checkmark only when checked", () => {
    const { rerender, container } = render(<CheckSlot checked={false} />);
    expect(container.querySelector("svg")).toBeNull();
    rerender(<CheckSlot checked />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
  it("renders a keybinding chip and submenu arrow", () => {
    render(<><KeybindingChip text="Ctrl+S" /><SubmenuArrow /></>);
    expect(screen.getByText("Ctrl+S")).toBeInTheDocument();
  });
});
