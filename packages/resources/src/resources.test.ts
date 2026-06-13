import { describe, it, expect } from "vitest";
import { ColorF, Vector2 } from "@carapace/primitives";
import { Gradient } from "./resources/Gradient";
import { FastNoiseLite } from "./resources/Noise";
import { GradientTexture1D, GradientTexture2D, NoiseTexture2D, CurveTexture, CurveXyzTexture } from "./resources/Texture";
import { Curve } from "./resources/Curve";
import { countModifiedFields, isFieldModified } from "./Resource";
import {
  registerBuiltinResources,
} from "./builtins";
import {
  getResourceClass,
  hasResourceClass,
  instantiateResourceClass,
  isAbstractResourceClass,
} from "./registry";
import { Text, Html, Css, Json, Javascript } from "./resources/Text";
import { Shader, ShaderInclude } from "./resources/Shader";
import { Material, ShaderMaterial } from "./resources/Material";
import { AtlasTexture } from "./resources/AtlasTexture";
import { CanvasItemMaterial } from "./resources/CanvasItemMaterial";
import { ParticleProcessMaterial } from "./resources/ParticleProcessMaterial";
import { ColorPalette } from "./resources/ColorPalette";
import { StyleBox, StyleBoxFlat, StyleBoxLine, StyleBoxTexture } from "./resources/StyleBox";
import { Font, FontFile, FontVariation, SystemFont } from "./resources/Font";
import { LabelSettings } from "./resources/LabelSettings";
import { Theme } from "./resources/Theme";

describe("Text and Shader", () => {
  it("Text holds editable content", () => {
    const t = new Text();
    expect(t.content.get()).toBe("");
    t.content.set("hello");
    expect(t.content.get()).toBe("hello");
  });

  it("Shader extends Text and uses the inherited content as its source", () => {
    const s = new Shader();
    expect(s).toBeInstanceOf(Text);
    s.content.set("shader_type canvas_item;");
    expect(s.content.get()).toBe("shader_type canvas_item;");
    expect(s.typeName).toBe("Shader");
  });

  it("registers Text and Shader as concrete types", () => {
    registerBuiltinResources();
    expect(hasResourceClass("Text")).toBe(true);
    expect(isAbstractResourceClass(getResourceClass("Text")!)).toBe(false);
    expect(instantiateResourceClass(getResourceClass("Shader")!)).toBeInstanceOf(Shader);
  });

  it("Html, Css, Json, Javascript, and ShaderInclude are concrete Text subtypes", () => {
    registerBuiltinResources();
    for (const sub of [new Html(), new Css(), new Json(), new Javascript(), new ShaderInclude()]) {
      expect(sub).toBeInstanceOf(Text);
    }
    for (const name of ["Html", "Css", "Json", "Javascript", "ShaderInclude"]) {
      expect(hasResourceClass(name)).toBe(true);
    }
  });
});

describe("Curve and curve textures", () => {
  it("Curve has domain/value bounds and an empty points array", () => {
    const c = new Curve();
    expect(c.maxValue.get()).toBe(1);
    expect(c.points.get()).toEqual([]);
  });

  it("CurveTexture / CurveXyzTexture reference a Curve and register", () => {
    registerBuiltinResources();
    expect(new CurveTexture().curve.get()).toBeNull();
    expect(new CurveXyzTexture().curveX.get()).toBeNull();
    for (const name of ["Curve", "CurveTexture", "CurveXyzTexture"]) {
      expect(hasResourceClass(name)).toBe(true);
    }
  });
});

describe("Gradient", () => {
  it("starts with a black→white ramp and samples the midpoint", () => {
    const g = new Gradient();
    expect(g.offsets.get()).toEqual([0, 1]);
    expect(g.sample(0.5)).toEqual(new ColorF(0.5, 0.5, 0.5, 1));
  });

  it("adds and removes stops, keeping a minimum of two", () => {
    const g = new Gradient();
    g.addStop(0.5);
    expect(g.stops()).toHaveLength(3);
    g.removeStop(1);
    expect(g.stops()).toHaveLength(2);
    g.removeStop(0); // refuses below two
    expect(g.stops()).toHaveLength(2);
  });
});

describe("texture resources instantiate with Godot defaults", () => {
  it("GradientTexture1D = gradient + width(256) + useHDR", () => {
    const t = new GradientTexture1D();
    expect(t.width.get()).toBe(256);
    expect(t.useHDR.get()).toBe(false);
    expect(t.gradient.get()).toBeNull();
  });

  it("GradientTexture2D defaults to 64×64", () => {
    const t = new GradientTexture2D();
    expect(t.width.get()).toBe(64);
    expect(t.height.get()).toBe(64);
    t.width.set(128);
    expect(t.width.get()).toBe(128);
  });

  it("NoiseTexture2D defaults to 512×512 with no noise", () => {
    const t = new NoiseTexture2D();
    expect(t.width.get()).toBe(512);
    expect(t.noise.get()).toBeNull();
  });
});

describe("FastNoiseLite", () => {
  it("hides cellular fields unless the noise type is Cellular", () => {
    const n = new FastNoiseLite();
    expect(n.visibility().CellularJitter).toBe(false);
    n.noiseType.set("Cellular");
    expect(n.visibility().CellularJitter).toBe(true);
  });

  it("declares Fractal / Cellular / Domain Warp groups", () => {
    const n = new FastNoiseLite();
    expect(n.groups().map(g => g.name)).toEqual(["Fractal", "Cellular", "Domain Warp"]);
  });
});

describe("modified-field detection", () => {
  it("counts fields that differ from their default", () => {
    const t = new GradientTexture2D();
    expect(countModifiedFields(t)).toBe(0);
    t.width.set(128);
    const width = t.findField("Width")!;
    expect(isFieldModified(width)).toBe(true);
    expect(countModifiedFields(t)).toBe(1);
  });

  it("recurses into embedded sub-resources", () => {
    const t = new GradientTexture2D();
    const g = new Gradient();
    g.interpolationMode.set("Cubic");
    t.gradient.set(g);
    // one modified field on the sub-gradient, plus the gradient assignment itself
    expect(countModifiedFields(t)).toBeGreaterThanOrEqual(2);
  });
});

describe("registry", () => {
  it("resolves and instantiates registered concrete classes by name", () => {
    registerBuiltinResources();
    expect(hasResourceClass("GradientTexture2D")).toBe(true);
    const cls = getResourceClass("GradientTexture2D")!;
    const inst = instantiateResourceClass(cls);
    expect(inst).toBeInstanceOf(GradientTexture2D);
    expect(inst.typeName).toBe("GradientTexture2D");
  });

  it("marks abstract bases non-instantiable", () => {
    registerBuiltinResources();
    expect(isAbstractResourceClass(getResourceClass("Texture2D")!)).toBe(true);
    expect(isAbstractResourceClass(getResourceClass("FastNoiseLite")!)).toBe(false);
  });
});

describe("Material and ShaderMaterial", () => {
  it("Material is an abstract base; ShaderMaterial extends it with a shader ref + parameter map", () => {
    const m = new ShaderMaterial();
    expect(m).toBeInstanceOf(Material);
    expect(m.shader.get()).toBeNull();
    expect(m.shaderParameters.get()).toBeInstanceOf(Map);
    expect(m.shaderParameters.get().size).toBe(0);
  });

  it("registers Material abstract and ShaderMaterial concrete", () => {
    registerBuiltinResources();
    expect(isAbstractResourceClass(getResourceClass("Material")!)).toBe(true);
    expect(hasResourceClass("ShaderMaterial")).toBe(true);
    expect(isAbstractResourceClass(getResourceClass("ShaderMaterial")!)).toBe(false);
    expect(instantiateResourceClass(getResourceClass("ShaderMaterial")!)).toBeInstanceOf(ShaderMaterial);
  });

  it("CanvasItemMaterial defaults to Mix/Normal and is a Material", () => {
    const m = new CanvasItemMaterial();
    expect(m).toBeInstanceOf(Material);
    expect(m.blendMode.get()).toBe("Mix");
    expect(m.lightMode.get()).toBe("Normal");
    expect(m.particlesAnimHFrames.get()).toBe(1);
  });
});

describe("ParticleProcessMaterial", () => {
  it("instantiates with Godot defaults and exposes curve resource refs", () => {
    const p = new ParticleProcessMaterial();
    expect(p).toBeInstanceOf(Material);
    expect(p.emissionShape.get()).toBe("Point");
    expect(p.spread.get()).toBe(45);
    expect(p.scaleMin.get()).toBe(1);
    expect(p.direction.get()).toEqual(new Vector2(0, -1));
    expect(p.color.get()).toEqual(new ColorF(1, 1, 1, 1));
    // resource-reference field starts null
    expect(p.angularVelocityCurve.get()).toBeNull();
  });

  it("registers as a concrete type", () => {
    registerBuiltinResources();
    expect(hasResourceClass("ParticleProcessMaterial")).toBe(true);
    expect(isAbstractResourceClass(getResourceClass("ParticleProcessMaterial")!)).toBe(false);
  });
});

describe("StyleBox hierarchy", () => {
  it("StyleBoxFlat has Godot defaults and is a StyleBox", () => {
    const s = new StyleBoxFlat();
    expect(s).toBeInstanceOf(StyleBox);
    expect(s.bgColor.get()).toEqual(new ColorF(0.6, 0.6, 0.6, 1));
    expect(s.drawCenter.get()).toBe(true);
    expect(s.cornerDetail.get()).toBe(8);
    expect(s.antiAliasing.get()).toBe(true);
  });

  it("StyleBoxLine and StyleBoxTexture instantiate and the base is abstract", () => {
    registerBuiltinResources();
    expect(new StyleBoxLine().thickness.get()).toBe(1);
    expect(new StyleBoxTexture().texture.get()).toBeNull();
    expect(isAbstractResourceClass(getResourceClass("StyleBox")!)).toBe(true);
    for (const name of ["StyleBoxFlat", "StyleBoxLine", "StyleBoxTexture"]) {
      expect(isAbstractResourceClass(getResourceClass(name)!)).toBe(false);
    }
  });
});

describe("Font hierarchy", () => {
  it("Font base carries default raster settings; concrete kinds extend it", () => {
    const f = new FontFile();
    expect(f).toBeInstanceOf(Font);
    expect(f.defaultRasterMode.get()).toBe("Grayscale");
    expect(f.defaultHinting.get()).toBe("Light");
    for (const sub of [new FontFile(), new FontVariation(), new SystemFont()]) {
      expect(sub).toBeInstanceOf(Font);
    }
  });

  it("registers Font abstract and its concrete kinds", () => {
    registerBuiltinResources();
    expect(isAbstractResourceClass(getResourceClass("Font")!)).toBe(true);
    for (const name of ["FontFile", "FontVariation", "SystemFont"]) {
      expect(hasResourceClass(name)).toBe(true);
      expect(isAbstractResourceClass(getResourceClass(name)!)).toBe(false);
    }
  });
});

describe("LabelSettings, Theme, ColorPalette, AtlasTexture", () => {
  it("LabelSettings carries font + colour defaults", () => {
    const l = new LabelSettings();
    expect(l.fontSize.get()).toBe(16);
    expect(l.font.get()).toBeNull();
    expect(l.fontColor.get()).toEqual(new ColorF(1, 1, 1, 1));
  });

  it("Theme defaults to base scale 1 and font size -1", () => {
    const t = new Theme();
    expect(t.defaultBaseScale.get()).toBe(1);
    expect(t.defaultFontSize.get()).toBe(-1);
    expect(t.defaultFont.get()).toBeNull();
  });

  it("ColorPalette starts with an empty colour array", () => {
    const p = new ColorPalette();
    expect(p.colors.get()).toEqual([]);
    p.colors.set([new ColorF(1, 0, 0, 1)]);
    expect(p.colors.get()).toHaveLength(1);
  });

  it("AtlasTexture references a Texture2D atlas and registers", () => {
    registerBuiltinResources();
    const a = new AtlasTexture();
    expect(a.atlas.get()).toBeNull();
    expect(a.filterClip.get()).toBe(false);
    expect(hasResourceClass("AtlasTexture")).toBe(true);
  });
});
