import { Resource } from "../Resource";
import type { Font } from "./Font";

/**
 * UI theme aggregating colours, constants, fonts, font sizes, icons, and style
 * boxes. The maps live in `themeItems` until the engine annotates them as
 * `[VirtualExport]` -- when that lands, wire them through `virtualFields()`.
 */
export class Theme extends Resource {
  readonly defaultBaseScale = this.prop.float("DefaultBaseScale", 1);
  readonly defaultFont = this.prop.resource<Font | null>("DefaultFont", "Font", null);
  readonly defaultFontSize = this.prop.int("DefaultFontSize", -1);
}
