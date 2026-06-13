// color.wgsl -- Color utility library (WGSL)
// Converted from color.glsl

// -- Color space conversions --

fn rgb_to_hsv(rgb: vec3f) -> vec3f {
    var r = rgb.r;
    var g = rgb.g;
    var b = rgb.b;
    var cmax = max(r, max(g, b));
    var cmin = min(r, min(g, b));
    var delta = cmax - cmin;

    var h = 0.0;
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

    var s = select(delta / cmax, 0.0, cmax <= 0.0);
    var v = cmax;
    return vec3f(h, s, v);
}

fn hsv_to_rgb(hsv: vec3f) -> vec3f {
    var h = hsv.x * 6.0;
    var s = hsv.y;
    var v = hsv.z;

    var c = v * s;
    var x = c * (1.0 - abs(h - 2.0 * floor(h / 2.0) - 1.0));
    var m = v - c;

    var rgb: vec3f;
    if (h < 1.0) {
        rgb = vec3f(c, x, 0.0);
    } else if (h < 2.0) {
        rgb = vec3f(x, c, 0.0);
    } else if (h < 3.0) {
        rgb = vec3f(0.0, c, x);
    } else if (h < 4.0) {
        rgb = vec3f(0.0, x, c);
    } else if (h < 5.0) {
        rgb = vec3f(x, 0.0, c);
    } else {
        rgb = vec3f(c, 0.0, x);
    }
    return rgb + m;
}

fn rgb_to_hsl(rgb: vec3f) -> vec3f {
    var r = rgb.r;
    var g = rgb.g;
    var b = rgb.b;
    var cmax = max(r, max(g, b));
    var cmin = min(r, min(g, b));
    var delta = cmax - cmin;
    var l = (cmax + cmin) * 0.5;

    var h = 0.0;
    var s = 0.0;

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

    return vec3f(h, s, l);
}

fn _hsl_hue_to_rgb(p: f32, q: f32, t_in: f32) -> f32 {
    var t = t_in;
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

fn hsl_to_rgb(hsl: vec3f) -> vec3f {
    var h = hsl.x;
    var s = hsl.y;
    var l = hsl.z;

    if (s <= 0.0) {
        return vec3f(l);
    }

    var q = select(l + s - l * s, l * (1.0 + s), l < 0.5);
    var p = 2.0 * l - q;

    var r = _hsl_hue_to_rgb(p, q, h + 1.0 / 3.0);
    var g = _hsl_hue_to_rgb(p, q, h);
    var b = _hsl_hue_to_rgb(p, q, h - 1.0 / 3.0);
    return vec3f(r, g, b);
}

// -- Gamma / linear --

fn linear_to_srgb_f(c: f32) -> f32 {
    return select(1.055 * pow(c, 1.0 / 2.4) - 0.055, c * 12.92, c <= 0.0031308);
}

fn linear_to_srgb(c: vec3f) -> vec3f {
    return vec3f(linear_to_srgb_f(c.r), linear_to_srgb_f(c.g), linear_to_srgb_f(c.b));
}

fn srgb_to_linear_f(c: f32) -> f32 {
    return select(pow((c + 0.055) / 1.055, 2.4), c / 12.92, c <= 0.04045);
}

fn srgb_to_linear(c: vec3f) -> vec3f {
    return vec3f(srgb_to_linear_f(c.r), srgb_to_linear_f(c.g), srgb_to_linear_f(c.b));
}

// -- Luminance --

fn luminance(rgb: vec3f) -> f32 {
    return dot(rgb, vec3f(0.2126, 0.7152, 0.0722));
}

// -- Adjustments --

fn adjust_brightness(rgb: vec3f, amount: f32) -> vec3f {
    return rgb + amount;
}

fn adjust_contrast(rgb: vec3f, amount: f32) -> vec3f {
    return (rgb - 0.5) * amount + 0.5;
}

fn adjust_saturation(rgb: vec3f, amount: f32) -> vec3f {
    var lum = luminance(rgb);
    return mix(vec3f(lum), rgb, amount);
}

fn adjust_hue(rgb: vec3f, angle: f32) -> vec3f {
    var hsv = rgb_to_hsv(rgb);
    hsv.x = fract(hsv.x + angle);
    return hsv_to_rgb(hsv);
}

// -- Color temperature --

fn color_temperature(kelvin: f32) -> vec3f {
    // Tanner Helland approximation (1000K - 40000K)
    var temp = clamp(kelvin, 1000.0, 40000.0) / 100.0;

    var r: f32;
    var g: f32;
    var b: f32;

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

    return vec3f(r, g, b) / 255.0;
}

// -- Posterize --

fn posterize(rgb: vec3f, levels: f32) -> vec3f {
    var lv = max(levels, 1.0);
    return floor(rgb * lv) / lv;
}
