import type { CSSProperties } from "react";
import { resolveFileIcon } from "./registry";

export interface FileTypeIconProps {
  /** Filename (e.g. "main.ts"); its name/extension selects the glyph. */
  name: string;
  /** Folders render nothing — the tree draws its own twistie. Default false. */
  isDir?: boolean;
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
 * Returns null for directories (and for the degenerate no-default case).
 */
export function FileTypeIcon({ name, isDir = false, size, className, style }: FileTypeIconProps) {
  if (isDir) return null;
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
