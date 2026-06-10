import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityBar } from "./ActivityBar";
import type { ActivityItem } from "./ActivityBar";

const items: ActivityItem[] = [
  { id: "files", icon: <span>F</span>, title: "Files", active: true, onClick: () => {} },
  { id: "search", icon: <span>S</span>, title: "Search", onClick: () => {} },
];

test("renders a button per item", () => {
  render(<ActivityBar items={items} />);
  expect(screen.getByRole("button", { name: "Files" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
});

test("clicking an item calls its onClick", async () => {
  const onClick = vi.fn();
  render(<ActivityBar items={[{ id: "x", icon: <span>X</span>, title: "X", onClick }]} />);
  await userEvent.click(screen.getByRole("button", { name: "X" }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("the active item carries the accent marker", () => {
  render(<ActivityBar items={items} />);
  expect(screen.getByRole("button", { name: "Files" })).toHaveClass("border-accent");
});
