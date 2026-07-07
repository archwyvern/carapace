import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { HistoryTimeline } from "./HistoryTimeline";
import type { HistoryTimelineItem } from "./HistoryTimeline";

const items: HistoryTimelineItem[] = [
  { id: "3", kind: "revert", summary: "Reverted step 1", user: "kestrel", timestamp: "2026-07-07T10:03:00Z" },
  { id: "2", kind: "update", summary: "Changed name, hull", user: "dominic", timestamp: "2026-07-07T10:02:00Z" },
  { id: "1", kind: "create", summary: "Created", user: "dominic", timestamp: "2026-07-07T10:01:00Z" },
];

test("renders rows in given order with summary and user line", () => {
  render(<HistoryTimeline items={items} />);
  const summaries = screen.getAllByTestId("history-summary").map((el) => el.textContent);
  expect(summaries).toEqual(["Reverted step 1", "Changed name, hull", "Created"]);
  expect(screen.getAllByText(/dominic ·/)).toHaveLength(2);
});

test("kind dots carry their tone classes", () => {
  render(<HistoryTimeline items={items} />);
  const dots = screen.getAllByTestId("kind-dot");
  expect(Array.from(dots[0]!.classList)).toContain("bg-accent"); // revert
  expect(Array.from(dots[1]!.classList)).toContain("border-border"); // update
  expect(Array.from(dots[2]!.classList)).toContain("bg-success"); // create
});

test("no undo/redo buttons without handlers; present and firing with them", () => {
  const { rerender } = render(<HistoryTimeline items={items} />);
  expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  const onUndo = vi.fn();
  const onRedo = vi.fn();
  rerender(<HistoryTimeline items={items} onUndo={onUndo} onRedo={onRedo} />);
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  fireEvent.click(screen.getByRole("button", { name: "Redo" }));
  expect(onUndo).toHaveBeenCalledOnce();
  expect(onRedo).toHaveBeenCalledOnce();
});

test("busy disables both buttons", () => {
  render(<HistoryTimeline items={items} onUndo={() => {}} onRedo={() => {}} busy />);
  expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
});

test("loading shows a spinner; empty renders the emptyState", () => {
  const { rerender } = render(<HistoryTimeline items={[]} loading />);
  expect(screen.getByRole("status")).toBeInTheDocument();
  rerender(<HistoryTimeline items={[]} emptyState={<span>No history yet.</span>} />);
  expect(screen.getByText("No history yet.")).toBeInTheDocument();
});
