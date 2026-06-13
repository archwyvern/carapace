// Observable model
export { Observable, equal } from "./Observable";
export type { Subscription, Listener } from "./Observable";

// Resource base + field model
export {
  Resource,
  ExportMode,
  isFieldModified,
  countModifiedFields,
  resetField,
} from "./Resource";
export type { FieldKind, FieldInfo, GroupInfo, ExportModeValue } from "./Resource";

// Type registry
export {
  registerResourceClass,
  getResourceClass,
  hasResourceClass,
  instantiateResourceClass,
  isAbstractResourceClass,
  resourceTypeNames,
  getTypeIcon,
} from "./registry";
export type { ResourceClass, TypeIcon } from "./registry";

// Built-in registration
export { registerBuiltinResources } from "./builtins";

// Resource classes
export { Gradient } from "./resources/Gradient";
export type { GradientStop } from "./resources/Gradient";
export { Noise, FastNoiseLite } from "./resources/Noise";
export {
  Texture,
  Texture2D,
  CompressedTexture2D,
  GradientTexture1D,
  GradientTexture2D,
  NoiseTexture2D,
  CurveTexture,
  CurveXyzTexture,
} from "./resources/Texture";
export { Curve } from "./resources/Curve";
export { Curve2D } from "./resources/Curve2D";
export { Text, Html, Css, Json, Javascript } from "./resources/Text";
export { Shader, ShaderInclude } from "./resources/Shader";
export { Material, ShaderMaterial } from "./resources/Material";
export { AtlasTexture } from "./resources/AtlasTexture";
export { CanvasItemMaterial } from "./resources/CanvasItemMaterial";
export { ParticleProcessMaterial } from "./resources/ParticleProcessMaterial";
export { ColorPalette } from "./resources/ColorPalette";
export { SpriteFrames } from "./resources/SpriteFrames";
export { Animation, AnimationLibrary } from "./resources/Animation";
export { StyleBox, StyleBoxFlat, StyleBoxLine, StyleBoxTexture } from "./resources/StyleBox";
export { Font, FontFile, FontVariation, SystemFont } from "./resources/Font";
export { LabelSettings } from "./resources/LabelSettings";
export { Theme } from "./resources/Theme";
