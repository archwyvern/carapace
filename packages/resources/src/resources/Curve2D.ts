import { Resource } from "../Resource";

/**
 * 2D Bezier curve. Engine type currently exposes no `[VascalProperty]` members --
 * data lives behind methods. This shell registers the type so file pickers and
 * round-trip parsing can recognize it; field-level editing will come when the
 * engine annotates Points/BakeInterval/ClosedLoop.
 */
export class Curve2D extends Resource {
}
