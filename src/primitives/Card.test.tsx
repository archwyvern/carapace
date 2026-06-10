import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Card } from "./Card";

test("renders children", () => {
  render(<Card>BODY</Card>);
  expect(screen.getByText("BODY")).toBeInTheDocument();
});

test("a non-interactive card has no button role", () => {
  render(<Card>BODY</Card>);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("an interactive card is a button and Enter triggers its click", async () => {
  const onClick = vi.fn();
  render(
    <Card interactive onClick={onClick}>
      X
    </Card>,
  );
  screen.getByRole("button").focus();
  await userEvent.keyboard("{Enter}");
  expect(onClick).toHaveBeenCalled();
});
