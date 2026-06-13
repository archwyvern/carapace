// ============================================================================
// Easing functions library (WGSL)
// All functions take f32 t (clamped to [0,1]) and return f32 in [0,1].
// Converted from ease.glsl. Ported from Archwyvern.Space2D.Common.EasingFunctions.
// ============================================================================

const EASE_PI: f32 = 3.14159265358979;

// ── Linear ──

fn ease_linear(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return t_val;
}

// ── Quad ──

fn ease_quad_in(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return t_val * t_val;
}

fn ease_quad_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_quad_in(1.0 - t_val);
}

fn ease_quad_in_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_quad_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_quad_in((1.0 - t_val) * 2.0) * 0.5;
}

// ── Cubic ──

fn ease_cubic_in(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return t_val * t_val * t_val;
}

fn ease_cubic_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_cubic_in(1.0 - t_val);
}

fn ease_cubic_in_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_cubic_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_cubic_in((1.0 - t_val) * 2.0) * 0.5;
}

// ── Quart ──

fn ease_quart_in(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return t_val * t_val * t_val * t_val;
}

fn ease_quart_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_quart_in(1.0 - t_val);
}

fn ease_quart_in_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_quart_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_quart_in((1.0 - t_val) * 2.0) * 0.5;
}

// ── Quint ──

fn ease_quint_in(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return t_val * t_val * t_val * t_val * t_val;
}

fn ease_quint_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_quint_in(1.0 - t_val);
}

fn ease_quint_in_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_quint_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_quint_in((1.0 - t_val) * 2.0) * 0.5;
}

// ── Sine ──

fn ease_sine_in(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return 1.0 - cos(t_val * EASE_PI * 0.5);
}

fn ease_sine_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return sin(t_val * EASE_PI * 0.5);
}

fn ease_sine_in_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return (1.0 - cos(t_val * EASE_PI)) * 0.5;
}

// ── Expo ──

fn ease_expo_in(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val <= 0.0) {
        return 0.0;
    }
    if (t_val >= 1.0) {
        return 1.0;
    }
    return pow(2.0, 10.0 * (t_val - 1.0));
}

fn ease_expo_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val <= 0.0) {
        return 0.0;
    }
    if (t_val >= 1.0) {
        return 1.0;
    }
    return 1.0 - pow(2.0, -10.0 * t_val);
}

fn ease_expo_in_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val <= 0.0) {
        return 0.0;
    }
    if (t_val >= 1.0) {
        return 1.0;
    }
    if (t_val < 0.5) {
        return pow(2.0, 20.0 * t_val - 10.0) * 0.5;
    }
    return (2.0 - pow(2.0, -20.0 * t_val + 10.0)) * 0.5;
}

// ── Circ ──

fn ease_circ_in(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return -(sqrt(1.0 - t_val * t_val) - 1.0);
}

fn ease_circ_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_circ_in(1.0 - t_val);
}

fn ease_circ_in_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_circ_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_circ_in((1.0 - t_val) * 2.0) * 0.5;
}

// ── Elastic ──

fn ease_elastic_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val <= 0.0) {
        return 0.0;
    }
    if (t_val >= 1.0) {
        return 1.0;
    }
    const p: f32 = 0.3;
    return pow(2.0, -10.0 * t_val) * sin((t_val - p * 0.25) * (2.0 * EASE_PI) / p) + 1.0;
}

fn ease_elastic_in(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val <= 0.0) {
        return 0.0;
    }
    if (t_val >= 1.0) {
        return 1.0;
    }
    return 1.0 - ease_elastic_out(1.0 - t_val);
}

fn ease_elastic_in_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val <= 0.0) {
        return 0.0;
    }
    if (t_val >= 1.0) {
        return 1.0;
    }
    if (t_val < 0.5) {
        return ease_elastic_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_elastic_in((1.0 - t_val) * 2.0) * 0.5;
}

// ── Back ──

fn ease_back_in(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    const s: f32 = 1.70158;
    return t_val * t_val * ((s + 1.0) * t_val - s);
}

fn ease_back_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_back_in(1.0 - t_val);
}

fn ease_back_in_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_back_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_back_in((1.0 - t_val) * 2.0) * 0.5;
}

// ── Bounce ──

fn ease_bounce_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    const div: f32 = 2.75;
    const mult: f32 = 7.5625;
    if (t_val < 1.0 / div) {
        return mult * t_val * t_val;
    }
    if (t_val < 2.0 / div) {
        t_val -= 1.5 / div;
        return mult * t_val * t_val + 0.75;
    }
    if (t_val < 2.5 / div) {
        t_val -= 2.25 / div;
        return mult * t_val * t_val + 0.9375;
    }
    t_val -= 2.625 / div;
    return mult * t_val * t_val + 0.984375;
}

fn ease_bounce_in(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_bounce_out(1.0 - t_val);
}

fn ease_bounce_in_out(t: f32) -> f32 {
    var t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_bounce_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_bounce_in((1.0 - t_val) * 2.0) * 0.5;
}
