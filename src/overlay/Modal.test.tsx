import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

test("renders a labelled dialog with its children", () => {
  render(
    <Modal title="Hi" onClose={() => {}}>
      <p>Body</p>
    </Modal>,
  );
  expect(screen.getByRole("dialog", { name: "Hi" })).toBeInTheDocument();
  expect(screen.getByText("Body")).toBeInTheDocument();
});

test("Escape calls onClose", async () => {
  const onClose = vi.fn();
  render(
    <Modal title="Hi" onClose={onClose}>
      <button>x</button>
    </Modal>,
  );
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalled();
});

test("clicking the backdrop calls onClose", async () => {
  const onClose = vi.fn();
  const { container } = render(
    <Modal title="Hi" onClose={onClose}>
      <p>Body</p>
    </Modal>,
  );
  await userEvent.click(container.firstChild as HTMLElement);
  expect(onClose).toHaveBeenCalled();
});

test("clicking inside the panel does not close", async () => {
  const onClose = vi.fn();
  render(
    <Modal title="Hi" onClose={onClose}>
      <p>Body</p>
    </Modal>,
  );
  await userEvent.click(screen.getByText("Body"));
  expect(onClose).not.toHaveBeenCalled();
});
