import { registerResourceClass } from "./registry";
import { Gradient } from "./resources/Gradient";
import { Noise, FastNoiseLite } from "./resources/Noise";
import {
  Texture, Texture2D, CompressedTexture2D,
  GradientTexture1D, GradientTexture2D, NoiseTexture2D,
  CurveTexture, CurveXyzTexture,
} from "./resources/Texture";
import { Curve } from "./resources/Curve";
import { Curve2D } from "./resources/Curve2D";
import { Text, Html, Css, Json, Javascript } from "./resources/Text";
import { Shader, ShaderInclude } from "./resources/Shader";
import { Material, ShaderMaterial } from "./resources/Material";
import { AtlasTexture } from "./resources/AtlasTexture";
import { CanvasItemMaterial } from "./resources/CanvasItemMaterial";
import { ParticleProcessMaterial } from "./resources/ParticleProcessMaterial";
import { ColorPalette } from "./resources/ColorPalette";
import { SpriteFrames } from "./resources/SpriteFrames";
import { Animation, AnimationLibrary } from "./resources/Animation";
import { StyleBox, StyleBoxFlat, StyleBoxLine, StyleBoxTexture } from "./resources/StyleBox";
import { Font, FontFile, FontVariation, SystemFont } from "./resources/Font";
import { LabelSettings } from "./resources/LabelSettings";
import { Theme } from "./resources/Theme";

let registered = false;

/**
 * Register the built-in resource classes under their serialized type names.
 * Idempotent — safe to call multiple times. Currently the gradient / noise /
 * texture cluster; the rest of the hierarchy is added as it is ported over.
 */
export function registerBuiltinResources(): void {
  if (registered) return;
  registered = true;

  registerResourceClass("Gradient", Gradient, { icon: { codicon: "symbol-color", color: "#E29876" }, view: "gradient" });
  registerResourceClass("Noise", Noise, { icon: { codicon: "symbol-constant", color: "#8CB4C4" }, abstract: true });
  registerResourceClass("FastNoiseLite", FastNoiseLite);
  registerResourceClass("Texture", Texture, { icon: { codicon: "symbol-color", color: "#7ABAD4" }, abstract: true });
  registerResourceClass("Texture2D", Texture2D, { abstract: true });
  registerResourceClass("CompressedTexture2D", CompressedTexture2D);
  registerResourceClass("GradientTexture1D", GradientTexture1D);
  registerResourceClass("GradientTexture2D", GradientTexture2D);
  registerResourceClass("NoiseTexture2D", NoiseTexture2D);
  registerResourceClass("CurveTexture", CurveTexture);
  registerResourceClass("CurveXyzTexture", CurveXyzTexture);
  registerResourceClass("Curve", Curve, { icon: { codicon: "symbol-operator", color: "#C786C8" }, view: "curve" });
  registerResourceClass("Curve2D", Curve2D, { icon: { codicon: "graph-line", color: "#C786C8" } });
  registerResourceClass("Text", Text, { icon: { codicon: "symbol-text", color: "#7ABAD4" } });
  registerResourceClass("Shader", Shader, { icon: { codicon: "file-code", color: "#A074C4" } });
  registerResourceClass("Html", Html, { icon: { codicon: "code", color: "#E29876" } });
  registerResourceClass("Css", Css, { icon: { codicon: "symbol-color", color: "#48A0C7" } });
  registerResourceClass("ShaderInclude", ShaderInclude, { icon: { codicon: "file-code", color: "#8CB4C4" } });
  registerResourceClass("Json", Json, { icon: { codicon: "json", color: "#e5ba7d" } });
  registerResourceClass("Javascript", Javascript, { icon: { codicon: "file-code", color: "#e5ba7d" } });

  registerResourceClass("AtlasTexture", AtlasTexture, { icon: { codicon: "symbol-array", color: "#7ABAD4" } });
  registerResourceClass("Material", Material, { abstract: true });
  registerResourceClass("ShaderMaterial", ShaderMaterial);
  registerResourceClass("CanvasItemMaterial", CanvasItemMaterial, { icon: { codicon: "paintcan", color: "#E29876" } });
  registerResourceClass("ParticleProcessMaterial", ParticleProcessMaterial, { icon: { codicon: "sparkle", color: "#E29876" } });
  registerResourceClass("ColorPalette", ColorPalette, { icon: { codicon: "symbol-color", color: "#E29876" } });
  registerResourceClass("SpriteFrames", SpriteFrames, { icon: { codicon: "play", color: "#7ABAD4" } });
  registerResourceClass("Animation", Animation, { icon: { codicon: "play", color: "#C786C8" } });
  registerResourceClass("AnimationLibrary", AnimationLibrary, { icon: { codicon: "library", color: "#C786C8" } });
  registerResourceClass("StyleBox", StyleBox, { icon: { codicon: "symbol-namespace", color: "#8CB4C4" }, abstract: true });
  registerResourceClass("StyleBoxFlat", StyleBoxFlat);
  registerResourceClass("StyleBoxLine", StyleBoxLine);
  registerResourceClass("StyleBoxTexture", StyleBoxTexture);
  registerResourceClass("Font", Font, { icon: { codicon: "text-size", color: "#A074C4" }, abstract: true });
  registerResourceClass("FontFile", FontFile);
  registerResourceClass("FontVariation", FontVariation);
  registerResourceClass("SystemFont", SystemFont);
  registerResourceClass("LabelSettings", LabelSettings, { icon: { codicon: "symbol-text", color: "#A074C4" } });
  registerResourceClass("Theme", Theme, { icon: { codicon: "symbol-color", color: "#8CB4C4" } });
}
