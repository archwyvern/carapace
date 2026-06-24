import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compile, webglBackend } from './index.js';

describe('compile()', () => {
  it('compiles a minimal fragment shader', () => {
    const result = compile(`
      shader_type canvas_item;
      void fragment() {
        COLOR = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `);
    assert.equal(result.success, true);
    assert.ok(result.codeSections.has('fragment'));
    assert.equal(result.diagnostics.length, 0);
  });

  it('returns diagnostics on syntax error', () => {
    const result = compile('shader_type canvas_item; void fragment() {');
    assert.equal(result.success, false);
    assert.ok(result.diagnostics.length > 0);
  });

  it('returns diagnostics on type error', () => {
    const result = compile(`
      shader_type canvas_item;
      void fragment() { float x = vec2(1.0); }
    `);
    assert.equal(result.success, false);
  });

  it('handles preprocessor macros', () => {
    const result = compile(`
      shader_type canvas_item;
      #define RED vec4(1.0, 0.0, 0.0, 1.0)
      void fragment() { COLOR = RED; }
    `);
    assert.equal(result.success, true);
  });

  it('accepts predefined macros', () => {
    const result = compile(
      `shader_type canvas_item;\nvoid fragment() { float x = float(VER); }`,
      { macros: { VER: '5' } }
    );
    assert.equal(result.success, true);
  });

  it('collects uniform metadata', () => {
    const result = compile(`
      shader_type canvas_item;
      uniform float speed : hint_range(0.0, 10.0) = 1.0;
      uniform sampler2D noise_tex : hint_normal;
      void fragment() {
        float s = speed;
        vec4 c = texture(noise_tex, UV);
      }
    `);
    assert.equal(result.success, true);
    assert.equal(result.uniforms.length, 1);
    assert.equal((result.uniforms[0] as any).name, 'speed');
    assert.equal(result.textures.length, 1);
    assert.equal((result.textures[0] as any).name, 'noise_tex');
  });

  it('collects render mode info', () => {
    const result = compile(`
      shader_type canvas_item;
      render_mode blend_add, unshaded;
      void fragment() { }
    `);
    assert.equal(result.renderModes.blendMode, 'add');
    assert.equal(result.renderModes.unshaded, true);
  });

  it('records requested libraries', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <noise>
      void fragment() { }
    `);
    assert.ok(result.libraries.has('noise'));
  });

  it('returns early on preprocessor error', () => {
    const result = compile('#error bad\nshader_type canvas_item;');
    assert.equal(result.success, false);
    assert.ok(result.diagnostics[0].message.includes('bad'));
  });

  it('compiles shader with user functions and structs', () => {
    const result = compile(`
      shader_type canvas_item;
      struct Light { vec3 color; float intensity; };
      float square(float x) { return x * x; }
      void fragment() {
        Light l = Light(vec3(1.0), square(0.5));
        COLOR = vec4(l.color * l.intensity, 1.0);
      }
    `);
    assert.equal(result.success, true);
  });

  // -- Library integration tests -----------------------------------------------

  it('type-checks noise library functions', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <noise>
      void fragment() {
        float n = noise_simplex(42, UV);
      }
    `);
    assert.equal(result.success, true, result.diagnostics.map(d => d.message).join('; '));
  });

  it('type-checks noise seedless variant', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <noise>
      void fragment() {
        float n = noise_simplex(UV);
      }
    `);
    assert.equal(result.success, true, result.diagnostics.map(d => d.message).join('; '));
  });

  it('type-checks ease library functions', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <ease>
      void fragment() {
        float t = ease_quad_in(0.5);
      }
    `);
    assert.equal(result.success, true, result.diagnostics.map(d => d.message).join('; '));
  });

  it('type-checks blend library functions', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <blend>
      void fragment() {
        vec3 c = blend_add(vec3(1.0), vec3(0.5));
      }
    `);
    assert.equal(result.success, true, result.diagnostics.map(d => d.message).join('; '));
  });

  it('type-checks blend float overload', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <blend>
      void fragment() {
        float c = blend_add(1.0, 0.5);
      }
    `);
    assert.equal(result.success, true, result.diagnostics.map(d => d.message).join('; '));
  });

  it('type-checks blend opacity overload', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <blend>
      void fragment() {
        vec3 c = blend_overlay(vec3(1.0), vec3(0.5), 0.8);
      }
    `);
    assert.equal(result.success, true, result.diagnostics.map(d => d.message).join('; '));
  });

  it('type-checks color library functions', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <color>
      void fragment() {
        vec3 hsv = rgb_to_hsv(vec3(1.0, 0.0, 0.0));
        float lum = luminance(vec3(0.5));
      }
    `);
    assert.equal(result.success, true, result.diagnostics.map(d => d.message).join('; '));
  });

  it('type-checks math library functions', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <math>
      void fragment() {
        vec2 r = rotate(UV, 1.0);
        float s = smin(0.5, 0.3, 0.1);
      }
    `);
    assert.equal(result.success, true, result.diagnostics.map(d => d.message).join('; '));
  });

  it('type-checks random library functions', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <random>
      void fragment() {
        float h = hash11(0.5);
        vec2 d = random_direction_2d(0.5);
      }
    `);
    assert.equal(result.success, true, result.diagnostics.map(d => d.message).join('; '));
  });

  it('errors on library function without include', () => {
    const result = compile(`
      shader_type canvas_item;
      void fragment() {
        float t = ease_quad_in(0.5);
      }
    `);
    assert.equal(result.success, false);
  });

  it('errors on wrong argument types for library function', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <ease>
      void fragment() {
        float t = ease_quad_in(vec2(0.5));
      }
    `);
    assert.equal(result.success, false);
  });

  it('type-checks multiple library includes', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <ease>
      #include <noise>
      #include <math>
      void fragment() {
        float t = ease_quad_in(0.5);
        float n = noise_simplex(42, UV);
        vec2 r = rotate(UV, 1.0);
      }
    `);
    assert.equal(result.success, true, result.diagnostics.map(d => d.message).join('; '));
  });

  it('type-checks fractal noise functions', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <noise>
      void fragment() {
        float n = fractal_fbm_simplex(42, UV, 3, 2.0, 0.5, 0.0);
      }
    `);
    assert.equal(result.success, true, result.diagnostics.map(d => d.message).join('; '));
  });

  it('does not pollute builtins across compile calls', () => {
    // First compile with ease library.
    const r1 = compile(`
      shader_type canvas_item;
      #include <ease>
      void fragment() { float t = ease_quad_in(0.5); }
    `);
    assert.equal(r1.success, true);

    // Second compile WITHOUT ease library -- ease_quad_in must not be known.
    const r2 = compile(`
      shader_type canvas_item;
      void fragment() { float t = ease_quad_in(0.5); }
    `);
    assert.equal(r2.success, false);
  });
});

describe('backend selection', () => {
  it('routes code generation through the injected backend (not the default WGSL one)', () => {
    let called = false;
    const fakeBackend = () => ({
      generate() {
        called = true;
        return {
          codeSections: new Map(),
          userFunctions: '',
          constDeclarations: '',
          uniformBlockMembers: '',
          samplerDeclarations: '',
          bufferDeclarations: '',
          specConstDeclarations: '',
          uniforms: [],
          textures: [],
          buffers: [],
          specConstants: [],
          renderModes: { blendMode: 'mix', unshaded: false, lightOnly: false, skipVertexTransform: false, worldVertexCoords: false },
          rawRenderModes: [],
          diagnostics: [],
        };
      },
    });
    const result = compile('shader_type canvas_item;\nvoid fragment() { COLOR = vec4(1.0, 0.0, 0.0, 1.0); }', { backend: fakeBackend });
    assert.equal(called, true);
    assert.equal(result.success, true);
  });
});

describe('hint_screen_texture', () => {
  const SCREEN_SHADER = `
    shader_type canvas_item;
    uniform sampler2D screen : hint_screen_texture, filter_linear;
    void fragment() { COLOR = texture(screen, SCREEN_UV); }
  `;

  it('flags usesScreenTexture and marks the texture (WGSL)', () => {
    const result = compile(SCREEN_SHADER);
    assert.equal(result.success, true);
    assert.equal(result.usesScreenTexture, true);
    assert.equal(result.usesScreenTextureMipmaps, false);
    assert.equal(result.textures.length, 1);
    assert.equal((result.textures[0] as any).screenTexture, true);
  });

  it('flags usesScreenTexture and marks the texture (WebGL)', () => {
    const result = compile(SCREEN_SHADER, { backend: webglBackend });
    assert.equal(result.success, true);
    assert.equal(result.usesScreenTexture, true);
    assert.equal((result.textures[0] as any).screenTexture, true);
  });

  it('sets usesScreenTextureMipmaps when the filter requests mipmaps', () => {
    const result = compile(`
      shader_type canvas_item;
      uniform sampler2D screen : hint_screen_texture, filter_linear_mipmap;
      void fragment() { COLOR = texture(screen, SCREEN_UV); }
    `);
    assert.equal(result.success, true);
    assert.equal(result.usesScreenTexture, true);
    assert.equal(result.usesScreenTextureMipmaps, true);
  });

  it('leaves a plain sampler unflagged', () => {
    const result = compile(`
      shader_type canvas_item;
      uniform sampler2D tex : hint_normal;
      void fragment() { COLOR = texture(tex, SCREEN_UV); }
    `);
    assert.equal(result.success, true);
    assert.equal(result.usesScreenTexture, false);
    assert.equal((result.textures[0] as any).screenTexture, undefined);
  });
});
