import type { ReactNode } from "react";
import { useNestedSurface, SurfaceProvider } from "./Surface";

export interface StructCardProps {
  /** Header label — typically an array index or a struct name. */
  title: ReactNode;
  /** Right-aligned header content (e.g. a delete button). */
  trailing?: ReactNode;
  children: ReactNode;
}

/**
 * A lightweight element card for editing a non-resource struct in place — a plain bordered box
 * with a quiet header (title + optional trailing action) over a body. Distinct from the accent
 * sub-inspector framing used for nested {@link https://godotengine.org Resource}s: a struct
 * (a CurvePoint, a keyframe, a Vector2 tuple) is data, not its own object, so it reads as a row
 * in a list rather than a thing you assign/clear. Used by the inspector's struct-array rendering
 * and reusable directly for bespoke array editors.
 */
export function StructCard({ title, trailing, children }: StructCardProps) {
  const { bg, depth } = useNestedSurface();
  return (
    <div className={`overflow-hidden rounded-control border border-border ${bg}`}>
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1">
        <span className="min-w-0 flex-1 truncate text-base text-fg-mid">{title}</span>
        {trailing}
      </div>
      <SurfaceProvider depth={depth}>{children}</SurfaceProvider>
    </div>
  );
}
