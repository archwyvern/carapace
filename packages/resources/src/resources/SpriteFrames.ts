import { Resource } from "../Resource";

/**
 * Named sprite-animation collection. Engine data is method-driven; this shell
 * exists for type-name registration. Animation list will be wired through
 * `virtualFields()` once the engine annotates the storage.
 */
export class SpriteFrames extends Resource {
}
