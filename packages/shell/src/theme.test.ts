// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("theme.css defines the core Carapace tokens", () => {
  const css = readFileSync(
    fileURLToPath(new URL("./theme.css", import.meta.url)),
    "utf8",
  );
  expect(css).toContain("@theme");
  // Surface + foreground tokens the components rely on.
  expect(css).toContain("--color-surface:");
  expect(css).toContain("--color-fg:");
  expect(css).toContain("--color-fg-mid:");
  expect(css).toContain("--color-accent:");
});
