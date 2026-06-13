import { Resource } from "../Resource";
import type { Font } from "./Font";

/** Text-rendering settings for Label nodes. Mirrors `Archwyvern.Hardcoded.LabelSettings`. */
export class LabelSettings extends Resource {
  readonly lineSpacing = this.prop.float("LineSpacing", 3);
  readonly paragraphSpacing = this.prop.float("ParagraphSpacing", 0);

  readonly font = this.prop.resource<Font | null>("Font", "Font", null);
  readonly fontSize = this.prop.int("FontSize", 16, { min: 1 });
  readonly fontColor = this.prop.color("FontColor", 1, 1, 1, 1);

  readonly outlineSize = this.prop.int("OutlineSize", 0, { min: 0 });
  readonly outlineColor = this.prop.color("OutlineColor", 1, 1, 1, 1);

  readonly shadowSize = this.prop.int("ShadowSize", 1, { min: 0 });
  readonly shadowColor = this.prop.color("ShadowColor", 0, 0, 0, 0);
  readonly shadowOffset = this.prop.vector2("ShadowOffset", 1, 1);

  readonly stackedOutlineCount = this.prop.int("StackedOutlineCount", 0, { min: 0 });
  readonly stackedShadowCount = this.prop.int("StackedShadowCount", 0, { min: 0 });
}
