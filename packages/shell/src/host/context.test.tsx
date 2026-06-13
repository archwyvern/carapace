import { render, screen } from "@testing-library/react";
import { HostProvider, useHost } from "./context";
import type { CarapaceHost } from "./types";

function HostProbe() {
  const host = useHost();
  return <div>{typeof host.window.close === "function" ? "ok" : "no"}</div>;
}

test("useHost throws when no provider is mounted", () => {
  const orig = console.error;
  console.error = () => {};
  expect(() => render(<HostProbe />)).toThrow(/HostProvider/);
  console.error = orig;
});

test("useHost returns the injected host inside a provider", () => {
  const host = { window: { close() {} } } as unknown as CarapaceHost;
  render(
    <HostProvider host={host}>
      <HostProbe />
    </HostProvider>,
  );
  expect(screen.getByText("ok")).toBeInTheDocument();
});
