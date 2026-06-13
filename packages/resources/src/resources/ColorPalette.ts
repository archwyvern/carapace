import { Resource } from "../Resource";

export class ColorPalette extends Resource {
  readonly colors = this.prop.arrayColor("Colors", []);
}
