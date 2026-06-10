import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HostProvider } from "../host/context";
import { createMemoryHost } from "../host/memoryHost";
import { WindowControls } from "./WindowControls";

test("close button calls host.window.close", async () => {
  const host = createMemoryHost();
  let closed = 0;
  host.window.close = () => closed++;
  render(
    <HostProvider host={host}>
      <WindowControls />
    </HostProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: /close/i }));
  expect(closed).toBe(1);
});

test("maximize button toggles host maximize state", async () => {
  const host = createMemoryHost();
  render(
    <HostProvider host={host}>
      <WindowControls />
    </HostProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: /maximize/i }));
  expect(await host.window.isMaximized()).toBe(true);
});
