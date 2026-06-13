// Random shader library -- deterministic hashing, range-mapped random, direction/sampling utilities.
// Hash functions based on Dave Hoskins (https://www.shadertoy.com/view/4djSRW).
// Depends on global seed builtins: _consumeSeed(), _global_seed.

// Placeholder seed system -- replaced by engine runtime when embedded.
var<private> _global_seed: i32 = 0;
fn _consumeSeed() -> i32 {
    _global_seed += 1;
    return _global_seed;
}

// ============================================================================
// Hash functions -- deterministic pseudorandom from position. All outputs in [0, 1].
// Naming: hashNM = N input components -> M output components.
// ============================================================================

// -- 1 input component --

fn hash11(p: f32) -> f32 {
    var v = fract(p * 0.1031);
    v *= v + 33.33;
    v *= v + v;
    return fract(v);
}

fn hash12(p: f32) -> vec2f {
    var p3 = fract(vec3f(p, p, p) * vec3f(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

fn hash13(p: f32) -> vec3f {
    var p3 = fract(vec3f(p, p, p) * vec3f(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}

fn hash14(p: f32) -> vec4f {
    var p4 = fract(vec4f(p, p, p, p) * vec4f(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

// -- 2 input components --

fn hash21(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn hash22(p: vec2f) -> vec2f {
    var p3 = fract(vec3f(p.xyx) * vec3f(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

fn hash23(p: vec2f) -> vec3f {
    var p3 = fract(vec3f(p.xyx) * vec3f(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}

fn hash24(p: vec2f) -> vec4f {
    var p4 = fract(vec4f(p.xyxy) * vec4f(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

// -- 3 input components --

fn hash31(p: vec3f) -> f32 {
    var v = fract(p * 0.1031);
    v += dot(v, v.zyx + 31.32);
    return fract((v.x + v.y) * v.z);
}

fn hash32(p: vec3f) -> vec2f {
    var v = fract(p * vec3f(0.1031, 0.1030, 0.0973));
    v += dot(v, v.yxz + 33.33);
    return fract((v.xx + v.yz) * v.zy);
}

fn hash33(p: vec3f) -> vec3f {
    var v = fract(p * vec3f(0.1031, 0.1030, 0.0973));
    v += dot(v, v.yxz + 33.33);
    return fract((v.xxy + v.yxx) * v.zyx);
}

fn hash34(p: vec3f) -> vec4f {
    var p4 = fract(vec4f(p.xyzx) * vec4f(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

// -- 4 input components --

fn hash41(p: vec4f) -> f32 {
    var v = fract(p * vec4f(0.1031, 0.1030, 0.0973, 0.1099));
    v += dot(v, v.wzxy + 33.33);
    return fract((v.x + v.y) * (v.z + v.w));
}

fn hash42(p: vec4f) -> vec2f {
    var v = fract(p * vec4f(0.1031, 0.1030, 0.0973, 0.1099));
    v += dot(v, v.wzxy + 33.33);
    return fract((v.xx + v.yz) * v.zw);
}

fn hash43(p: vec4f) -> vec3f {
    var v = fract(p * vec4f(0.1031, 0.1030, 0.0973, 0.1099));
    v += dot(v, v.wzxy + 33.33);
    return fract((v.xxy + v.yzz) * v.zww);
}

fn hash44(p: vec4f) -> vec4f {
    var v = fract(p * vec4f(0.1031, 0.1030, 0.0973, 0.1099));
    v += dot(v, v.wzxy + 33.33);
    return fract((v.xxyz + v.yzzw) * v.zywx);
}

// ============================================================================
// Range-mapped random -- random value in [min_val, max_val].
// ============================================================================

// -- float seed overloads --

fn random_range_f(min_val: f32, max_val: f32, seed: f32) -> f32 {
    return mix(min_val, max_val, hash11(seed));
}

fn random_range_v2(min_val: vec2f, max_val: vec2f, seed: f32) -> vec2f {
    return mix(min_val, max_val, hash12(seed));
}

fn random_range_v3(min_val: vec3f, max_val: vec3f, seed: f32) -> vec3f {
    return mix(min_val, max_val, hash13(seed));
}

fn random_range_v4(min_val: vec4f, max_val: vec4f, seed: f32) -> vec4f {
    return mix(min_val, max_val, hash14(seed));
}

// -- int seed overloads --

fn random_range_f_i(min_val: f32, max_val: f32, seed: i32) -> f32 {
    return mix(min_val, max_val, hash11(f32(seed)));
}

fn random_range_v2_i(min_val: vec2f, max_val: vec2f, seed: i32) -> vec2f {
    return mix(min_val, max_val, hash12(f32(seed)));
}

fn random_range_v3_i(min_val: vec3f, max_val: vec3f, seed: i32) -> vec3f {
    return mix(min_val, max_val, hash13(f32(seed)));
}

fn random_range_v4_i(min_val: vec4f, max_val: vec4f, seed: i32) -> vec4f {
    return mix(min_val, max_val, hash14(f32(seed)));
}

// -- seedless overloads (consume global seed) --

fn random_range_f_auto(min_val: f32, max_val: f32) -> f32 {
    return mix(min_val, max_val, hash11(f32(_consumeSeed())));
}

fn random_range_v2_auto(min_val: vec2f, max_val: vec2f) -> vec2f {
    return mix(min_val, max_val, hash12(f32(_consumeSeed())));
}

fn random_range_v3_auto(min_val: vec3f, max_val: vec3f) -> vec3f {
    return mix(min_val, max_val, hash13(f32(_consumeSeed())));
}

fn random_range_v4_auto(min_val: vec4f, max_val: vec4f) -> vec4f {
    return mix(min_val, max_val, hash14(f32(_consumeSeed())));
}

// ============================================================================
// Unit vector generation -- random points on unit circle/sphere.
// ============================================================================

const _RANDOM_TAU: f32 = 6.283185307179586;

// -- 2D direction (unit circle) --

fn random_direction_2d_f(seed: f32) -> vec2f {
    let a = hash11(seed) * _RANDOM_TAU;
    return vec2f(cos(a), sin(a));
}

fn random_direction_2d_i(seed: i32) -> vec2f {
    let a = hash11(f32(seed)) * _RANDOM_TAU;
    return vec2f(cos(a), sin(a));
}

fn random_direction_2d_v2(seed: vec2f) -> vec2f {
    let a = hash21(seed) * _RANDOM_TAU;
    return vec2f(cos(a), sin(a));
}

fn random_direction_2d_auto() -> vec2f {
    let a = hash11(f32(_consumeSeed())) * _RANDOM_TAU;
    return vec2f(cos(a), sin(a));
}

// -- 3D direction (unit sphere) --

fn random_direction_3d_f(seed: f32) -> vec3f {
    let h = hash12(seed);
    let theta = h.x * _RANDOM_TAU;
    let phi = acos(2.0 * h.y - 1.0);
    let sp = sin(phi);
    return vec3f(sp * cos(theta), sp * sin(theta), cos(phi));
}

fn random_direction_3d_i(seed: i32) -> vec3f {
    let h = hash12(f32(seed));
    let theta = h.x * _RANDOM_TAU;
    let phi = acos(2.0 * h.y - 1.0);
    let sp = sin(phi);
    return vec3f(sp * cos(theta), sp * sin(theta), cos(phi));
}

fn random_direction_3d_v2(seed: vec2f) -> vec3f {
    let h = hash22(seed);
    let theta = h.x * _RANDOM_TAU;
    let phi = acos(2.0 * h.y - 1.0);
    let sp = sin(phi);
    return vec3f(sp * cos(theta), sp * sin(theta), cos(phi));
}

fn random_direction_3d_auto() -> vec3f {
    let h = hash12(f32(_consumeSeed()));
    let theta = h.x * _RANDOM_TAU;
    let phi = acos(2.0 * h.y - 1.0);
    let sp = sin(phi);
    return vec3f(sp * cos(theta), sp * sin(theta), cos(phi));
}

// ============================================================================
// Disk/sphere sampling -- random points inside unit circle/sphere.
// ============================================================================

// -- Inside unit circle --

fn random_in_circle_f(seed: f32) -> vec2f {
    let h = hash12(seed);
    let a = h.x * _RANDOM_TAU;
    let r = sqrt(h.y);
    return vec2f(cos(a), sin(a)) * r;
}

fn random_in_circle_i(seed: i32) -> vec2f {
    let h = hash12(f32(seed));
    let a = h.x * _RANDOM_TAU;
    let r = sqrt(h.y);
    return vec2f(cos(a), sin(a)) * r;
}

fn random_in_circle_v2(seed: vec2f) -> vec2f {
    let h = hash22(seed);
    let a = h.x * _RANDOM_TAU;
    let r = sqrt(h.y);
    return vec2f(cos(a), sin(a)) * r;
}

fn random_in_circle_auto() -> vec2f {
    let h = hash12(f32(_consumeSeed()));
    let a = h.x * _RANDOM_TAU;
    let r = sqrt(h.y);
    return vec2f(cos(a), sin(a)) * r;
}

// -- Inside unit sphere --

fn random_in_sphere_f(seed: f32) -> vec3f {
    let h = hash13(seed);
    let theta = h.x * _RANDOM_TAU;
    let phi = acos(2.0 * h.y - 1.0);
    let r = pow(h.z, 1.0 / 3.0);
    let sp = sin(phi);
    return vec3f(sp * cos(theta), sp * sin(theta), cos(phi)) * r;
}

fn random_in_sphere_i(seed: i32) -> vec3f {
    let h = hash13(f32(seed));
    let theta = h.x * _RANDOM_TAU;
    let phi = acos(2.0 * h.y - 1.0);
    let r = pow(h.z, 1.0 / 3.0);
    let sp = sin(phi);
    return vec3f(sp * cos(theta), sp * sin(theta), cos(phi)) * r;
}

fn random_in_sphere_v2(seed: vec2f) -> vec3f {
    let h = hash23(seed);
    let theta = h.x * _RANDOM_TAU;
    let phi = acos(2.0 * h.y - 1.0);
    let r = pow(h.z, 1.0 / 3.0);
    let sp = sin(phi);
    return vec3f(sp * cos(theta), sp * sin(theta), cos(phi)) * r;
}

fn random_in_sphere_auto() -> vec3f {
    let h = hash13(f32(_consumeSeed()));
    let theta = h.x * _RANDOM_TAU;
    let phi = acos(2.0 * h.y - 1.0);
    let r = pow(h.z, 1.0 / 3.0);
    let sp = sin(phi);
    return vec3f(sp * cos(theta), sp * sin(theta), cos(phi)) * r;
}
