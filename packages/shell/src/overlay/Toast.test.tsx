import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./Toast";

function Trigger({ tone }: { tone?: "info" | "success" | "error" }) {
  const { notify } = useToast();
  return <button onClick={() => notify("Saved!", { tone, duration: 0 })}>go</button>;
}

test("notify shows a toast and dismiss removes it", async () => {
  render(
    <ToastProvider>
      <Trigger tone="success" />
    </ToastProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "go" }));
  expect(screen.getByText("Saved!")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
  expect(screen.queryByText("Saved!")).not.toBeInTheDocument();
});

test("error toasts use role=alert", async () => {
  render(
    <ToastProvider>
      <Trigger tone="error" />
    </ToastProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "go" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Saved!");
});

test("useToast throws without a provider", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  function Bad() {
    useToast();
    return null;
  }
  expect(() => render(<Bad />)).toThrow(/ToastProvider/);
  spy.mockRestore();
});
