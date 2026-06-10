import { render, screen } from "@testing-library/react";
import { Toolbar } from "./Toolbar";

test("renders children", () => {
  render(
    <Toolbar>
      <button>Save</button>
    </Toolbar>,
  );
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
});

test("applies the justify variant", () => {
  const { container } = render(<Toolbar justify="end">x</Toolbar>);
  expect(container.firstChild).toHaveClass("justify-end");
});
