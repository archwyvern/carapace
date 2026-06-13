import { Resource } from "../Resource";

/**
 * A resource wrapping a plain-text payload. Base for the text-backed resources
 * (Shader, and — when ported — Json/Html/Css). Mirrors the engine's `Text`,
 * whose single field is `Content`.
 */
export class Text extends Resource {
  readonly content = this.prop.string("Content", "");
}

/** An HTML document resource — its `content` is markup. */
export class Html extends Text {}

/** A CSS stylesheet resource — its `content` is stylesheet text. */
export class Css extends Text {}

/** A JSON document resource — its `content` is JSON text. */
export class Json extends Text {}

/** A JavaScript source resource — its `content` is JS source. */
export class Javascript extends Text {}
