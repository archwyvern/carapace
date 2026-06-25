import { createContext, useContext, type ReactNode } from "react";

/** Nesting depth of the current surface. 0 = the base panel; each boxed container increments it. */
const SurfaceDepthContext = createContext(0);

/** The two alternating box tones, present in every carapace theme: `surface` recesses, `surface-raised`
 *  lifts. Boxes flip between them by depth so each nesting level contrasts with its parent — which
 *  reads at any depth, unlike progressive shading that bottoms out in a near-black palette. */
const TONES = ["bg-surface", "bg-surface-raised"] as const;

/** The background tone + own depth for a container nested one level below the current surface. A box
 *  applies `bg` to itself and wraps its children in {@link SurfaceProvider} with `depth`, so the next
 *  nested box flips to the other tone. */
export function useNestedSurface(): { bg: string; depth: number } {
  const depth = useContext(SurfaceDepthContext) + 1;
  return { bg: depth % 2 === 1 ? TONES[0] : TONES[1], depth };
}

/** Provides a box's depth to its descendants so the next nested box alternates its surface tone. */
export function SurfaceProvider({ depth, children }: { depth: number; children: ReactNode }) {
  return <SurfaceDepthContext.Provider value={depth}>{children}</SurfaceDepthContext.Provider>;
}
