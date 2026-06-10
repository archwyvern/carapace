import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormToggle } from "./FormToggle";

test("toggles the switch and reports the new value", async () => {
  const onChange = vi.fn();
  render(<FormToggle label="Snap" value={false} onChange={onChange} />);
  const sw = screen.getByRole("switch", { name: "Snap" });
  expect(sw).toHaveAttribute("aria-checked", "false");
  await userEvent.click(sw);
  expect(onChange).toHaveBeenCalledWith(true);
});

test("shows children only when on", () => {
  const { rerender } = render(
    <FormToggle label="X" value={false} onChange={() => {}}>
      <div>EXTRA</div>
    </FormToggle>,
  );
  expect(screen.queryByText("EXTRA")).not.toBeInTheDocument();
  rerender(
    <FormToggle label="X" value={true} onChange={() => {}}>
      <div>EXTRA</div>
    </FormToggle>,
  );
  expect(screen.getByText("EXTRA")).toBeInTheDocument();
});
