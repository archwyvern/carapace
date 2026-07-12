import { useEffect, useReducer } from "react";
import type { PropertySource } from "./protocol";

/**
 * Re-renders the calling component whenever `source` (or anything that bubbles to it) changes.
 *
 * A custom view (a curve graph, a gradient bar) is rendered as a stable element created upstream, so
 * it normally re-renders only when the root inspector does — which never happens for edits to a
 * file-backed sub-source, since those don't bubble to their parent. Subscribing here makes the view
 * react to its OWN source, so it stays live at any nesting depth and re-renders just itself.
 */
export function useResourceChanges(source: PropertySource): void {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const sub = source.onChanged(() => bump());
    return () => sub.unsubscribe();
  }, [source]);
}
