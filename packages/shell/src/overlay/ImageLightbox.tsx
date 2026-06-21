import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "../primitives/IconButton";
import { ChevronRightIcon, CloseIcon } from "../icons";

export interface LightboxImage {
  src: string;
  alt?: string;
  caption?: ReactNode;
}

export interface ImageLightboxProps {
  images: LightboxImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/** Fullscreen image viewer — arrow keys / on-screen buttons to page, Escape or scrim to close. */
export function ImageLightbox({ images, index, onIndexChange, onClose }: ImageLightboxProps) {
  const count = images.length;
  const cur = images[index];

  useEffect(() => {
    const go = (d: number) => onIndexChange(Math.min(count - 1, Math.max(0, index + d)));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, count, onIndexChange, onClose]);

  if (!cur) return null;
  const go = (d: number) => onIndexChange(Math.min(count - 1, Math.max(0, index + d)));

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-black/85 p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute right-3 top-3">
        <IconButton label="Close" icon={<CloseIcon />} onClick={(e) => { e.stopPropagation(); onClose(); }} />
      </div>
      {index > 0 && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <IconButton label="Previous" size="md" icon={<ChevronRightIcon className="rotate-180" />} onClick={(e) => { e.stopPropagation(); go(-1); }} />
        </div>
      )}
      {index < count - 1 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <IconButton label="Next" size="md" icon={<ChevronRightIcon />} onClick={(e) => { e.stopPropagation(); go(1); }} />
        </div>
      )}
      <img
        src={cur.src}
        alt={cur.alt ?? ""}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] max-w-[88vw] object-contain"
      />
      {(cur.caption || count > 1) && (
        <div className="mt-3 flex items-center gap-3 text-xs text-fg-mid" onClick={(e) => e.stopPropagation()}>
          {cur.caption && <span>{cur.caption}</span>}
          {count > 1 && <span className="tabular-nums">{index + 1} / {count}</span>}
        </div>
      )}
    </div>,
    document.body,
  );
}
