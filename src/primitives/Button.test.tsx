import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

test("renders its label", () => {
  render(<Button>Save</Button>);
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
});

test("fires onClick", async () => {
  let clicks = 0;
  render(<Button onClick={() => clicks++}>Go</Button>);
  await userEvent.click(screen.getByRole("button", { name: "Go" }));
  expect(clicks).toBe(1);
});

test("accent variant applies the accent surface class", () => {
  render(<Button variant="accent">Go</Button>);
  expect(screen.getByRole("button")).toHaveClass("bg-accent");
});
