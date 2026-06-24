import { setiIconDefinitions, setiByExtension, setiByFileName, setiDefaultFile } from "./setiIconData";

/** A resolved file-type icon: a codepoint into the bundled Seti font, plus its colour. */
export interface FileIconSpec {
  code: number;
  color?: string;
}

/** An override target: an explicit spec, or a reference to a bundled Seti glyph by id
 *  (ids are discoverable via {@link setiIconDefinitions}) with an optional colour override. */
export type FileIconRef = FileIconSpec | { seti: string; color?: string };

export interface FileIconOverrides {
  /** Extension (leading dot optional, compound like "d.ts" allowed) -> icon. */
  extensions?: Record<string, FileIconRef>;
  /** Exact filename -> icon. Beats any extension match. */
  fileNames?: Record<string, FileIconRef>;
  /** Replace the fallback icon used for files matching nothing else. */
  default?: FileIconRef;
}

function defToSpec(defId: string | undefined): FileIconSpec | undefined {
  if (!defId) return undefined;
  const d = setiIconDefinitions[defId];
  return d ? { code: d.code, color: d.color } : undefined;
}

function refToSpec(ref: FileIconRef): FileIconSpec | undefined {
  if ("seti" in ref) {
    const d = setiIconDefinitions[ref.seti];
    return d ? { code: d.code, color: ref.color ?? d.color } : undefined;
  }
  return ref;
}

const stripDot = (ext: string) => ext.replace(/^\./, "").toLowerCase();

/**
 * Resolves a filename to a Seti file-type icon. Seti's curated extension/filename maps
 * (with its language layer flattened in at build time) form the base; consumers layer
 * their own associations on top via {@link register}. Lookup mirrors VSCode's icon
 * themes: exact filename, then longest matching extension, then a default — and at each
 * step an override beats the base.
 */
export class FileIconRegistry {
  private readonly extOverrides = new Map<string, FileIconSpec>();
  private readonly nameOverrides = new Map<string, FileIconSpec>();
  private defaultOverride: FileIconSpec | undefined;

  register(overrides: FileIconOverrides): void {
    for (const [ext, ref] of Object.entries(overrides.extensions ?? {})) {
      const spec = refToSpec(ref);
      if (spec) this.extOverrides.set(stripDot(ext), spec);
    }
    for (const [name, ref] of Object.entries(overrides.fileNames ?? {})) {
      const spec = refToSpec(ref);
      if (spec) this.nameOverrides.set(name.toLowerCase(), spec);
    }
    if (overrides.default) this.defaultOverride = refToSpec(overrides.default);
  }

  resolve(name: string): FileIconSpec | null {
    const lower = name.toLowerCase();
    const byName = this.nameOverrides.get(lower) ?? defToSpec(setiByFileName[lower]);
    if (byName) return byName;
    // Longest extension first: for "a.d.ts" try "d.ts" before "ts". Override beats base per level.
    const parts = lower.split(".");
    for (let i = 1; i < parts.length; i++) {
      const ext = parts.slice(i).join(".");
      const hit = this.extOverrides.get(ext) ?? defToSpec(setiByExtension[ext]);
      if (hit) return hit;
    }
    return this.defaultOverride ?? defToSpec(setiDefaultFile) ?? null;
  }
}

/** The process-wide default registry that FileExplorer and {@link FileTypeIcon} read from. */
const defaultRegistry = new FileIconRegistry();

/** Layer custom file-type associations onto the default icon system (e.g. engine-specific
 *  extensions). Effective everywhere the default registry is used. */
export function registerFileIcons(overrides: FileIconOverrides): void {
  defaultRegistry.register(overrides);
}

/** Resolve a filename to its icon spec via the default registry (null only if the default
 *  glyph is somehow missing). */
export function resolveFileIcon(name: string): FileIconSpec | null {
  return defaultRegistry.resolve(name);
}
