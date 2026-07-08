import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { cx } from "../cx";

export interface ImageViewInfo {
  /** Natural pixel dimensions (0x0 until the image decodes). */
  width: number;
  height: number;
  /** Effective scale: 1 = 100%. In fit mode this is the computed fit scale. */
  zoom: number;
}

export interface ImageViewProps {
  /** Encoded image bytes; the object URL is managed internally. */
  bytes: Uint8Array;
  mimeType: string;
  /** Fired on decode and on every zoom change — surface it in a status bar. */
  onInfo?: (info: ImageViewInfo) => void;
  className?: string;
  /** Accessible/alt name for the image (e.g. the filename). */
  alt?: string;
}

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 32;

/**
 * Read-only image viewer for editor tabs (the raster sibling of CodeEditor), VS Code
 * conventions: checkerboard backing, fit-to-view on open (never upscaled past 100%),
 * ctrl/cmd+wheel zooms around the cursor, drag pans when the image overflows, and
 * double-click toggles fit <-> 100%. No fetching and no chrome — the host supplies
 * bytes and renders any zoom/size readout itself via `onInfo`.
 */
export function ImageView({ bytes, mimeType, onInfo, className, alt = "" }: ImageViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  // "fit" recomputes against the container on every layout; a number is an explicit scale.
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

  // Blob URL lifecycle: one per bytes value, revoked on swap/unmount.
  const url = useMemo(() => URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeType })), [bytes, mimeType]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  // Track the container so fit mode follows pane resizes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setViewSize({ width: el.clientWidth, height: el.clientHeight }));
    ro.observe(el);
    setViewSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Fit scale: whole image visible, small images shown at 100% (VS Code). An unmeasured
  // container (first paint, headless tests) falls back to 100%.
  const fitZoom = useMemo(() => {
    if (!natural.width || !natural.height || !viewSize.width || !viewSize.height) return 1;
    return Math.min(1, viewSize.width / natural.width, viewSize.height / natural.height);
  }, [natural, viewSize]);
  const effectiveZoom = zoom === "fit" ? fitZoom : zoom;

  useEffect(() => {
    onInfo?.({ width: natural.width, height: natural.height, zoom: effectiveZoom });
  }, [natural, effectiveZoom, onInfo]);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  // Ctrl/cmd+wheel zooms around the cursor: keep the image point under the pointer fixed
  // by shifting scroll proportionally to the scale change.
  const handleWheel = useCallback((e: ReactWheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const el = containerRef.current;
    const prev = zoom === "fit" ? fitZoom : zoom;
    const next = clampZoom(prev * Math.pow(2, -e.deltaY / 400));
    if (next === prev) return;
    setZoom(next);
    if (el) {
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left + el.scrollLeft;
      const py = e.clientY - rect.top + el.scrollTop;
      const scale = next / prev;
      // After render the content is scaled; adjust so the cursor-anchored point stays put.
      requestAnimationFrame(() => {
        el.scrollLeft = px * scale - (e.clientX - rect.left);
        el.scrollTop = py * scale - (e.clientY - rect.top);
      });
    }
  }, [zoom, fitZoom]);

  const handleDoubleClick = useCallback(() => {
    setZoom((z) => (z === "fit" ? 1 : "fit"));
  }, []);

  // Drag-pan: scroll the container while the pointer is held (only meaningful when the
  // scaled image overflows; otherwise scroll deltas are no-ops).
  const pan = useRef<{ x: number; y: number } | null>(null);
  const handlePointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    pan.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);
  const handlePointerMove = useCallback((e: ReactPointerEvent) => {
    const el = containerRef.current;
    if (!pan.current || !el) return;
    el.scrollLeft -= e.clientX - pan.current.x;
    el.scrollTop -= e.clientY - pan.current.y;
    pan.current = { x: e.clientX, y: e.clientY };
  }, []);
  const handlePointerUp = useCallback(() => {
    pan.current = null;
  }, []);

  const handleLoad = useCallback((e: ReactMouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNatural({ width: img.naturalWidth, height: img.naturalHeight });
  }, []);

  const w = natural.width * effectiveZoom;
  const h = natural.height * effectiveZoom;

  return (
    <div
      ref={containerRef}
      data-imageview=""
      className={cx("grid h-full w-full place-items-center overflow-auto select-none", className)}
      // VS Code's checkerboard: two-tone squares, low-contrast in either theme.
      style={{
        backgroundImage:
          "conic-gradient(rgba(128,128,128,0.14) 90deg, transparent 90deg 180deg, rgba(128,128,128,0.14) 180deg 270deg, transparent 270deg)",
        backgroundSize: "16px 16px",
      }}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        src={url}
        alt={alt}
        draggable={false}
        onLoad={handleLoad}
        className="max-w-none"
        style={natural.width ? { width: w, height: h, imageRendering: effectiveZoom >= 3 ? "pixelated" : "auto" } : undefined}
      />
    </div>
  );
}
