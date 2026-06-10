import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

test("renders the message; Confirm calls onConfirm", async () => {
  const onConfirm = vi.fn();
  render(<ConfirmDialog title="Delete?" message="Sure?" onConfirm={onConfirm} onCancel={() => {}} />);
  expect(screen.getByText("Sure?")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
  expect(onConfirm).toHaveBeenCalled();
});

test("Cancel calls onCancel", async () => {
  const onCancel = vi.fn();
  render(<ConfirmDialog title="X" message="m" onConfirm={() => {}} onCancel={onCancel} />);
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onCancel).toHaveBeenCalled();
});
