import { loader } from "@monaco-editor/react";

/** Worker factory matching Monaco's `MonacoEnvironment.getWorker`. */
export type MonacoWorkerFactory = (workerId: string, label: string) => Worker;

export interface MonacoOfflineOptions {
  /** The bundled Monaco module — `import * as monaco from "monaco-editor"`. */
  monaco: typeof import("monaco-editor");
  /** Returns a language worker for a Monaco label. Wire these from your bundler
   *  (e.g. Vite `?worker` imports of `monaco-editor/esm/vs/...`). */
  getWorker: MonacoWorkerFactory;
}

/**
 * Make {@link CodeEditor} use a bundled Monaco + local language workers instead of
 * `@monaco-editor/react`'s default CDN loader — i.e. work fully offline.
 *
 * Call once, before any editor mounts (a side-effect module imported from your entrypoint).
 * The worker wiring is bundler-specific (the `?worker` imports only Vite understands), so
 * carapace stays bundler-agnostic and the app supplies `getWorker`.
 */
export function configureMonacoOffline({ monaco, getWorker }: MonacoOfflineOptions): void {
  (globalThis as { MonacoEnvironment?: { getWorker: MonacoWorkerFactory } }).MonacoEnvironment = { getWorker };
  loader.config({ monaco });
}
