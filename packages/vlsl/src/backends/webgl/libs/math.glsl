// ============================================================================
// math.glsl -- GLSL ES 3.00 port of math.wgsl shader utility library
//
// Naming conventions for overloaded functions (GLSL has no name overloading
// in the compiler's mangled call surface):
//   _v2, _v3, _v4     -- per-component vector variant (vec2, vec3, vec4)
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
vec2 rotate_2d(vec2 point, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(point.x * c - point.y * s, point.x * s + point.y * c);
}

// Rotate a 2D point around a pivot
vec2 rotate_2d_pivot(vec2 point, float angle, vec2 pivot) {
    return rotate_2d(point - pivot, angle) + pivot;
}

// Get a 2D rotation matrix
mat2 rotation_mat2(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, s, -s, c);
}

// ============================================================================
// Rotation -- 3D (Rodrigues' formula)
// ============================================================================

// Rotate a 3D point around an axis by angle (radians)
vec3 rotate_3d(vec3 point, vec3 axis, float angle) {
    vec3 a = normalize(axis);
    float c = cos(angle);
    float s = sin(angle);
    return point * c + cross(a, point) * s + a * dot(a, point) * (1.0 - c);
}

// Rotate a 3D point around an axis through a pivot
vec3 rotate_3d_pivot(vec3 point, vec3 axis, float angle, vec3 pivot) {
    return rotate_3d(point - pivot, axis, angle) + pivot;
}

// Get a 3D rotation matrix from axis + angle
mat3 rotation_mat3(vec3 axis, float angle) {
    vec3 a = normalize(axis);
    float c = cos(angle);
    float s = sin(angle);
    float t = 1.0 - c;
    return mat3(
        t * a.x * a.x + c,       t * a.x * a.y - s * a.z, t * a.x * a.z + s * a.y,
        t * a.x * a.y + s * a.z, t * a.y * a.y + c,       t * a.y * a.z - s * a.x,
        t * a.x * a.z - s * a.y, t * a.y * a.z + s * a.x, t * a.z * a.z + c
    );
}

// ============================================================================
// Smooth min/max -- polynomial smooth blending
// ============================================================================

// k controls blend radius (k=0 equivalent to min/max)
float smin(float a, float b, float k) {
    if (k <= 0.0) {
        return min(a, b);
    }
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

float smax(float a, float b, float k) {
    if (k <= 0.0) {
        return max(a, b);
    }
    float h = max(k - abs(a - b), 0.0) / k;
    return max(a, b) + h * h * k * 0.25;
}

// Per-component overloads
vec2 smin_v2(vec2 a, vec2 b, float k) {
    return vec2(smin(a.x, b.x, k), smin(a.y, b.y, k));
}

vec3 smin_v3(vec3 a, vec3 b, float k) {
    return vec3(smin(a.x, b.x, k), smin(a.y, b.y, k), smin(a.z, b.z, k));
}

vec4 smin_v4(vec4 a, vec4 b, float k) {
    return vec4(smin(a.x, b.x, k), smin(a.y, b.y, k), smin(a.z, b.z, k), smin(a.w, b.w, k));
}

vec2 smax_v2(vec2 a, vec2 b, float k) {
    return vec2(smax(a.x, b.x, k), smax(a.y, b.y, k));
}

vec3 smax_v3(vec3 a, vec3 b, float k) {
    return vec3(smax(a.x, b.x, k), smax(a.y, b.y, k), smax(a.z, b.z, k));
}

vec4 smax_v4(vec4 a, vec4 b, float k) {
    return vec4(smax(a.x, b.x, k), smax(a.y, b.y, k), smax(a.z, b.z, k), smax(a.w, b.w, k));
}

// ============================================================================
// Ping-pong (triangle wave)
// ============================================================================

// Maps any value to [0, length] triangle wave
float ping_pong(float t, float len) {
    float t_val = t;
    t_val = t_val - len * 2.0 * floor(t_val / (len * 2.0));
    return len - abs(t_val - len);
}

float ping_pong_unit(float t) {
    return ping_pong(t, 1.0);
}

// Per-component overloads
vec2 ping_pong_v2(vec2 t, float len) {
    return vec2(ping_pong(t.x, len), ping_pong(t.y, len));
}

vec3 ping_pong_v3(vec3 t, float len) {
    return vec3(ping_pong(t.x, len), ping_pong(t.y, len), ping_pong(t.z, len));
}

vec4 ping_pong_v4(vec4 t, float len) {
    return vec4(ping_pong(t.x, len), ping_pong(t.y, len), ping_pong(t.z, len), ping_pong(t.w, len));
}

vec2 ping_pong_unit_v2(vec2 t) {
    return ping_pong_v2(t, 1.0);
}

vec3 ping_pong_unit_v3(vec3 t) {
    return ping_pong_v3(t, 1.0);
}

vec4 ping_pong_unit_v4(vec4 t) {
    return ping_pong_v4(t, 1.0);
}

// ============================================================================
// Repeat (positive modulo with edge-case safety)
// ============================================================================

// Remap t to repeat within [0, len)
float repeat_f(float t, float len) {
    return clamp(t - floor(t / len) * len, 0.0, len);
}

// Per-component overloads (vec length)
vec2 repeat_v2(vec2 t, vec2 len) {
    return vec2(repeat_f(t.x, len.x), repeat_f(t.y, len.y));
}

vec3 repeat_v3(vec3 t, vec3 len) {
    return vec3(repeat_f(t.x, len.x), repeat_f(t.y, len.y), repeat_f(t.z, len.z));
}

vec4 repeat_v4(vec4 t, vec4 len) {
    return vec4(repeat_f(t.x, len.x), repeat_f(t.y, len.y), repeat_f(t.z, len.z), repeat_f(t.w, len.w));
}

// Per-component overloads (scalar length)
vec2 repeat_v2s(vec2 t, float len) {
    return vec2(repeat_f(t.x, len), repeat_f(t.y, len));
}

vec3 repeat_v3s(vec3 t, float len) {
    return vec3(repeat_f(t.x, len), repeat_f(t.y, len), repeat_f(t.z, len));
}

vec4 repeat_v4s(vec4 t, float len) {
    return vec4(repeat_f(t.x, len), repeat_f(t.y, len), repeat_f(t.z, len), repeat_f(t.w, len));
}

// ============================================================================
// Spherical Linear Interpolation
// ============================================================================

// 2D slerp (arc on unit circle)
vec2 slerp_v2(vec2 a, vec2 b, float t) {
    float d = clamp(dot(a, b), -1.0, 1.0);
    float theta = acos(d);
    if (theta < 0.001) {
        return mix(a, b, t);
    }
    float s = sin(theta);
    return a * (sin((1.0 - t) * theta) / s) + b * (sin(t * theta) / s);
}

// 3D slerp (arc on unit sphere)
vec3 slerp_v3(vec3 a, vec3 b, float t) {
    float d = clamp(dot(a, b), -1.0, 1.0);
    float theta = acos(d);
    if (theta < 0.001) {
        return mix(a, b, t);
    }
    float s = sin(theta);
    return a * (sin((1.0 - t) * theta) / s) + b * (sin(t * theta) / s);
}

// 4D slerp (quaternion interpolation)
vec4 slerp_v4(vec4 a, vec4 b, float t) {
    float d = clamp(dot(a, b), -1.0, 1.0);
    float theta = acos(d);
    if (theta < 0.001) {
        return mix(a, b, t);
    }
    float s = sin(theta);
    return a * (sin((1.0 - t) * theta) / s) + b * (sin(t * theta) / s);
}

// ============================================================================
// Inverse Spherical Linear Interpolation
// ============================================================================

// 2D inverse slerp -- returns t for a point on the arc between a and b
float inverse_slerp_v2(vec2 a, vec2 b, vec2 value) {
    float theta_ab = acos(clamp(dot(a, b), -1.0, 1.0));
    if (theta_ab < 0.001) {
        return 0.0;
    }
    float theta_av = acos(clamp(dot(a, value), -1.0, 1.0));
    return theta_av / theta_ab;
}

// 3D inverse slerp
float inverse_slerp_v3(vec3 a, vec3 b, vec3 value) {
    float theta_ab = acos(clamp(dot(a, b), -1.0, 1.0));
    if (theta_ab < 0.001) {
        return 0.0;
    }
    float theta_av = acos(clamp(dot(a, value), -1.0, 1.0));
    return theta_av / theta_ab;
}

// 4D inverse slerp
float inverse_slerp_v4(vec4 a, vec4 b, vec4 value) {
    float theta_ab = acos(clamp(dot(a, b), -1.0, 1.0));
    if (theta_ab < 0.001) {
        return 0.0;
    }
    float theta_av = acos(clamp(dot(a, value), -1.0, 1.0));
    return theta_av / theta_ab;
}
