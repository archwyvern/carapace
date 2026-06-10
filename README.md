# @archwyvern/carapace

Batteries-included React editor-shell: a theme, primitive components, a workbench
shell, and a platform **host** seam. One import gives a new tool its chrome, theme,
and base components so you can start on the actual idea.

> Single-author library. Not published to npm — consumed as a GitHub
> git-dependency. See the design doc in `docs/superpowers/specs/`.

## Install

Pin a tag or commit:

```jsonc
// package.json
{
  "dependencies": {
    "@archwyvern/carapace": "github:archwyvern/carapace#v0.0.1"
  }
}
```

For local iteration across repos, `pnpm link` Carapace into the consumer instead.

## Set up the theme

Carapace ships **tokens only** — you import Tailwind yourself (every consumer
already runs Tailwind v4). In your app's CSS entry:

```css
@import "tailwindcss";
@import "@archwyvern/carapace/theme.css";
/* Let Tailwind detect the classes Carapace's components use: */
@source "../node_modules/@archwyvern/carapace/dist";
```

## Mount the shell

```tsx
import { HostProvider, WorkbenchFrame, createMemoryHost } from "@archwyvern/carapace";

const host = createMemoryHost(); // replace with your Electron / vfs host

<HostProvider host={host}>
  <WorkbenchFrame title="My Tool">{/* ... */}</WorkbenchFrame>
</HostProvider>;
```

## The host seam

The shell never touches the platform directly — it goes through a `CarapaceHost`
(`window`, `fs`, `dialog`, `clipboard`). Provide one per environment:

- **Electron** — implement over IPC (your preload `window.editor` surface maps 1:1).
- **Browser (e.g. skyrat)** — `fs` over a virtual file system, `window` controls
  as no-ops, `dialog` as in-app modals, `clipboard` via `navigator.clipboard`.
- **Tests / demos** — `createMemoryHost()`, shipped with the package.

## What's here

Walking skeleton (plan 1): theme tokens, the `CarapaceHost` seam + in-memory host,
`Button`, `SpinSlider` (drag-to-scrub numeric with expression eval + `onCommit`),
`TitleBar`, and `WorkbenchFrame`. The full primitive set, the full shell
(activity bar, file tree, tabs, console, command palette), an optional `/monaco`
entry, and a presentational inspector are later plans.

## Develop

```bash
pnpm install
pnpm test                              # vitest
pnpm --filter carapace-playground dev  # reference app (in-memory host)
pnpm build                             # emit dist/
```
