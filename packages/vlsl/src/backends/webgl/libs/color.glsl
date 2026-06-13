// color.glsl -- Color utility library (GLSL ES 3.00)
// Converted from color.wgsl

// -- Color space conversions --

vec3 rgb_to_hsv(vec3 rgb) {
    float r = rgb.r;
    float g = rgb.g;
    float b = rgb.b;
    float cmax = max(r, max(g, b));
    float cmin = min(r, min(g, b));
    float delta = cmax - cmin;

    float h = 0.0;
    if (delta > 0.0) {
        if (cmax == r) {
            h = (g - b) / delta;
            h = h - 6.0 * floor(h / 6.0);
        } else if (cmax == g) {
            h = (b - r) / delta + 2.0;
        } else {
            h = (r - g) / delta + 4.0;
        }
        h /= 6.0;
        if (h < 0.0) {
            h += 1.0;
        }
    }

    float s = (cmax <= 0.0 ? 0.0 : delta / cmax);
    float v = cmax;
    return vec3(h, s, v);
}

vec3 hsv_to_rgb(vec3 hsv) {
    float h = hsv.x * 6.0;
    float s = hsv.y;
    float v = hsv.z;

    float c = v * s;
    float x = c * (1.0 - abs(h - 2.0 * floor(h / 2.0) - 1.0));
    float m = v - c;

    vec3 rgb;
    if (h < 1.0) {
        rgb = vec3(c, x, 0.0);
    } else if (h < 2.0) {
        rgb = vec3(x, c, 0.0);
    } else if (h < 3.0) {
        rgb = vec3(0.0, c, x);
    } else if (h < 4.0) {
        rgb = vec3(0.0, x, c);
    } else if (h < 5.0) {
        rgb = vec3(x, 0.0, c);
    } else {
        rgb = vec3(c, 0.0, x);
    }
    return rgb + m;
}

vec3 rgb_to_hsl(vec3 rgb) {
    float r = rgb.r;
    float g = rgb.g;
    float b = rgb.b;
    float cmax = max(r, max(g, b));
    float cmin = min(r, min(g, b));
    float delta = cmax - cmin;
    float l = (cmax + cmin) * 0.5;

    float h = 0.0;
    float s = 0.0;

    if (delta > 0.0) {
        s = delta / (1.0 - abs(2.0 * l - 1.0));

        if (cmax == r) {
            h = (g - b) / delta;
            h = h - 6.0 * floor(h / 6.0);
        } else if (cmax == g) {
            h = (b - r) / delta + 2.0;
        } else {
            h = (r - g) / delta + 4.0;
        }
        h /= 6.0;
        if (h < 0.0) {
            h += 1.0;
        }
    }

    return vec3(h, s, l);
}

float _hsl_hue_to_rgb(float p, float q, float t_in) {
    float t = t_in;
    if (t < 0.0) {
        t += 1.0;
    }
    if (t > 1.0) {
        t -= 1.0;
    }
    if (t < 1.0 / 6.0) {
        return p + (q - p) * 6.0 * t;
    }
    if (t < 0.5) {
        return q;
    }
    if (t < 2.0 / 3.0) {
        return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    }
    return p;
}

vec3 hsl_to_rgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;

    if (s <= 0.0) {
        return vec3(l);
    }

    float q = (l < 0.5 ? l * (1.0 + s) : l + s - l * s);
    float p = 2.0 * l - q;

    float r = _hsl_hue_to_rgb(p, q, h + 1.0 / 3.0);
    float g = _hsl_hue_to_rgb(p, q, h);
    float b = _hsl_hue_to_rgb(p, q, h - 1.0 / 3.0);
    return vec3(r, g, b);
}

// -- Gamma / linear --

float linear_to_srgb_f(float c) {
    return (c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055);
}

vec3 linear_to_srgb(vec3 c) {
    return vec3(linear_to_srgb_f(c.r), linear_to_srgb_f(c.g), linear_to_srgb_f(c.b));
}

float srgb_to_linear_f(float c) {
    return (c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4));
}

vec3 srgb_to_linear(vec3 c) {
    return vec3(srgb_to_linear_f(c.r), srgb_to_linear_f(c.g), srgb_to_linear_f(c.b));
}

// -- Luminance --

float luminance(vec3 rgb) {
    return dot(rgb, vec3(0.2126, 0.7152, 0.0722));
}

// -- Adjustments --

vec3 adjust_brightness(vec3 rgb, float amount) {
    return rgb + amount;
}

vec3 adjust_contrast(vec3 rgb, float amount) {
    return (rgb - 0.5) * amount + 0.5;
}

vec3 adjust_saturation(vec3 rgb, float amount) {
    float lum = luminance(rgb);
    return mix(vec3(lum), rgb, amount);
}

vec3 adjust_hue(vec3 rgb, float angle) {
    vec3 hsv = rgb_to_hsv(rgb);
    hsv.x = fract(hsv.x + angle);
    return hsv_to_rgb(hsv);
}

// -- Color temperature --

vec3 color_temperature(float kelvin) {
    // Tanner Helland approximation (1000K - 40000K)
    float temp = clamp(kelvin, 1000.0, 40000.0) / 100.0;

    float r;
    float g;
    float b;

    // Red
    if (temp <= 66.0) {
        r = 255.0;
    } else {
        r = 329.698727446 * pow(temp - 60.0, -0.1332047592);
        r = clamp(r, 0.0, 255.0);
    }

    // Green
    if (temp <= 66.0) {
        g = 99.4708025861 * log(temp) - 161.1195681661;
    } else {
        g = 288.1221695283 * pow(temp - 60.0, -0.0755148492);
    }
    g = clamp(g, 0.0, 255.0);

    // Blue
    if (temp >= 66.0) {
        b = 255.0;
    } else if (temp <= 19.0) {
        b = 0.0;
    } else {
        b = 138.5177312231 * log(temp - 10.0) - 305.0447927307;
        b = clamp(b, 0.0, 255.0);
    }

    return vec3(r, g, b) / 255.0;
}

// -- Posterize --

vec3 posterize(vec3 rgb, float levels) {
    float lv = max(levels, 1.0);
    return floor(rgb * lv) / lv;
}
