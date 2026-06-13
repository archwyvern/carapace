// ============================================================================
// Easing functions library (GLSL ES 3.00)
// All functions take float t (clamped to [0,1]) and return float in [0,1].
// Converted from ease.wgsl. Ported from Archwyvern.Space2D.Common.EasingFunctions.
// ============================================================================

const float EASE_PI = 3.14159265358979;

// -- Linear --

float ease_linear(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return t_val;
}

// -- Quad --

float ease_quad_in(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return t_val * t_val;
}

float ease_quad_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_quad_in(1.0 - t_val);
}

float ease_quad_in_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_quad_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_quad_in((1.0 - t_val) * 2.0) * 0.5;
}

// -- Cubic --

float ease_cubic_in(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return t_val * t_val * t_val;
}

float ease_cubic_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_cubic_in(1.0 - t_val);
}

float ease_cubic_in_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_cubic_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_cubic_in((1.0 - t_val) * 2.0) * 0.5;
}

// -- Quart --

float ease_quart_in(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return t_val * t_val * t_val * t_val;
}

float ease_quart_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_quart_in(1.0 - t_val);
}

float ease_quart_in_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_quart_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_quart_in((1.0 - t_val) * 2.0) * 0.5;
}

// -- Quint --

float ease_quint_in(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return t_val * t_val * t_val * t_val * t_val;
}

float ease_quint_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_quint_in(1.0 - t_val);
}

float ease_quint_in_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_quint_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_quint_in((1.0 - t_val) * 2.0) * 0.5;
}

// -- Sine --

float ease_sine_in(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return 1.0 - cos(t_val * EASE_PI * 0.5);
}

float ease_sine_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return sin(t_val * EASE_PI * 0.5);
}

float ease_sine_in_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return (1.0 - cos(t_val * EASE_PI)) * 0.5;
}

// -- Expo --

float ease_expo_in(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    if (t_val <= 0.0) {
        return 0.0;
    }
    if (t_val >= 1.0) {
        return 1.0;
    }
    return pow(2.0, 10.0 * (t_val - 1.0));
}

float ease_expo_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    if (t_val <= 0.0) {
        return 0.0;
    }
    if (t_val >= 1.0) {
        return 1.0;
    }
    return 1.0 - pow(2.0, -10.0 * t_val);
}

float ease_expo_in_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
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

// -- Circ --

float ease_circ_in(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return -(sqrt(1.0 - t_val * t_val) - 1.0);
}

float ease_circ_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_circ_in(1.0 - t_val);
}

float ease_circ_in_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_circ_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_circ_in((1.0 - t_val) * 2.0) * 0.5;
}

// -- Elastic --

float ease_elastic_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    if (t_val <= 0.0) {
        return 0.0;
    }
    if (t_val >= 1.0) {
        return 1.0;
    }
    const float p = 0.3;
    return pow(2.0, -10.0 * t_val) * sin((t_val - p * 0.25) * (2.0 * EASE_PI) / p) + 1.0;
}

float ease_elastic_in(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    if (t_val <= 0.0) {
        return 0.0;
    }
    if (t_val >= 1.0) {
        return 1.0;
    }
    return 1.0 - ease_elastic_out(1.0 - t_val);
}

float ease_elastic_in_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
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

// -- Back --

float ease_back_in(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    const float s = 1.70158;
    return t_val * t_val * ((s + 1.0) * t_val - s);
}

float ease_back_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_back_in(1.0 - t_val);
}

float ease_back_in_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_back_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_back_in((1.0 - t_val) * 2.0) * 0.5;
}

// -- Bounce --

float ease_bounce_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    const float div = 2.75;
    const float mult = 7.5625;
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

float ease_bounce_in(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    return 1.0 - ease_bounce_out(1.0 - t_val);
}

float ease_bounce_in_out(float t) {
    float t_val = clamp(t, 0.0, 1.0);
    if (t_val < 0.5) {
        return ease_bounce_in(t_val * 2.0) * 0.5;
    }
    return 1.0 - ease_bounce_in((1.0 - t_val) * 2.0) * 0.5;
}
