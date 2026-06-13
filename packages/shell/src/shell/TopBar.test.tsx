import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { HostProvider } from "../host/context";
import { createMemoryHost } from "../host/memoryHost";
import { TopBar } from "./TopBar";
import type { MenuModel } from "../menu/model";

const menu: MenuModel = [
  { label: "&&File", items: [{ id: "n", label: "New", run: () => {} }] },
];

function wrap(ui: ReactNode) {
  return <HostProvider host={createMemoryHost()}>{ui}</HostProvider>;
}

test("renders the logo node", () => {
  render(wrap(<TopBar logo={<span>LOGO</span>} title="T" />));
  expect(screen.getByText("LOGO")).toBeInTheDocument();
});

test("renders the menu's top labels when a menu is given", () => {
  render(wrap(<TopBar menu={menu} />));
  expect(screen.getByRole("menuitem", { name: "File" })).toBeInTheDocument();
});

test("renders the title when no menu is given", () => {
  render(wrap(<TopBar title="My Tool" />));
  expect(screen.getByText("My Tool")).toBeInTheDocument();
});

test("omits window controls when showWindowControls is false", () => {
  render(wrap(<TopBar title="T" showWindowControls={false} />));
  expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
});
