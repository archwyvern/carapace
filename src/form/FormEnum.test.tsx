import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormEnum } from "./FormEnum";

test("renders the label and options, and reports the selected index", async () => {
  const onChange = vi.fn();
  render(<FormEnum label="Mode" value={0} options={["A", "B", "C"]} onChange={onChange} />);
  expect(screen.getByText("Mode")).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByRole("combobox"), "2");
  expect(onChange).toHaveBeenCalledWith(2);
});
