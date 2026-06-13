// Random shader library -- deterministic hashing, range-mapped random, direction/sampling utilities.
// Hash functions based on Dave Hoskins (https://www.shadertoy.com/view/4djSRW).
// Depends on global seed builtins: _consumeSeed(), _global_seed.

// Placeholder seed system -- replaced by engine runtime when embedded.
int _global_seed = 0;
int _consumeSeed() {
    _global_seed += 1;
    return _global_seed;
}

// ============================================================================
// Hash functions -- deterministic pseudorandom from position. All outputs in [0, 1].
// Naming: hashNM = N input components -> M output components.
// ============================================================================

// -- 1 input component --

float hash11(float p) {
    float v = fract(p * 0.1031);
    v *= v + 33.33;
    v *= v + v;
    return fract(v);
}

vec2 hash12(float p) {
    vec3 p3 = fract(vec3(p, p, p) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 hash13(float p) {
    vec3 p3 = fract(vec3(p, p, p) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}

vec4 hash14(float p) {
    vec4 p4 = fract(vec4(p, p, p, p) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

// -- 2 input components --

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 hash23(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}

vec4 hash24(vec2 p) {
    vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

// -- 3 input components --

float hash31(vec3 p) {
    vec3 v = fract(p * 0.1031);
    v += dot(v, v.zyx + 31.32);
    return fract((v.x + v.y) * v.z);
}

vec2 hash32(vec3 p) {
    vec3 v = fract(p * vec3(0.1031, 0.1030, 0.0973));
    v += dot(v, v.yxz + 33.33);
    return fract((v.xx + v.yz) * v.zy);
}

vec3 hash33(vec3 p) {
    vec3 v = fract(p * vec3(0.1031, 0.1030, 0.0973));
    v += dot(v, v.yxz + 33.33);
    return fract((v.xxy + v.yxx) * v.zyx);
}

vec4 hash34(vec3 p) {
    vec4 p4 = fract(vec4(p.xyzx) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

// -- 4 input components --

float hash41(vec4 p) {
    vec4 v = fract(p * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    v += dot(v, v.wzxy + 33.33);
    return fract((v.x + v.y) * (v.z + v.w));
}

vec2 hash42(vec4 p) {
    vec4 v = fract(p * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    v += dot(v, v.wzxy + 33.33);
    return fract((v.xx + v.yz) * v.zw);
}

vec3 hash43(vec4 p) {
    vec4 v = fract(p * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    v += dot(v, v.wzxy + 33.33);
    return fract((v.xxy + v.yzz) * v.zww);
}

vec4 hash44(vec4 p) {
    vec4 v = fract(p * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    v += dot(v, v.wzxy + 33.33);
    return fract((v.xxyz + v.yzzw) * v.zywx);
}

// ============================================================================
// Range-mapped random -- random value in [min_val, max_val].
// ============================================================================

// -- float seed overloads --

float random_range_f(float min_val, float max_val, float seed) {
    return mix(min_val, max_val, hash11(seed));
}

vec2 random_range_v2(vec2 min_val, vec2 max_val, float seed) {
    return mix(min_val, max_val, hash12(seed));
}

vec3 random_range_v3(vec3 min_val, vec3 max_val, float seed) {
    return mix(min_val, max_val, hash13(seed));
}

vec4 random_range_v4(vec4 min_val, vec4 max_val, float seed) {
    return mix(min_val, max_val, hash14(seed));
}

// -- int seed overloads --

float random_range_f_i(float min_val, float max_val, int seed) {
    return mix(min_val, max_val, hash11(float(seed)));
}

vec2 random_range_v2_i(vec2 min_val, vec2 max_val, int seed) {
    return mix(min_val, max_val, hash12(float(seed)));
}

vec3 random_range_v3_i(vec3 min_val, vec3 max_val, int seed) {
    return mix(min_val, max_val, hash13(float(seed)));
}

vec4 random_range_v4_i(vec4 min_val, vec4 max_val, int seed) {
    return mix(min_val, max_val, hash14(float(seed)));
}

// -- seedless overloads (consume global seed) --

float random_range_f_auto(float min_val, float max_val) {
    return mix(min_val, max_val, hash11(float(_consumeSeed())));
}

vec2 random_range_v2_auto(vec2 min_val, vec2 max_val) {
    return mix(min_val, max_val, hash12(float(_consumeSeed())));
}

vec3 random_range_v3_auto(vec3 min_val, vec3 max_val) {
    return mix(min_val, max_val, hash13(float(_consumeSeed())));
}

vec4 random_range_v4_auto(vec4 min_val, vec4 max_val) {
    return mix(min_val, max_val, hash14(float(_consumeSeed())));
}

// ============================================================================
// Unit vector generation -- random points on unit circle/sphere.
// ============================================================================

const float _RANDOM_TAU = 6.283185307179586;

// -- 2D direction (unit circle) --

vec2 random_direction_2d_f(float seed) {
    float a = hash11(seed) * _RANDOM_TAU;
    return vec2(cos(a), sin(a));
}

vec2 random_direction_2d_i(int seed) {
    float a = hash11(float(seed)) * _RANDOM_TAU;
    return vec2(cos(a), sin(a));
}

vec2 random_direction_2d_v2(vec2 seed) {
    float a = hash21(seed) * _RANDOM_TAU;
    return vec2(cos(a), sin(a));
}

vec2 random_direction_2d_auto() {
    float a = hash11(float(_consumeSeed())) * _RANDOM_TAU;
    return vec2(cos(a), sin(a));
}

// -- 3D direction (unit sphere) --

vec3 random_direction_3d_f(float seed) {
    vec2 h = hash12(seed);
    float theta = h.x * _RANDOM_TAU;
    float phi = acos(2.0 * h.y - 1.0);
    float sp = sin(phi);
    return vec3(sp * cos(theta), sp * sin(theta), cos(phi));
}

vec3 random_direction_3d_i(int seed) {
    vec2 h = hash12(float(seed));
    float theta = h.x * _RANDOM_TAU;
    float phi = acos(2.0 * h.y - 1.0);
    float sp = sin(phi);
    return vec3(sp * cos(theta), sp * sin(theta), cos(phi));
}

vec3 random_direction_3d_v2(vec2 seed) {
    vec2 h = hash22(seed);
    float theta = h.x * _RANDOM_TAU;
    float phi = acos(2.0 * h.y - 1.0);
    float sp = sin(phi);
    return vec3(sp * cos(theta), sp * sin(theta), cos(phi));
}

vec3 random_direction_3d_auto() {
    vec2 h = hash12(float(_consumeSeed()));
    float theta = h.x * _RANDOM_TAU;
    float phi = acos(2.0 * h.y - 1.0);
    float sp = sin(phi);
    return vec3(sp * cos(theta), sp * sin(theta), cos(phi));
}

// ============================================================================
// Disk/sphere sampling -- random points inside unit circle/sphere.
// ============================================================================

// -- Inside unit circle --

vec2 random_in_circle_f(float seed) {
    vec2 h = hash12(seed);
    float a = h.x * _RANDOM_TAU;
    float r = sqrt(h.y);
    return vec2(cos(a), sin(a)) * r;
}

vec2 random_in_circle_i(int seed) {
    vec2 h = hash12(float(seed));
    float a = h.x * _RANDOM_TAU;
    float r = sqrt(h.y);
    return vec2(cos(a), sin(a)) * r;
}

vec2 random_in_circle_v2(vec2 seed) {
    vec2 h = hash22(seed);
    float a = h.x * _RANDOM_TAU;
    float r = sqrt(h.y);
    return vec2(cos(a), sin(a)) * r;
}

vec2 random_in_circle_auto() {
    vec2 h = hash12(float(_consumeSeed()));
    float a = h.x * _RANDOM_TAU;
    float r = sqrt(h.y);
    return vec2(cos(a), sin(a)) * r;
}

// -- Inside unit sphere --

vec3 random_in_sphere_f(float seed) {
    vec3 h = hash13(seed);
    float theta = h.x * _RANDOM_TAU;
    float phi = acos(2.0 * h.y - 1.0);
    float r = pow(h.z, 1.0 / 3.0);
    float sp = sin(phi);
    return vec3(sp * cos(theta), sp * sin(theta), cos(phi)) * r;
}

vec3 random_in_sphere_i(int seed) {
    vec3 h = hash13(float(seed));
    float theta = h.x * _RANDOM_TAU;
    float phi = acos(2.0 * h.y - 1.0);
    float r = pow(h.z, 1.0 / 3.0);
    float sp = sin(phi);
    return vec3(sp * cos(theta), sp * sin(theta), cos(phi)) * r;
}

vec3 random_in_sphere_v2(vec2 seed) {
    vec3 h = hash23(seed);
    float theta = h.x * _RANDOM_TAU;
    float phi = acos(2.0 * h.y - 1.0);
    float r = pow(h.z, 1.0 / 3.0);
    float sp = sin(phi);
    return vec3(sp * cos(theta), sp * sin(theta), cos(phi)) * r;
}

vec3 random_in_sphere_auto() {
    vec3 h = hash13(float(_consumeSeed()));
    float theta = h.x * _RANDOM_TAU;
    float phi = acos(2.0 * h.y - 1.0);
    float r = pow(h.z, 1.0 / 3.0);
    float sp = sin(phi);
    return vec3(sp * cos(theta), sp * sin(theta), cos(phi)) * r;
}
