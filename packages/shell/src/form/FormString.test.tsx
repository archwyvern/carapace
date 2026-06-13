import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormString } from "./FormString";

test("reports each keystroke via onChange", async () => {
  const onChange = vi.fn();
  render(<FormString label="Name" value="" onChange={onChange} />);
  await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "hi");
  expect(onChange).toHaveBeenCalledTimes(2);
  expect(onChange).toHaveBeenLastCalledWith("i"); // controlled value stays "" between renders
});

test("commits on blur and on Enter", async () => {
  const onCommit = vi.fn();
  render(<FormString label="Name" value="abc" onChange={() => {}} onCommit={onCommit} />);
  const input = screen.getByRole("textbox", { name: "Name" });
  await userEvent.click(input);
  await userEvent.keyboard("{Enter}");
  expect(onCommit).toHaveBeenCalledWith("abc");
  await userEvent.click(input);
  await userEvent.tab();
  expect(onCommit).toHaveBeenCalledTimes(2);
});

test("readOnly blocks editing", async () => {
  const onChange = vi.fn();
  render(<FormString label="Path" value="core://x" onChange={onChange} readOnly />);
  await userEvent.type(screen.getByRole("textbox", { name: "Path" }), "zzz");
  expect(onChange).not.toHaveBeenCalled();
});
