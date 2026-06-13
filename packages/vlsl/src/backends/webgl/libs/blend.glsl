// Photoshop-style blend modes for GLSL ES 3.00.
// Converted from glsl-blend (GLSL) via blend.wgsl.
// 25 blend modes, each with scalar (_f), vec3, and opacity overloads.

// -- Add --

float _blend_add_f(float base, float blend_val) {
    return min(base + blend_val, 1.0);
}

vec3 blend_add(vec3 base, vec3 blend_val) {
    return vec3(_blend_add_f(base.r, blend_val.r), _blend_add_f(base.g, blend_val.g), _blend_add_f(base.b, blend_val.b));
}

vec3 blend_add_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_add(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Average --

float _blend_average_f(float base, float blend_val) {
    return (base + blend_val) / 2.0;
}

vec3 blend_average(vec3 base, vec3 blend_val) {
    return vec3(_blend_average_f(base.r, blend_val.r), _blend_average_f(base.g, blend_val.g), _blend_average_f(base.b, blend_val.b));
}

vec3 blend_average_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_average(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Color Burn --

float _blend_color_burn_f(float base, float blend_val) {
    return (blend_val == 0.0 ? blend_val : max((1.0 - ((1.0 - base) / blend_val)), 0.0));
}

vec3 blend_color_burn(vec3 base, vec3 blend_val) {
    return vec3(_blend_color_burn_f(base.r, blend_val.r), _blend_color_burn_f(base.g, blend_val.g), _blend_color_burn_f(base.b, blend_val.b));
}

vec3 blend_color_burn_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_color_burn(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Color Dodge --

float _blend_color_dodge_f(float base, float blend_val) {
    return (blend_val == 1.0 ? blend_val : min(base / (1.0 - blend_val), 1.0));
}

vec3 blend_color_dodge(vec3 base, vec3 blend_val) {
    return vec3(_blend_color_dodge_f(base.r, blend_val.r), _blend_color_dodge_f(base.g, blend_val.g), _blend_color_dodge_f(base.b, blend_val.b));
}

vec3 blend_color_dodge_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_color_dodge(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Darken --

float _blend_darken_f(float base, float blend_val) {
    return min(blend_val, base);
}

vec3 blend_darken(vec3 base, vec3 blend_val) {
    return vec3(_blend_darken_f(base.r, blend_val.r), _blend_darken_f(base.g, blend_val.g), _blend_darken_f(base.b, blend_val.b));
}

vec3 blend_darken_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_darken(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Difference --

float _blend_difference_f(float base, float blend_val) {
    return abs(base - blend_val);
}

vec3 blend_difference(vec3 base, vec3 blend_val) {
    return vec3(_blend_difference_f(base.r, blend_val.r), _blend_difference_f(base.g, blend_val.g), _blend_difference_f(base.b, blend_val.b));
}

vec3 blend_difference_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_difference(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Exclusion --

float _blend_exclusion_f(float base, float blend_val) {
    return base + blend_val - 2.0 * base * blend_val;
}

vec3 blend_exclusion(vec3 base, vec3 blend_val) {
    return vec3(_blend_exclusion_f(base.r, blend_val.r), _blend_exclusion_f(base.g, blend_val.g), _blend_exclusion_f(base.b, blend_val.b));
}

vec3 blend_exclusion_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_exclusion(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Lighten --

float _blend_lighten_f(float base, float blend_val) {
    return max(blend_val, base);
}

vec3 blend_lighten(vec3 base, vec3 blend_val) {
    return vec3(_blend_lighten_f(base.r, blend_val.r), _blend_lighten_f(base.g, blend_val.g), _blend_lighten_f(base.b, blend_val.b));
}

vec3 blend_lighten_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_lighten(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Linear Burn --

float _blend_linear_burn_f(float base, float blend_val) {
    return max(base + blend_val - 1.0, 0.0);
}

vec3 blend_linear_burn(vec3 base, vec3 blend_val) {
    return vec3(_blend_linear_burn_f(base.r, blend_val.r), _blend_linear_burn_f(base.g, blend_val.g), _blend_linear_burn_f(base.b, blend_val.b));
}

vec3 blend_linear_burn_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_linear_burn(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Linear Dodge --

float _blend_linear_dodge_f(float base, float blend_val) {
    return min(base + blend_val, 1.0);
}

vec3 blend_linear_dodge(vec3 base, vec3 blend_val) {
    return vec3(_blend_linear_dodge_f(base.r, blend_val.r), _blend_linear_dodge_f(base.g, blend_val.g), _blend_linear_dodge_f(base.b, blend_val.b));
}

vec3 blend_linear_dodge_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_linear_dodge(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Multiply --

float _blend_multiply_f(float base, float blend_val) {
    return base * blend_val;
}

vec3 blend_multiply(vec3 base, vec3 blend_val) {
    return vec3(_blend_multiply_f(base.r, blend_val.r), _blend_multiply_f(base.g, blend_val.g), _blend_multiply_f(base.b, blend_val.b));
}

vec3 blend_multiply_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_multiply(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Negation --

float _blend_negation_f(float base, float blend_val) {
    return 1.0 - abs(1.0 - base - blend_val);
}

vec3 blend_negation(vec3 base, vec3 blend_val) {
    return vec3(_blend_negation_f(base.r, blend_val.r), _blend_negation_f(base.g, blend_val.g), _blend_negation_f(base.b, blend_val.b));
}

vec3 blend_negation_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_negation(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Normal --

float _blend_normal_f(float base, float blend_val) {
    return blend_val;
}

vec3 blend_normal(vec3 base, vec3 blend_val) {
    return vec3(_blend_normal_f(base.r, blend_val.r), _blend_normal_f(base.g, blend_val.g), _blend_normal_f(base.b, blend_val.b));
}

vec3 blend_normal_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_normal(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Overlay --

float _blend_overlay_f(float base, float blend_val) {
    return (base < 0.5 ? 2.0 * base * blend_val : 1.0 - 2.0 * (1.0 - base) * (1.0 - blend_val));
}

vec3 blend_overlay(vec3 base, vec3 blend_val) {
    return vec3(_blend_overlay_f(base.r, blend_val.r), _blend_overlay_f(base.g, blend_val.g), _blend_overlay_f(base.b, blend_val.b));
}

vec3 blend_overlay_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_overlay(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Phoenix --

float _blend_phoenix_f(float base, float blend_val) {
    return min(base, blend_val) - max(base, blend_val) + 1.0;
}

vec3 blend_phoenix(vec3 base, vec3 blend_val) {
    return vec3(_blend_phoenix_f(base.r, blend_val.r), _blend_phoenix_f(base.g, blend_val.g), _blend_phoenix_f(base.b, blend_val.b));
}

vec3 blend_phoenix_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_phoenix(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Reflect --

float _blend_reflect_f(float base, float blend_val) {
    return (blend_val == 1.0 ? blend_val : min(base * base / (1.0 - blend_val), 1.0));
}

vec3 blend_reflect(vec3 base, vec3 blend_val) {
    return vec3(_blend_reflect_f(base.r, blend_val.r), _blend_reflect_f(base.g, blend_val.g), _blend_reflect_f(base.b, blend_val.b));
}

vec3 blend_reflect_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_reflect(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Screen --

float _blend_screen_f(float base, float blend_val) {
    return 1.0 - ((1.0 - base) * (1.0 - blend_val));
}

vec3 blend_screen(vec3 base, vec3 blend_val) {
    return vec3(_blend_screen_f(base.r, blend_val.r), _blend_screen_f(base.g, blend_val.g), _blend_screen_f(base.b, blend_val.b));
}

vec3 blend_screen_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_screen(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Soft Light --

float _blend_soft_light_f(float base, float blend_val) {
    return (blend_val < 0.5 ? 2.0 * base * blend_val + base * base * (1.0 - 2.0 * blend_val) : sqrt(base) * (2.0 * blend_val - 1.0) + 2.0 * base * (1.0 - blend_val));
}

vec3 blend_soft_light(vec3 base, vec3 blend_val) {
    return vec3(_blend_soft_light_f(base.r, blend_val.r), _blend_soft_light_f(base.g, blend_val.g), _blend_soft_light_f(base.b, blend_val.b));
}

vec3 blend_soft_light_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_soft_light(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Subtract --

float _blend_subtract_f(float base, float blend_val) {
    return max(base + blend_val - 1.0, 0.0);
}

vec3 blend_subtract(vec3 base, vec3 blend_val) {
    return vec3(_blend_subtract_f(base.r, blend_val.r), _blend_subtract_f(base.g, blend_val.g), _blend_subtract_f(base.b, blend_val.b));
}

vec3 blend_subtract_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_subtract(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Glow (depends on Reflect) --

float _blend_glow_f(float base, float blend_val) {
    return _blend_reflect_f(blend_val, base);
}

vec3 blend_glow(vec3 base, vec3 blend_val) {
    return vec3(_blend_glow_f(base.r, blend_val.r), _blend_glow_f(base.g, blend_val.g), _blend_glow_f(base.b, blend_val.b));
}

vec3 blend_glow_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_glow(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Hard Light (depends on Overlay) --

float _blend_hard_light_f(float base, float blend_val) {
    return _blend_overlay_f(blend_val, base);
}

vec3 blend_hard_light(vec3 base, vec3 blend_val) {
    return vec3(_blend_hard_light_f(base.r, blend_val.r), _blend_hard_light_f(base.g, blend_val.g), _blend_hard_light_f(base.b, blend_val.b));
}

vec3 blend_hard_light_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_hard_light(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Vivid Light (depends on Color Burn, Color Dodge) --

float _blend_vivid_light_f(float base, float blend_val) {
    return (blend_val < 0.5 ? _blend_color_burn_f(base, 2.0 * blend_val) : _blend_color_dodge_f(base, 2.0 * (blend_val - 0.5)));
}

vec3 blend_vivid_light(vec3 base, vec3 blend_val) {
    return vec3(_blend_vivid_light_f(base.r, blend_val.r), _blend_vivid_light_f(base.g, blend_val.g), _blend_vivid_light_f(base.b, blend_val.b));
}

vec3 blend_vivid_light_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_vivid_light(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Hard Mix (depends on Vivid Light) --

float _blend_hard_mix_f(float base, float blend_val) {
    return (_blend_vivid_light_f(base, blend_val) < 0.5 ? 0.0 : 1.0);
}

vec3 blend_hard_mix(vec3 base, vec3 blend_val) {
    return vec3(_blend_hard_mix_f(base.r, blend_val.r), _blend_hard_mix_f(base.g, blend_val.g), _blend_hard_mix_f(base.b, blend_val.b));
}

vec3 blend_hard_mix_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_hard_mix(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Linear Light (depends on Linear Burn, Linear Dodge) --

float _blend_linear_light_f(float base, float blend_val) {
    return (blend_val < 0.5 ? _blend_linear_burn_f(base, 2.0 * blend_val) : _blend_linear_dodge_f(base, 2.0 * (blend_val - 0.5)));
}

vec3 blend_linear_light(vec3 base, vec3 blend_val) {
    return vec3(_blend_linear_light_f(base.r, blend_val.r), _blend_linear_light_f(base.g, blend_val.g), _blend_linear_light_f(base.b, blend_val.b));
}

vec3 blend_linear_light_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_linear_light(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Pin Light (depends on Lighten, Darken) --

float _blend_pin_light_f(float base, float blend_val) {
    return (blend_val < 0.5 ? _blend_darken_f(base, 2.0 * blend_val) : _blend_lighten_f(base, 2.0 * (blend_val - 0.5)));
}

vec3 blend_pin_light(vec3 base, vec3 blend_val) {
    return vec3(_blend_pin_light_f(base.r, blend_val.r), _blend_pin_light_f(base.g, blend_val.g), _blend_pin_light_f(base.b, blend_val.b));
}

vec3 blend_pin_light_opacity(vec3 base, vec3 blend_val, float opacity) {
    return blend_pin_light(base, blend_val) * opacity + base * (1.0 - opacity);
}
