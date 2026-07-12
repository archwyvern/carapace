/**
 * React-free history primitives, exposed as the `@carapace/shell/history` subpath so model-layer
 * code (loaders, non-UI services) can depend on undo/redo without dragging the component barrel
 * (React, icon packs) into node processes and tests.
 */
export { History } from "./History";
export type { HistoryOptions, CommitOptions } from "./History";
export { SessionHistory } from "./SessionHistory";
export type { SessionHistoryOptions, SessionHistoryEntry } from "./SessionHistory";
