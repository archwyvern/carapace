/**
 * Order in which Euler-axis rotations are applied. TS mirror of `Primitives.EulerOrder`.
 * Rotation order matters: X-then-Y differs from Y-then-X.
 */
export enum EulerOrder {
  /** X, then Y, then Z. */
  Xyz = 0,
  /** X, then Z, then Y. */
  Xzy = 1,
  /** Y, then X, then Z. */
  Yxz = 2,
  /** Y, then Z, then X. */
  Yzx = 3,
  /** Z, then X, then Y. */
  Zxy = 4,
  /** Z, then Y, then X. */
  Zyx = 5,
}
