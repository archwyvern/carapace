import { Resource } from "../Resource";

const RASTER_MODES = ["Grayscale", "Lcd", "LcdV", "Mono"];
const HINTING = ["None", "Light", "Normal"];
const SUBPIXEL_POSITIONING = ["Disabled", "Auto", "OneHalf", "OneQuarter"];

/** Base font resource. Concrete kinds: FontFile, FontVariation, SystemFont. */
export class Font extends Resource {
  readonly defaultRasterMode = this.prop.enum("DefaultRasterMode", "Grayscale", RASTER_MODES);
  readonly defaultHinting = this.prop.enum("DefaultHinting", "Light", HINTING);
  readonly defaultSubpixelPositioning = this.prop.enum("DefaultSubpixelPositioning", "Auto", SUBPIXEL_POSITIONING);
}

/** Font loaded from a `.ttf`/`.otf` file. Engine doesn't [VascalProperty]-annotate Data/FaceIndex yet. */
export class FontFile extends Font {
}

/** Variation of a base font (axis values, synthetic styling). */
export class FontVariation extends Font {
}

/** Font sourced from the OS by family name. */
export class SystemFont extends Font {
}
