import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { PresenceStack } from "./PresenceStack";

test("renders one deduped circle per distinct user with an aria count", () => {
  render(<PresenceStack users={[{ name: "alice" }, { name: "bob" }, { name: "alice" }]} />);
  const stack = screen.getByLabelText("2 people here");
  expect(stack).toBeInTheDocument();
  expect(screen.getByText("A")).toBeInTheDocument();
  expect(screen.getByText("B")).toBeInTheDocument();
});

test("renders nothing when empty", () => {
  render(<PresenceStack users={[]} />);
  expect(screen.queryByLabelText(/people here/)).not.toBeInTheDocument();
});

test("collapses past max into a +N chip whose tooltip lists the rest", async () => {
  const users = ["ann", "ben", "cid", "dot", "eve", "fay"].map((name) => ({ name }));
  render(<PresenceStack users={users} max={4} />);
  // max 4 -> 3 avatars + the overflow chip
  expect(screen.getByText("A")).toBeInTheDocument();
  expect(screen.getByText("B")).toBeInTheDocument();
  expect(screen.getByText("C")).toBeInTheDocument();
  expect(screen.queryByText("D")).not.toBeInTheDocument();
  const chip = screen.getByText("+3");
  fireEvent.mouseEnter(chip);
  expect(await screen.findByText("dot, eve, fay")).toBeInTheDocument();
});

test("avatar tooltip shows the full name", async () => {
  render(<PresenceStack users={[{ name: "kestrel" }]} />);
  fireEvent.mouseEnter(screen.getByText("K"));
  expect(await screen.findByText("kestrel")).toBeInTheDocument();
});
