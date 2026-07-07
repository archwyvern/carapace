import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { LockBanner } from "./LockBanner";

test("renders the default message with the holder name", () => {
  render(<LockBanner holder="kestrel" />);
  const banner = screen.getByRole("status");
  expect(banner).toHaveTextContent("Being edited by kestrel — read-only until they finish.");
});

test("custom message replaces the default entirely", () => {
  render(<LockBanner holder="kestrel" message="Locked for maintenance." />);
  const banner = screen.getByRole("status");
  expect(banner).toHaveTextContent("Locked for maintenance.");
  expect(banner).not.toHaveTextContent("kestrel");
});
