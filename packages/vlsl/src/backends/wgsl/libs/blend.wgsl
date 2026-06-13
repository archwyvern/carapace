// Photoshop-style blend modes for WGSL.
// Converted from glsl-blend (GLSL) to WGSL.
// 25 blend modes, each with scalar (_f), vec3, and opacity overloads.

// -- Add --

fn _blend_add_f(base: f32, blend_val: f32) -> f32 {
    return min(base + blend_val, 1.0);
}

fn blend_add(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_add_f(base.r, blend_val.r), _blend_add_f(base.g, blend_val.g), _blend_add_f(base.b, blend_val.b));
}

fn blend_add_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_add(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Average --

fn _blend_average_f(base: f32, blend_val: f32) -> f32 {
    return (base + blend_val) / 2.0;
}

fn blend_average(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_average_f(base.r, blend_val.r), _blend_average_f(base.g, blend_val.g), _blend_average_f(base.b, blend_val.b));
}

fn blend_average_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_average(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Color Burn --

fn _blend_color_burn_f(base: f32, blend_val: f32) -> f32 {
    return select(max((1.0 - ((1.0 - base) / blend_val)), 0.0), blend_val, blend_val == 0.0);
}

fn blend_color_burn(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_color_burn_f(base.r, blend_val.r), _blend_color_burn_f(base.g, blend_val.g), _blend_color_burn_f(base.b, blend_val.b));
}

fn blend_color_burn_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_color_burn(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Color Dodge --

fn _blend_color_dodge_f(base: f32, blend_val: f32) -> f32 {
    return select(min(base / (1.0 - blend_val), 1.0), blend_val, blend_val == 1.0);
}

fn blend_color_dodge(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_color_dodge_f(base.r, blend_val.r), _blend_color_dodge_f(base.g, blend_val.g), _blend_color_dodge_f(base.b, blend_val.b));
}

fn blend_color_dodge_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_color_dodge(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Darken --

fn _blend_darken_f(base: f32, blend_val: f32) -> f32 {
    return min(blend_val, base);
}

fn blend_darken(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_darken_f(base.r, blend_val.r), _blend_darken_f(base.g, blend_val.g), _blend_darken_f(base.b, blend_val.b));
}

fn blend_darken_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_darken(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Difference --

fn _blend_difference_f(base: f32, blend_val: f32) -> f32 {
    return abs(base - blend_val);
}

fn blend_difference(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_difference_f(base.r, blend_val.r), _blend_difference_f(base.g, blend_val.g), _blend_difference_f(base.b, blend_val.b));
}

fn blend_difference_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_difference(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Exclusion --

fn _blend_exclusion_f(base: f32, blend_val: f32) -> f32 {
    return base + blend_val - 2.0 * base * blend_val;
}

fn blend_exclusion(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_exclusion_f(base.r, blend_val.r), _blend_exclusion_f(base.g, blend_val.g), _blend_exclusion_f(base.b, blend_val.b));
}

fn blend_exclusion_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_exclusion(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Lighten --

fn _blend_lighten_f(base: f32, blend_val: f32) -> f32 {
    return max(blend_val, base);
}

fn blend_lighten(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_lighten_f(base.r, blend_val.r), _blend_lighten_f(base.g, blend_val.g), _blend_lighten_f(base.b, blend_val.b));
}

fn blend_lighten_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_lighten(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Linear Burn --

fn _blend_linear_burn_f(base: f32, blend_val: f32) -> f32 {
    return max(base + blend_val - 1.0, 0.0);
}

fn blend_linear_burn(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_linear_burn_f(base.r, blend_val.r), _blend_linear_burn_f(base.g, blend_val.g), _blend_linear_burn_f(base.b, blend_val.b));
}

fn blend_linear_burn_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_linear_burn(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Linear Dodge --

fn _blend_linear_dodge_f(base: f32, blend_val: f32) -> f32 {
    return min(base + blend_val, 1.0);
}

fn blend_linear_dodge(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_linear_dodge_f(base.r, blend_val.r), _blend_linear_dodge_f(base.g, blend_val.g), _blend_linear_dodge_f(base.b, blend_val.b));
}

fn blend_linear_dodge_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_linear_dodge(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Multiply --

fn _blend_multiply_f(base: f32, blend_val: f32) -> f32 {
    return base * blend_val;
}

fn blend_multiply(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_multiply_f(base.r, blend_val.r), _blend_multiply_f(base.g, blend_val.g), _blend_multiply_f(base.b, blend_val.b));
}

fn blend_multiply_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_multiply(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Negation --

fn _blend_negation_f(base: f32, blend_val: f32) -> f32 {
    return 1.0 - abs(1.0 - base - blend_val);
}

fn blend_negation(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_negation_f(base.r, blend_val.r), _blend_negation_f(base.g, blend_val.g), _blend_negation_f(base.b, blend_val.b));
}

fn blend_negation_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_negation(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Normal --

fn _blend_normal_f(base: f32, blend_val: f32) -> f32 {
    return blend_val;
}

fn blend_normal(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_normal_f(base.r, blend_val.r), _blend_normal_f(base.g, blend_val.g), _blend_normal_f(base.b, blend_val.b));
}

fn blend_normal_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_normal(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Overlay --

fn _blend_overlay_f(base: f32, blend_val: f32) -> f32 {
    return select(1.0 - 2.0 * (1.0 - base) * (1.0 - blend_val), 2.0 * base * blend_val, base < 0.5);
}

fn blend_overlay(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_overlay_f(base.r, blend_val.r), _blend_overlay_f(base.g, blend_val.g), _blend_overlay_f(base.b, blend_val.b));
}

fn blend_overlay_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_overlay(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Phoenix --

fn _blend_phoenix_f(base: f32, blend_val: f32) -> f32 {
    return min(base, blend_val) - max(base, blend_val) + 1.0;
}

fn blend_phoenix(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_phoenix_f(base.r, blend_val.r), _blend_phoenix_f(base.g, blend_val.g), _blend_phoenix_f(base.b, blend_val.b));
}

fn blend_phoenix_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_phoenix(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Reflect --

fn _blend_reflect_f(base: f32, blend_val: f32) -> f32 {
    return select(min(base * base / (1.0 - blend_val), 1.0), blend_val, blend_val == 1.0);
}

fn blend_reflect(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_reflect_f(base.r, blend_val.r), _blend_reflect_f(base.g, blend_val.g), _blend_reflect_f(base.b, blend_val.b));
}

fn blend_reflect_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_reflect(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Screen --

fn _blend_screen_f(base: f32, blend_val: f32) -> f32 {
    return 1.0 - ((1.0 - base) * (1.0 - blend_val));
}

fn blend_screen(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_screen_f(base.r, blend_val.r), _blend_screen_f(base.g, blend_val.g), _blend_screen_f(base.b, blend_val.b));
}

fn blend_screen_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_screen(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Soft Light --

fn _blend_soft_light_f(base: f32, blend_val: f32) -> f32 {
    return select(sqrt(base) * (2.0 * blend_val - 1.0) + 2.0 * base * (1.0 - blend_val), 2.0 * base * blend_val + base * base * (1.0 - 2.0 * blend_val), blend_val < 0.5);
}

fn blend_soft_light(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_soft_light_f(base.r, blend_val.r), _blend_soft_light_f(base.g, blend_val.g), _blend_soft_light_f(base.b, blend_val.b));
}

fn blend_soft_light_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_soft_light(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Subtract --

fn _blend_subtract_f(base: f32, blend_val: f32) -> f32 {
    return max(base + blend_val - 1.0, 0.0);
}

fn blend_subtract(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_subtract_f(base.r, blend_val.r), _blend_subtract_f(base.g, blend_val.g), _blend_subtract_f(base.b, blend_val.b));
}

fn blend_subtract_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_subtract(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Glow (depends on Reflect) --

fn _blend_glow_f(base: f32, blend_val: f32) -> f32 {
    return _blend_reflect_f(blend_val, base);
}

fn blend_glow(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_glow_f(base.r, blend_val.r), _blend_glow_f(base.g, blend_val.g), _blend_glow_f(base.b, blend_val.b));
}

fn blend_glow_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_glow(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Hard Light (depends on Overlay) --

fn _blend_hard_light_f(base: f32, blend_val: f32) -> f32 {
    return _blend_overlay_f(blend_val, base);
}

fn blend_hard_light(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_hard_light_f(base.r, blend_val.r), _blend_hard_light_f(base.g, blend_val.g), _blend_hard_light_f(base.b, blend_val.b));
}

fn blend_hard_light_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_hard_light(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Vivid Light (depends on Color Burn, Color Dodge) --

fn _blend_vivid_light_f(base: f32, blend_val: f32) -> f32 {
    return select(_blend_color_dodge_f(base, 2.0 * (blend_val - 0.5)), _blend_color_burn_f(base, 2.0 * blend_val), blend_val < 0.5);
}

fn blend_vivid_light(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_vivid_light_f(base.r, blend_val.r), _blend_vivid_light_f(base.g, blend_val.g), _blend_vivid_light_f(base.b, blend_val.b));
}

fn blend_vivid_light_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_vivid_light(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Hard Mix (depends on Vivid Light) --

fn _blend_hard_mix_f(base: f32, blend_val: f32) -> f32 {
    return select(1.0, 0.0, _blend_vivid_light_f(base, blend_val) < 0.5);
}

fn blend_hard_mix(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_hard_mix_f(base.r, blend_val.r), _blend_hard_mix_f(base.g, blend_val.g), _blend_hard_mix_f(base.b, blend_val.b));
}

fn blend_hard_mix_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_hard_mix(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Linear Light (depends on Linear Burn, Linear Dodge) --

fn _blend_linear_light_f(base: f32, blend_val: f32) -> f32 {
    return select(_blend_linear_dodge_f(base, 2.0 * (blend_val - 0.5)), _blend_linear_burn_f(base, 2.0 * blend_val), blend_val < 0.5);
}

fn blend_linear_light(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_linear_light_f(base.r, blend_val.r), _blend_linear_light_f(base.g, blend_val.g), _blend_linear_light_f(base.b, blend_val.b));
}

fn blend_linear_light_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_linear_light(base, blend_val) * opacity + base * (1.0 - opacity);
}

// -- Pin Light (depends on Lighten, Darken) --

fn _blend_pin_light_f(base: f32, blend_val: f32) -> f32 {
    return select(_blend_lighten_f(base, 2.0 * (blend_val - 0.5)), _blend_darken_f(base, 2.0 * blend_val), blend_val < 0.5);
}

fn blend_pin_light(base: vec3f, blend_val: vec3f) -> vec3f {
    return vec3f(_blend_pin_light_f(base.r, blend_val.r), _blend_pin_light_f(base.g, blend_val.g), _blend_pin_light_f(base.b, blend_val.b));
}

fn blend_pin_light_opacity(base: vec3f, blend_val: vec3f, opacity: f32) -> vec3f {
    return blend_pin_light(base, blend_val) * opacity + base * (1.0 - opacity);
}
