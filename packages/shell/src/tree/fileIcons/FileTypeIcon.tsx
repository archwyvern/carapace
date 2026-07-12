import type { CSSProperties } from "react";
import { resolveFileIcon } from "./registry";

export interface FileTypeIconProps {
  /** Filename (e.g. "main.ts"); its name/extension selects the glyph. */
  name: string;
  /** Glyph size in px. Omit to inherit the CSS default (1.5em of the surrounding text, matching
   *  VSCode's Seti theme). Pass a px value only when a specific fixed size is needed. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const ICON_CLASS = "carapace-file-icon";

/**
 * Renders the Seti file-type glyph for a filename, resolved through the default
 * {@link FileIconRegistry}. Requires the font: `@import "@carapace/shell/seti.css"`.
 * Returns null when no glyph matches the name. Directories have no file-type glyph —
 * the caller decides what (if anything) to render for them.
 */
export function FileTypeIcon({ name, size, className, style }: FileTypeIconProps) {
  const spec = resolveFileIcon(name);
  if (!spec) return null;
  return (
    <span
      aria-hidden
      className={className ? `${ICON_CLASS} ${className}` : ICON_CLASS}
      style={{ color: spec.color, ...(size === undefined ? {} : { fontSize: size }), ...style }}
    >
      {String.fromCodePoint(spec.code)}
    </span>
  );
}
