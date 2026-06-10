import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TypedConfirmDialog } from "./TypedConfirmDialog";

test("the destroy button enables only when the exact text is typed", async () => {
  const onConfirm = vi.fn();
  render(
    <TypedConfirmDialog
      title="Delete"
      message="m"
      expectedText="my-project"
      onConfirm={onConfirm}
      onCancel={() => {}}
    />,
  );
  const destroy = screen.getByRole("button", { name: "Delete" });
  expect(destroy).toBeDisabled();
  await userEvent.type(screen.getByRole("textbox"), "my-project");
  expect(destroy).toBeEnabled();
  await userEvent.click(destroy);
  expect(onConfirm).toHaveBeenCalled();
});
