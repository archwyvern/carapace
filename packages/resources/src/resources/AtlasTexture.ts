import { Texture2D } from "./Texture";

export class AtlasTexture extends Texture2D {
  readonly atlas = this.prop.resource<Texture2D | null>("Atlas", "Texture2D", null);
  readonly region = this.prop.vector4("Region", 0, 0, 0, 0);
  readonly margin = this.prop.vector4("Margin", 0, 0, 0, 0);
  readonly filterClip = this.prop.bool("FilterClip", false);
}
