import { Resource } from "../Resource";

/**
 * Animation tracks (Position2D, Rotation, Value, Bezier, Audio, etc.). Engine
 * data is method-driven; tracks will be surfaced through `virtualFields()` once
 * the engine exposes them as serializable structures.
 */
export class Animation extends Resource {
}

export class AnimationLibrary extends Resource {
}
