import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HostProvider } from "../host/context";
import { createMemoryHost } from "../host/memoryHost";
import { FileExplorer } from "./FileExplorer";

function setup(onOpen: (p: string) => void = () => {}) {
  const host = createMemoryHost({
    "/proj/src/main.tsx": "x",
    "/proj/src/app.css": "y",
    "/proj/README.md": "z",
  });
  render(
    <HostProvider host={host}>
      <FileExplorer root="/proj" onOpen={onOpen} />
    </HostProvider>,
  );
}

test("renders the file tree from the host fs", async () => {
  setup();
  expect(await screen.findByText("src")).toBeInTheDocument();
  expect(screen.getByText("README.md")).toBeInTheDocument();
});

test("expanding a directory shows its files", async () => {
  setup();
  await screen.findByText("src");
  await userEvent.click(screen.getByRole("button", { name: "Expand" }));
  expect(screen.getByText("main.tsx")).toBeInTheDocument();
  expect(screen.getByText("app.css")).toBeInTheDocument();
});

test("activating a file calls onOpen with its path", async () => {
  const onOpen = vi.fn();
  setup(onOpen);
  await screen.findByText("src");
  await userEvent.click(screen.getByRole("button", { name: "Expand" }));
  await userEvent.dblClick(screen.getByText("main.tsx"));
  expect(onOpen).toHaveBeenCalledWith("/proj/src/main.tsx");
});

test("exclude omits matching entries (and never walks into them)", async () => {
  const host = createMemoryHost({
    "/proj/src/main.tsx": "x",
    "/proj/node_modules/dep/index.js": "y",
    "/proj/README.md": "z",
  });
  render(
    <HostProvider host={host}>
      <FileExplorer root="/proj" exclude={(e) => e.isDir && e.name === "node_modules"} />
    </HostProvider>,
  );
  expect(await screen.findByText("src")).toBeInTheDocument();
  expect(screen.getByText("README.md")).toBeInTheDocument();
  expect(screen.queryByText("node_modules")).not.toBeInTheDocument();
});
