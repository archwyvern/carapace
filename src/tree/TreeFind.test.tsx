import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TreeFind } from "./TreeFind";

test("typing reports the pattern", async () => {
  const onPatternChange = vi.fn();
  render(<TreeFind onPatternChange={onPatternChange} onClose={() => {}} />);
  await userEvent.type(screen.getByRole("textbox"), "foo");
  expect(onPatternChange).toHaveBeenLastCalledWith("foo");
});

test("Escape closes", async () => {
  const onClose = vi.fn();
  render(<TreeFind onPatternChange={() => {}} onClose={onClose} />);
  await userEvent.type(screen.getByRole("textbox"), "{Escape}");
  expect(onClose).toHaveBeenCalled();
});

test("shows the match count once a pattern is entered", async () => {
  render(<TreeFind onPatternChange={() => {}} onClose={() => {}} matchCount={3} currentMatch={1} />);
  await userEvent.type(screen.getByRole("textbox"), "x");
  expect(screen.getByText("2/3")).toBeInTheDocument();
});

test("ArrowDown triggers onNext", async () => {
  const onNext = vi.fn();
  render(<TreeFind onPatternChange={() => {}} onClose={() => {}} onNext={onNext} />);
  await userEvent.type(screen.getByRole("textbox"), "{ArrowDown}");
  expect(onNext).toHaveBeenCalled();
});
