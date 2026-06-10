import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): never {
  throw new Error("kaboom");
}

test("renders children when there is no error", () => {
  render(
    <ErrorBoundary>
      <div>OK</div>
    </ErrorBoundary>,
  );
  expect(screen.getByText("OK")).toBeInTheDocument();
});

test("renders the default fallback when a child throws", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );
  expect(screen.getByText("Something broke")).toBeInTheDocument();
  spy.mockRestore();
});

test("uses a custom fallback when provided", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <ErrorBoundary fallback={(e) => <div>caught: {e.message}</div>}>
      <Boom />
    </ErrorBoundary>,
  );
  expect(screen.getByText("caught: kaboom")).toBeInTheDocument();
  spy.mockRestore();
});
