import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { rgbToHex } from "./colorMath";
import { ColorPicker } from "./ColorPicker";
import type { ColorPickerProps } from "./ColorPicker";

// Inline SVG checkerboard (data URI) for alpha awareness — zero asset deps.
const CHECKERBOARD_URI =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'><rect width='6' height='6' fill='%23555'/><rect x='6' y='6' width='6' height='6' fill='%23555'/><rect x='6' width='6' height='6' fill='%23999'/><rect y='6' width='6' height='6' fill='%23999'/></svg>\")";

/** A colour swatch that opens the ColorPicker in a positioned popover. */
export function ColorPickerButton({ value, hasAlpha, onChange, label }: ColorPickerProps & { label?: string }) {
  const [open, setOpen] = useState(false);
  const swatchRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  const r = Math.min(1, value[0] ?? 0);
  const g = Math.min(1, value[1] ?? 0);
  const b = Math.min(1, value[2] ?? 0);
  const a = hasAlpha ? Math.min(1, value[3] ?? 1) : 1;
  const hex = rgbToHex(r, g, b);
  const showCheckerboard = a < 1;
  const rgbaCss = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;

  useLayoutEffect(() => {
    if (!open || !swatchRef.current) return;
    const rect = swatchRef.current.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 4;
    const popupWidth = 280;
    const popupHeight = 500;
    if (left + popupWidth > window.innerWidth) left = Math.max(4, window.innerWidth - popupWidth - 4);
    if (top + popupHeight > window.innerHeight) top = Math.max(4, rect.top - popupHeight - 4);
    setPopupPos({ left, top });
  }, [open]);

  const swatch = (
    <div
      ref={swatchRef}
      role="button"
      aria-label={label ? `${label} colour` : "Pick colour"}
      onClick={() => setOpen(!open)}
      title={hex.toUpperCase()}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 22,
        cursor: "pointer",
        border: "1px solid var(--color-border)",
        backgroundImage: showCheckerboard ? CHECKERBOARD_URI : undefined,
        backgroundColor: showCheckerboard ? undefined : hex,
        position: "relative",
      }}
    >
      {showCheckerboard && <div style={{ position: "absolute", inset: 0, backgroundColor: rgbaCss }} />}
    </div>
  );

  const popup =
    open &&
    createPortal(
      <>
        <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setOpen(false)} />
        <div className="shadow-lg" style={{ position: "fixed", left: popupPos.left, top: popupPos.top, zIndex: 101 }}>
          <ColorPicker value={value} hasAlpha={hasAlpha} onChange={onChange} />
        </div>
      </>,
      document.body,
    );

  if (label) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-fg-mid">{label}</span>
        <div style={{ height: 22 }}>{swatch}</div>
        {popup}
      </div>
    );
  }

  return (
    <>
      {swatch}
      {popup}
    </>
  );
}
