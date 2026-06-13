// ============================================================================
// math.wgsl -- WGSL port of math.glsl shader utility library
//
// Naming conventions for overloaded functions (WGSL has no overloading):
//   _v2, _v3, _v4     -- per-component vector variant (vec2f, vec3f, vec4f)
//   _v2s, _v3s, _v4s  -- vector variant with scalar second argument
//   _f                 -- scalar variant when the base name would be ambiguous
//   _unit              -- variant with default length = 1.0
//   _2d, _3d           -- dimensionality (rotation functions)
//   _pivot             -- variant that takes an extra pivot point
//   _mat2, _mat3       -- returns a rotation matrix
// ============================================================================

// ============================================================================
// Rotation -- 2D
// ============================================================================

// Rotate a 2D point by angle (radians)
fn rotate_2d(point: vec2f, angle: f32) -> vec2f {
    let c = cos(angle);
    let s = sin(angle);
    return vec2f(point.x * c - point.y * s, point.x * s + point.y * c);
}

// Rotate a 2D point around a pivot
fn rotate_2d_pivot(point: vec2f, angle: f32, pivot: vec2f) -> vec2f {
    return rotate_2d(point - pivot, angle) + pivot;
}

// Get a 2D rotation matrix
fn rotation_mat2(angle: f32) -> mat2x2f {
    let c = cos(angle);
    let s = sin(angle);
    return mat2x2f(c, s, -s, c);
}

// ============================================================================
// Rotation -- 3D (Rodrigues' formula)
// ============================================================================

// Rotate a 3D point around an axis by angle (radians)
fn rotate_3d(point: vec3f, axis: vec3f, angle: f32) -> vec3f {
    let a = normalize(axis);
    let c = cos(angle);
    let s = sin(angle);
    return point * c + cross(a, point) * s + a * dot(a, point) * (1.0 - c);
}

// Rotate a 3D point around an axis through a pivot
fn rotate_3d_pivot(point: vec3f, axis: vec3f, angle: f32, pivot: vec3f) -> vec3f {
    return rotate_3d(point - pivot, axis, angle) + pivot;
}

// Get a 3D rotation matrix from axis + angle
fn rotation_mat3(axis: vec3f, angle: f32) -> mat3x3f {
    let a = normalize(axis);
    let c = cos(angle);
    let s = sin(angle);
    let t = 1.0 - c;
    return mat3x3f(
        t * a.x * a.x + c,       t * a.x * a.y - s * a.z, t * a.x * a.z + s * a.y,
        t * a.x * a.y + s * a.z, t * a.y * a.y + c,       t * a.y * a.z - s * a.x,
        t * a.x * a.z - s * a.y, t * a.y * a.z + s * a.x, t * a.z * a.z + c
    );
}

// ============================================================================
// Smooth min/max -- polynomial smooth blending
// ============================================================================

// k controls blend radius (k=0 equivalent to min/max)
fn smin(a: f32, b: f32, k: f32) -> f32 {
    if (k <= 0.0) {
        return min(a, b);
    }
    let h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

fn smax(a: f32, b: f32, k: f32) -> f32 {
    if (k <= 0.0) {
        return max(a, b);
    }
    let h = max(k - abs(a - b), 0.0) / k;
    return max(a, b) + h * h * k * 0.25;
}

// Per-component overloads
fn smin_v2(a: vec2f, b: vec2f, k: f32) -> vec2f {
    return vec2f(smin(a.x, b.x, k), smin(a.y, b.y, k));
}

fn smin_v3(a: vec3f, b: vec3f, k: f32) -> vec3f {
    return vec3f(smin(a.x, b.x, k), smin(a.y, b.y, k), smin(a.z, b.z, k));
}

fn smin_v4(a: vec4f, b: vec4f, k: f32) -> vec4f {
    return vec4f(smin(a.x, b.x, k), smin(a.y, b.y, k), smin(a.z, b.z, k), smin(a.w, b.w, k));
}

fn smax_v2(a: vec2f, b: vec2f, k: f32) -> vec2f {
    return vec2f(smax(a.x, b.x, k), smax(a.y, b.y, k));
}

fn smax_v3(a: vec3f, b: vec3f, k: f32) -> vec3f {
    return vec3f(smax(a.x, b.x, k), smax(a.y, b.y, k), smax(a.z, b.z, k));
}

fn smax_v4(a: vec4f, b: vec4f, k: f32) -> vec4f {
    return vec4f(smax(a.x, b.x, k), smax(a.y, b.y, k), smax(a.z, b.z, k), smax(a.w, b.w, k));
}

// ============================================================================
// Ping-pong (triangle wave)
// ============================================================================

// Maps any value to [0, length] triangle wave
fn ping_pong(t: f32, len: f32) -> f32 {
    var t_val = t;
    t_val = t_val - len * 2.0 * floor(t_val / (len * 2.0));
    return len - abs(t_val - len);
}

fn ping_pong_unit(t: f32) -> f32 {
    return ping_pong(t, 1.0);
}

// Per-component overloads
fn ping_pong_v2(t: vec2f, len: f32) -> vec2f {
    return vec2f(ping_pong(t.x, len), ping_pong(t.y, len));
}

fn ping_pong_v3(t: vec3f, len: f32) -> vec3f {
    return vec3f(ping_pong(t.x, len), ping_pong(t.y, len), ping_pong(t.z, len));
}

fn ping_pong_v4(t: vec4f, len: f32) -> vec4f {
    return vec4f(ping_pong(t.x, len), ping_pong(t.y, len), ping_pong(t.z, len), ping_pong(t.w, len));
}

fn ping_pong_unit_v2(t: vec2f) -> vec2f {
    return ping_pong_v2(t, 1.0);
}

fn ping_pong_unit_v3(t: vec3f) -> vec3f {
    return ping_pong_v3(t, 1.0);
}

fn ping_pong_unit_v4(t: vec4f) -> vec4f {
    return ping_pong_v4(t, 1.0);
}

// ============================================================================
// Repeat (positive modulo with edge-case safety)
// ============================================================================

// Remap t to repeat within [0, len)
fn repeat_f(t: f32, len: f32) -> f32 {
    return clamp(t - floor(t / len) * len, 0.0, len);
}

// Per-component overloads (vec length)
fn repeat_v2(t: vec2f, len: vec2f) -> vec2f {
    return vec2f(repeat_f(t.x, len.x), repeat_f(t.y, len.y));
}

fn repeat_v3(t: vec3f, len: vec3f) -> vec3f {
    return vec3f(repeat_f(t.x, len.x), repeat_f(t.y, len.y), repeat_f(t.z, len.z));
}

fn repeat_v4(t: vec4f, len: vec4f) -> vec4f {
    return vec4f(repeat_f(t.x, len.x), repeat_f(t.y, len.y), repeat_f(t.z, len.z), repeat_f(t.w, len.w));
}

// Per-component overloads (scalar length)
fn repeat_v2s(t: vec2f, len: f32) -> vec2f {
    return vec2f(repeat_f(t.x, len), repeat_f(t.y, len));
}

fn repeat_v3s(t: vec3f, len: f32) -> vec3f {
    return vec3f(repeat_f(t.x, len), repeat_f(t.y, len), repeat_f(t.z, len));
}

fn repeat_v4s(t: vec4f, len: f32) -> vec4f {
    return vec4f(repeat_f(t.x, len), repeat_f(t.y, len), repeat_f(t.z, len), repeat_f(t.w, len));
}

// ============================================================================
// Spherical Linear Interpolation
// ============================================================================

// 2D slerp (arc on unit circle)
fn slerp_v2(a: vec2f, b: vec2f, t: f32) -> vec2f {
    let d = clamp(dot(a, b), -1.0, 1.0);
    let theta = acos(d);
    if (theta < 0.001) {
        return mix(a, b, t);
    }
    let s = sin(theta);
    return a * (sin((1.0 - t) * theta) / s) + b * (sin(t * theta) / s);
}

// 3D slerp (arc on unit sphere)
fn slerp_v3(a: vec3f, b: vec3f, t: f32) -> vec3f {
    let d = clamp(dot(a, b), -1.0, 1.0);
    let theta = acos(d);
    if (theta < 0.001) {
        return mix(a, b, t);
    }
    let s = sin(theta);
    return a * (sin((1.0 - t) * theta) / s) + b * (sin(t * theta) / s);
}

// 4D slerp (quaternion interpolation)
fn slerp_v4(a: vec4f, b: vec4f, t: f32) -> vec4f {
    let d = clamp(dot(a, b), -1.0, 1.0);
    let theta = acos(d);
    if (theta < 0.001) {
        return mix(a, b, t);
    }
    let s = sin(theta);
    return a * (sin((1.0 - t) * theta) / s) + b * (sin(t * theta) / s);
}

// ============================================================================
// Inverse Spherical Linear Interpolation
// ============================================================================

// 2D inverse slerp -- returns t for a point on the arc between a and b
fn inverse_slerp_v2(a: vec2f, b: vec2f, value: vec2f) -> f32 {
    let theta_ab = acos(clamp(dot(a, b), -1.0, 1.0));
    if (theta_ab < 0.001) {
        return 0.0;
    }
    let theta_av = acos(clamp(dot(a, value), -1.0, 1.0));
    return theta_av / theta_ab;
}

// 3D inverse slerp
fn inverse_slerp_v3(a: vec3f, b: vec3f, value: vec3f) -> f32 {
    let theta_ab = acos(clamp(dot(a, b), -1.0, 1.0));
    if (theta_ab < 0.001) {
        return 0.0;
    }
    let theta_av = acos(clamp(dot(a, value), -1.0, 1.0));
    return theta_av / theta_ab;
}

// 4D inverse slerp
fn inverse_slerp_v4(a: vec4f, b: vec4f, value: vec4f) -> f32 {
    let theta_ab = acos(clamp(dot(a, b), -1.0, 1.0));
    if (theta_ab < 0.001) {
        return 0.0;
    }
    let theta_av = acos(clamp(dot(a, value), -1.0, 1.0));
    return theta_av / theta_ab;
}
