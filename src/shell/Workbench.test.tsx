import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { HostProvider } from "../host/context";
import { createMemoryHost } from "../host/memoryHost";
import { Workbench } from "./Workbench";

function wrap(ui: ReactNode) {
  return <HostProvider host={createMemoryHost()}>{ui}</HostProvider>;
}

test("renders the top bar title and the children", () => {
  render(
    wrap(
      <Workbench title="Tool">
        <div>BODY</div>
      </Workbench>,
    ),
  );
  expect(screen.getByText("Tool")).toBeInTheDocument();
  expect(screen.getByText("BODY")).toBeInTheDocument();
});

test("renders the activity bar and status bar when provided", () => {
  render(
    wrap(
      <Workbench title="T" activityBar={<div>ACT</div>} statusBar={<div>STATUS</div>}>
        <div>BODY</div>
      </Workbench>,
    ),
  );
  expect(screen.getByText("ACT")).toBeInTheDocument();
  expect(screen.getByText("STATUS")).toBeInTheDocument();
});

test("omits the activity bar and status bar when not provided", () => {
  render(
    wrap(
      <Workbench title="T">
        <div>BODY</div>
      </Workbench>,
    ),
  );
  expect(screen.queryByText("ACT")).not.toBeInTheDocument();
  expect(screen.queryByText("STATUS")).not.toBeInTheDocument();
  expect(screen.getByText("BODY")).toBeInTheDocument();
});
