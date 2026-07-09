# carapace

A build-your-own-editor toolkit for React: theme, primitives, workbench chrome, and the
supporting models (commands, resources, shaders) that desktop-style tools keep reinventing.
Everything is designed for dark, dense, keyboard-driven editors — the kind you build in
Electron or ship as a web app.

Single-author toolkit, open source under MIT. Not published to npm. Each shipped package
(`@carapace/shell`, `@carapace/primitives`) is built and packed as a single-package tarball
attached to a GitHub Release (`gh workflow run release.yml -f version=X.Y.Z -f publish=true`);
consumers pin the asset URL, e.g.

```jsonc
"@carapace/shell": "https://github.com/archwyvern/carapace/releases/download/v0.1.0/carapace-shell-0.1.0.tgz"
```

This installs cleanly under `--frozen-lockfile` (a prebuilt tarball, unlike a monorepo git
dependency, which pnpm can't resolve+build on a fresh CI store). For live iteration, a consumer
can alias the specifier to a sibling checkout's source in its dev server (see the skyrat / lambert
vite configs) — no `pnpm link` / override required.

## Packages

| Package | What it is |
|---|---|
| **@carapace/shell** | The big one: theme tokens + base CSS, primitive components (buttons, spin-sliders, selects, tooltips, modals), the workbench (top bar, window controls, editor tabs with drag-reorder, panels, sashes), a command system (registry, rebindable keybindings, palette, vscode-style shortcut editor), a JetBrains-style settings modal with search, menus (context/submenu via floating-ui), tree views, inspector scaffolding, forms, and a platform **host** seam so the same UI runs on Electron IPC, a virtual FS, or in-memory for tests. |
| **@carapace/primitives** | Immutable value types — `Vector2/3/4`, colors, rects, AABBs, arcs — a TypeScript mirror of a C# numerics library. |
| **@carapace/resources** | A Godot-derived engine resource type hierarchy as a standalone TypeScript model, with observability and undo history. |
| **@carapace/resource-inspector** | The glue binding `@carapace/resources` to the shell's Inspector — the only package that knows both worlds. |
| **@carapace/vascal** | Lexer/parser/reader for the VascaL resource text format, with a decorator-based type registry. |
| **@carapace/vlsl** | The VLSL shader-language compiler with WGSL and WebGL (GLSL) backends. |

## Set up the theme

`@carapace/shell` ships **tokens only** — you import Tailwind (v4) yourself:

```css
@import "tailwindcss";
@import "@carapace/shell/theme.css";
/* Let Tailwind detect the classes the components use: */
@source "../node_modules/@carapace/shell/dist";
```

## Mount the shell

```tsx
import { HostProvider, WorkbenchFrame, createMemoryHost } from "@carapace/shell";

const host = createMemoryHost(); // replace with your Electron / vfs host

<HostProvider host={host}>
  <WorkbenchFrame title="My Tool">{/* ... */}</WorkbenchFrame>
</HostProvider>;
```

## The host seam

The shell never touches the platform directly — it goes through a `CarapaceHost`
(`window`, `fs`, `dialog`, `clipboard`). Provide one per environment:

- **Electron** — implement over IPC (a preload surface maps 1:1).
- **Browser** — `fs` over a virtual file system, window controls as no-ops,
  `dialog` as in-app modals, `clipboard` via `navigator.clipboard`.
- **Tests / demos** — `createMemoryHost()`, shipped with the package.

## Develop

```bash
pnpm install
pnpm test                              # vitest, all packages
pnpm --filter carapace-playground dev  # reference gallery app (in-memory host)
pnpm -r build                          # emit each package's dist/
```

License: MIT
