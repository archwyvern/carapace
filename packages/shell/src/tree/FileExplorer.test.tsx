import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HostProvider } from "../host/context";
import { createMemoryHost } from "../host/memoryHost";
import { FileExplorer } from "./FileExplorer";

// jsdom doesn't implement File.arrayBuffer(); the import path only needs name + arrayBuffer,
// so stand in a faithful stub (real Chromium/Electron supplies a full File).
function fakeFile(name: string, bytes: number[]): File {
  return { name, arrayBuffer: async () => new Uint8Array(bytes).buffer } as unknown as File;
}

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

test("dropping OS files imports them into the target folder", async () => {
  const host = createMemoryHost({ "/proj/README.md": "z" });
  const createSpy = vi.spyOn(host.fs, "createFile");
  render(
    <HostProvider host={host}>
      <FileExplorer root="/proj" />
    </HostProvider>,
  );
  await screen.findByText("README.md");
  const file = fakeFile("drop.png", [1, 2, 3]);
  fireEvent.drop(screen.getByRole("tree"), { dataTransfer: { files: [file], items: [], types: ["Files"] } });
  expect(await screen.findByText("drop.png")).toBeInTheDocument();
  expect(createSpy).toHaveBeenCalledWith("/proj/drop.png", expect.any(Uint8Array));
});

test("a consumer onExternalDrop overrides the built-in import", async () => {
  const host = createMemoryHost({ "/proj/README.md": "z" });
  const createSpy = vi.spyOn(host.fs, "createFile");
  const onExternalDrop = vi.fn();
  render(
    <HostProvider host={host}>
      <FileExplorer root="/proj" onExternalDrop={onExternalDrop} />
    </HostProvider>,
  );
  await screen.findByText("README.md");
  const file = fakeFile("drop.png", [1]);
  fireEvent.drop(screen.getByRole("tree"), { dataTransfer: { files: [file], items: [], types: ["Files"] } });
  expect(onExternalDrop).toHaveBeenCalledTimes(1);
  expect(createSpy).not.toHaveBeenCalled();
});
