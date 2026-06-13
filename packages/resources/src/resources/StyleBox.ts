import { Resource } from "../Resource";
import { Texture2D } from "./Texture";

const AXIS_STRETCH_MODES = ["Stretch", "Tile", "TileFit"];

/** Base class for visual style boxes (UI panel/border/shadow primitives). */
export class StyleBox extends Resource {
}

/**
 * Flat-coloured rectangle with optional border, rounded corners, shadow, and
 * anti-aliasing. Mirrors `Archwyvern.Hardcoded.StyleBoxFlat`.
 */
export class StyleBoxFlat extends StyleBox {
  readonly bgColor = this.prop.color("BgColor", 0.6, 0.6, 0.6, 1);
  readonly drawCenter = this.prop.bool("DrawCenter", true);
  readonly skew = this.prop.vector2("Skew", 0, 0);

  readonly borderWidthLeft = this.prop.int("BorderWidthLeft", 0);
  readonly borderWidthTop = this.prop.int("BorderWidthTop", 0);
  readonly borderWidthRight = this.prop.int("BorderWidthRight", 0);
  readonly borderWidthBottom = this.prop.int("BorderWidthBottom", 0);
  readonly borderColor = this.prop.color("BorderColor", 0.8, 0.8, 0.8, 1);
  readonly borderBlend = this.prop.bool("BorderBlend", false);

  readonly cornerRadiusTopLeft = this.prop.int("CornerRadiusTopLeft", 0);
  readonly cornerRadiusTopRight = this.prop.int("CornerRadiusTopRight", 0);
  readonly cornerRadiusBottomRight = this.prop.int("CornerRadiusBottomRight", 0);
  readonly cornerRadiusBottomLeft = this.prop.int("CornerRadiusBottomLeft", 0);
  readonly cornerDetail = this.prop.int("CornerDetail", 8, { min: 1, max: 32 });

  readonly expandMarginLeft = this.prop.float("ExpandMarginLeft", 0);
  readonly expandMarginTop = this.prop.float("ExpandMarginTop", 0);
  readonly expandMarginRight = this.prop.float("ExpandMarginRight", 0);
  readonly expandMarginBottom = this.prop.float("ExpandMarginBottom", 0);

  readonly shadowColor = this.prop.color("ShadowColor", 0, 0, 0, 0.6);
  readonly shadowSize = this.prop.int("ShadowSize", 0);
  readonly shadowOffset = this.prop.vector2("ShadowOffset", 0, 0);

  readonly antiAliasing = this.prop.bool("AntiAliasing", true);
  readonly antiAliasingSize = this.prop.float("AntiAliasingSize", 1);
}

/** Single-line style box (horizontal or vertical separator). */
export class StyleBoxLine extends StyleBox {
  readonly color = this.prop.color("Color", 0, 0, 0, 1);
  readonly growBegin = this.prop.float("GrowBegin", 1);
  readonly growEnd = this.prop.float("GrowEnd", 1);
  readonly thickness = this.prop.int("Thickness", 1, { min: 0 });
  readonly vertical = this.prop.bool("Vertical", false);
}

/** Nine-patch sliced texture style box. */
export class StyleBoxTexture extends StyleBox {
  readonly texture = this.prop.resource<Texture2D | null>("Texture", "Texture2D", null);
  readonly textureMarginLeft = this.prop.float("TextureMarginLeft", 0);
  readonly textureMarginTop = this.prop.float("TextureMarginTop", 0);
  readonly textureMarginRight = this.prop.float("TextureMarginRight", 0);
  readonly textureMarginBottom = this.prop.float("TextureMarginBottom", 0);
  readonly expandMarginLeft = this.prop.float("ExpandMarginLeft", 0);
  readonly expandMarginTop = this.prop.float("ExpandMarginTop", 0);
  readonly expandMarginRight = this.prop.float("ExpandMarginRight", 0);
  readonly expandMarginBottom = this.prop.float("ExpandMarginBottom", 0);
  readonly axisStretchHorizontal = this.prop.enum("AxisStretchHorizontal", "Stretch", AXIS_STRETCH_MODES);
  readonly axisStretchVertical = this.prop.enum("AxisStretchVertical", "Stretch", AXIS_STRETCH_MODES);
  readonly regionRect = this.prop.vector4("RegionRect", 0, 0, 0, 0);
  readonly modulateColor = this.prop.color("ModulateColor", 1, 1, 1, 1);
  readonly drawCenter = this.prop.bool("DrawCenter", true);
}
