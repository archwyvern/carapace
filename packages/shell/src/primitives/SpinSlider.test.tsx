import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SpinSlider } from "./SpinSlider";

function Harness(props: {
  initial?: number;
  integer?: boolean;
  suffix?: string;
  onCommit?: (v: number) => void;
}) {
  const [v, setV] = useState(props.initial ?? 0);
  return (
    <SpinSlider
      value={v}
      onChange={setV}
      onCommit={props.onCommit}
      integer={props.integer}
      suffix={props.suffix}
    />
  );
}

function focusControl(text: string) {
  screen.getByText(text).closest("div")!.focus();
}

test("renders the formatted value with suffix", () => {
  render(<Harness initial={1.5} suffix="m" />);
  expect(screen.getByText("1.5")).toBeInTheDocument();
  expect(screen.getByText("m")).toBeInTheDocument();
});

test("Enter opens the text editor seeded with the current value", async () => {
  render(<Harness initial={3} />);
  focusControl("3");
  await userEvent.keyboard("{Enter}");
  expect(screen.getByRole("textbox")).toHaveValue("3");
});

test("typing a number and pressing Enter commits it", async () => {
  render(<Harness initial={0} />);
  focusControl("0");
  await userEvent.keyboard("{Enter}");
  const input = screen.getByRole("textbox");
  await userEvent.clear(input);
  await userEvent.type(input, "42{Enter}");
  expect(screen.getByText("42")).toBeInTheDocument();
});

test("an arithmetic expression is evaluated on commit", async () => {
  render(<Harness initial={0} />);
  focusControl("0");
  await userEvent.keyboard("{Enter}");
  const input = screen.getByRole("textbox");
  await userEvent.clear(input);
  await userEvent.type(input, "1+2*3{Enter}");
  expect(screen.getByText("7")).toBeInTheDocument();
});

test("Escape cancels the edit without changing the value", async () => {
  render(<Harness initial={5} />);
  focusControl("5");
  await userEvent.keyboard("{Enter}");
  const input = screen.getByRole("textbox");
  await userEvent.clear(input);
  await userEvent.type(input, "99{Escape}");
  expect(screen.getByText("5")).toBeInTheDocument();
});

test("integer mode rounds the committed value", async () => {
  render(<Harness initial={0} integer />);
  focusControl("0");
  await userEvent.keyboard("{Enter}");
  const input = screen.getByRole("textbox");
  await userEvent.clear(input);
  await userEvent.type(input, "3.7{Enter}");
  expect(screen.getByText("4")).toBeInTheDocument();
});

test("ArrowUp / ArrowDown step the value", async () => {
  render(<Harness initial={5} integer />);
  focusControl("5");
  await userEvent.keyboard("{ArrowUp}");
  expect(screen.getByText("6")).toBeInTheDocument();
  focusControl("6");
  await userEvent.keyboard("{ArrowDown}{ArrowDown}");
  expect(screen.getByText("4")).toBeInTheDocument();
});

test("float arrows step a WHOLE 1.0, added unrounded; Shift steps 10", async () => {
  render(<Harness initial={0.2} />);
  focusControl("0.2");
  await userEvent.keyboard("{ArrowUp}");
  expect(screen.getByText("1.2")).toBeInTheDocument(); // 0.2 + 1.0, not snapped
  focusControl("1.2");
  await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");
  expect(screen.getByText("11.2")).toBeInTheDocument();
});

test("a custom step drives arrows (with the pending base carrying uncommitted presses)", async () => {
  const seen: number[] = [];
  render(<SpinSlider value={50} step={5} integer min={0} max={100} onChange={(v) => seen.push(v)} />);
  screen.getByText("50").closest("div")!.focus();
  await userEvent.keyboard("{ArrowUp}{ArrowDown}{ArrowDown}");
  expect(seen).toEqual([55, 50, 45]);
});

test("rapid arrow presses never step from a stale value (no every-2nd-press loss)", async () => {
  // A parent that applies updates LATE (like a store round-trip): value prop stays 0 while the
  // user keeps pressing. The pending base must carry each press forward.
  const seen: number[] = [];
  render(<SpinSlider value={0} onChange={(v) => seen.push(v)} />);
  const el = screen.getByText("0").closest("div")!;
  el.focus();
  await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
  expect(seen).toEqual([1, 2, 3]); // not [1, 1, 1]
});

test("onCommit fires with the committed value", async () => {
  const onCommit = vi.fn();
  render(<Harness initial={0} onCommit={onCommit} />);
  focusControl("0");
  await userEvent.keyboard("{Enter}");
  const input = screen.getByRole("textbox");
  await userEvent.clear(input);
  await userEvent.type(input, "42{Enter}");
  expect(onCommit).toHaveBeenCalledWith(42);
});
