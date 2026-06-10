import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptDialog } from "./PromptDialog";

test("Confirm passes the trimmed value", async () => {
  const onConfirm = vi.fn();
  render(<PromptDialog title="Name" onConfirm={onConfirm} onCancel={() => {}} />);
  await userEvent.type(screen.getByRole("textbox"), "  hello  ");
  await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
  expect(onConfirm).toHaveBeenCalledWith("hello");
});

test("a failing validator blocks Confirm and shows the error", async () => {
  render(
    <PromptDialog
      title="Name"
      validate={(v) => (v.length < 3 ? "too short" : null)}
      onConfirm={() => {}}
      onCancel={() => {}}
    />,
  );
  await userEvent.type(screen.getByRole("textbox"), "ab");
  expect(screen.getByText("too short")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
});
