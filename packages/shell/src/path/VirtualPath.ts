/**
 * A scheme-aware virtual path, e.g. "core://data/armour.png". Pure string algebra —
 * parse, join, walk, rename, tag — with NO filesystem IO. Resolving a scheme to a real
 * location is the filesystem provider's job (e.g. `createNodeFs({ mounts })`), not this
 * type's. carapace's equivalent of VS Code's `URI`; ported from the Hardcoded engine's
 * `VirtualPath` with the IO half (`ContentPaths` scheme backends) dropped.
 *
 * Immutable; every mutating method returns a new instance. Paths normalize on parse:
 * `\` → `/`, trailing slashes trimmed, `.`/`..` segments collapsed, and a `..` that
 * escapes the scheme root throws.
 */
export class VirtualPath {
  /** The normalized virtual path string. */
  readonly path: string;

  private constructor(path: string) {
    this.path = path;
  }

  /** Parse + normalize a virtual path. Requires a `scheme://` prefix. */
  static from(input: string): VirtualPath {
    if (input == null || input.trim() === "") {
      throw new Error("Virtual path must not be empty");
    }
    const delimiter = input.indexOf("://");
    if (delimiter < 1) {
      throw new Error(`Virtual path must start with a scheme (e.g. "core://"): "${input}"`);
    }
    const scheme = input.slice(0, delimiter);
    let rest = input.slice(delimiter + 3).replace(/\\/g, "/").replace(/\/+$/, "");
    if (rest.includes("..")) {
      rest = normalizeDotted(rest);
      if (rest.startsWith("..")) {
        throw new Error(`Virtual path escapes scheme root: "${input}"`);
      }
    }
    return new VirtualPath(rest.length > 0 ? `${scheme}://${rest}` : `${scheme}://`);
  }

  /** Parse without throwing — returns null on an invalid path. */
  static tryFrom(input: string): VirtualPath | null {
    try {
      return VirtualPath.from(input);
    } catch {
      return null;
    }
  }

  /** Wrap an already-normalized string, skipping the parse. Internal fast path. */
  private static wrap(path: string): VirtualPath {
    return new VirtualPath(path);
  }

  /** The scheme component (e.g. "core" from "core://data/file.png"). */
  get scheme(): string {
    const d = this.path.indexOf("://");
    return d > 0 ? this.path.slice(0, d) : "";
  }

  /** The path after the scheme, with any `#fragment` stripped (e.g. "data/file.png"). */
  get relativePath(): string {
    const d = this.path.indexOf("://");
    const rest = d >= 0 ? this.path.slice(d + 3) : this.path;
    const hash = rest.indexOf("#");
    return hash >= 0 ? rest.slice(0, hash) : rest;
  }

  /** The sub-resource fragment after `#`, or "" if none. */
  get fragment(): string {
    const hash = this.path.indexOf("#");
    return hash >= 0 ? this.path.slice(hash + 1) : "";
  }

  get hasFragment(): boolean {
    return this.path.includes("#");
  }

  /** The last path component (e.g. "armour.png" or "images"). Fragment stripped. */
  get name(): string {
    const trimmed = stripFragment(this.path);
    const slash = trimmed.lastIndexOf("/");
    return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  }

  /** The file extension including the dot (e.g. ".png"), or "" if none. */
  get extension(): string {
    return extname(stripFragment(this.path));
  }

  /** Filename without the final extension (e.g. "armour.n" from "armour.n.png"). */
  get fileNameWithoutExtension(): string {
    const n = this.name;
    const ext = extname(n);
    return ext ? n.slice(0, n.length - ext.length) : n;
  }

  /** Filename stem, without tags or extension (e.g. "armour" from "armour.n.rough.png"). */
  get fileNameWithoutTagsOrExtension(): string {
    const n = this.name;
    const dot = n.indexOf(".");
    return dot > 0 ? n.slice(0, dot) : n;
  }

  /** Filename tags between stem and extension, each with a leading dot
   *  (e.g. [".n", ".rough"] from "armour.n.rough.png"). Empty if none. */
  get tags(): string[] {
    const parts = this.name.split(".");
    if (parts.length <= 2) return [];
    const tags: string[] = [];
    for (let i = 1; i < parts.length - 1; i++) tags.push("." + parts[i]!);
    return tags;
  }

  hasTag(tag: string): boolean {
    const lower = tag.toLowerCase();
    return this.tags.some((t) => t.toLowerCase() === lower);
  }

  /** A new path with a tag appended before the extension. */
  withTag(tag: string): VirtualPath {
    const n = this.name;
    const extDot = n.lastIndexOf(".");
    if (extDot <= 0) return VirtualPath.wrap(this.path + tag);
    return VirtualPath.wrap(this.replaceLastSegment(n.slice(0, extDot) + tag + n.slice(extDot)));
  }

  /** A new path with all tags removed. */
  withoutTags(): VirtualPath {
    if (this.tags.length === 0) return this;
    return VirtualPath.wrap(this.replaceLastSegment(this.fileNameWithoutTagsOrExtension + this.extension));
  }

  /** A new path with a specific tag removed, keeping the rest. */
  withoutTag(tag: string): VirtualPath {
    const parts = this.name.split(".");
    if (parts.length <= 2) return this;
    const lower = tag.toLowerCase();
    const kept: string[] = [parts[0]!];
    for (let i = 1; i < parts.length - 1; i++) {
      if (("." + parts[i]!).toLowerCase() !== lower) kept.push(parts[i]!);
    }
    kept.push(parts[parts.length - 1]!);
    return VirtualPath.wrap(this.replaceLastSegment(kept.join(".")));
  }

  /** A new path with the extension changed. */
  changeExtension(newExtension: string): VirtualPath {
    const ext = this.extension;
    if (ext.length === 0) return VirtualPath.wrap(this.path + newExtension);
    return VirtualPath.wrap(this.path.slice(0, this.path.length - ext.length) + newExtension);
  }

  /** The parent path. Walks up one segment; stops at the scheme root (e.g. "core://"). */
  get parent(): VirtualPath {
    const schemeEnd = this.path.indexOf("://");
    if (schemeEnd < 0) {
      const slash = this.path.lastIndexOf("/");
      return slash > 0 ? VirtualPath.wrap(this.path.slice(0, slash)) : this;
    }
    const afterScheme = schemeEnd + 3;
    const slash = this.path.lastIndexOf("/");
    if (slash < afterScheme) return VirtualPath.wrap(this.path.slice(0, afterScheme));
    return VirtualPath.wrap(this.path.slice(0, slash));
  }

  /**
   * Resolve `relative` against this path using web-URL semantics: an absolute virtual
   * path (`scheme://`) is returned verbatim; a root-relative path (`/x`) re-anchors at
   * this scheme's root; otherwise it resolves against this path's `parent`.
   */
  resolveRelative(relative: string): VirtualPath {
    if (relative == null || relative.trim() === "") {
      throw new Error("relative path must not be empty");
    }
    if (relative.includes("://")) return VirtualPath.from(relative);
    if (relative.startsWith("/")) return VirtualPath.from(`${this.scheme}://${relative.replace(/^\/+/, "")}`);
    const parent = this.parent.path;
    const sep = parent.endsWith("://") ? "" : "/";
    return VirtualPath.from(parent + sep + relative);
  }

  /** Append a child segment. */
  combine(child: string): VirtualPath {
    if (child == null || child.trim() === "") {
      throw new Error("child must not be empty");
    }
    if (child.includes("..")) {
      throw new Error(`Child must not contain "..": "${child}"`);
    }
    return VirtualPath.wrap(this.join(child.replace(/\/+$/, "")));
  }

  private join(relative: string): string {
    return this.path.endsWith("://") ? this.path + relative : `${this.path}/${relative}`;
  }

  private replaceLastSegment(newName: string): string {
    const slash = this.path.lastIndexOf("/");
    const base = slash >= 0 ? this.path.slice(0, slash + 1) : "";
    return base + newName;
  }

  equals(other: VirtualPath): boolean {
    return this.path.toLowerCase() === other.path.toLowerCase();
  }

  toString(): string {
    return this.path;
  }

  // ── String-form static helpers (no need to construct first) ──

  static getScheme(path: string): string {
    return VirtualPath.from(path).scheme;
  }
  static getRelativePath(path: string): string {
    return VirtualPath.from(path).relativePath;
  }
  static getName(path: string): string {
    return VirtualPath.from(path).name;
  }
  static getExtension(path: string): string {
    return VirtualPath.from(path).extension;
  }
  static getParent(path: string): VirtualPath {
    return VirtualPath.from(path).parent;
  }
  static combine(path: string, child: string): VirtualPath {
    return VirtualPath.from(path).combine(child);
  }
  static changeExtension(path: string, newExtension: string): VirtualPath {
    return VirtualPath.from(path).changeExtension(newExtension);
  }
  static getTags(path: string): string[] {
    return VirtualPath.from(path).tags;
  }
}

function stripFragment(p: string): string {
  const hash = p.indexOf("#");
  return hash >= 0 ? p.slice(0, hash) : p;
}

/** Extension incl. dot, or "" — like Node's path.extname (a leading dot isn't an ext). */
function extname(p: string): string {
  const base = p.slice(p.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot) : "";
}

/** Collapse `.`/`..` segments. Returns a string starting with ".." when a `..` escapes. */
function normalizeDotted(path: string): string {
  const segments = path.split("/");
  const stack: string[] = [];
  for (const seg of segments) {
    if (seg === ".." && stack.length > 0) stack.pop();
    else if (seg === "..") return "../" + segments.join("/");
    else if (seg !== ".") stack.push(seg);
  }
  return stack.join("/");
}
