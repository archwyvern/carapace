// Compiles a canonical thruster through the WebGL backend and writes a
// standalone WebGL2 HTML harness that compiles/links/renders the emitted GLSL,
// reporting any GL compile/link errors. Used to render-verify the backend
// without the full Skyrat app/DB/auth.
//   node --import tsx scripts/emit-test-harness.mts <out.html> [<canonical.shader>]
import { compile, webglBackend, assembleFragmentShader } from '../src/index.js';
import { writeFileSync, readFileSync } from 'node:fs';

const outPath = process.argv[2] ?? '/tmp/thruster-harness.html';
const srcPath = process.argv[3];

const DEFAULT_SRC = `shader_type canvas_item;
#include <ease>
uniform float u_thrust;
uniform float ASPECT;
uniform sampler2D u_gradient;

void fragment() {
  vec2 c = (UV - vec2(0.5)) * vec2(ASPECT, 1.0);
  float d = length(c) * 2.0;
  float env = 1.0 - smoothstep(0.0, 1.0, d);
  float intensity = env * ease_cubic_out(u_thrust);
  intensity = clamp(intensity, 0.0, 1.0);
  vec4 g = texture(u_gradient, vec2(intensity, 0.5));
  float a = g.a;
  COLOR = vec4(g.rgb * a, a);
}
`;

const src = srcPath ? readFileSync(srcPath, 'utf8') : DEFAULT_SRC;
// Resolve `#include "thruster_common"` (the canonical thruster prelude) like the app does.
const PRELUDE = '/home/archwyvern/Projects/archwyvern.com/apps/skyrat.archwyvern.com/src/lab/thrusters/glsl/thruster_common.cshader';
const includeLoader = (p: string): string | null =>
  (p === 'thruster_common' || p === 'thruster_common.cshader') ? readFileSync(PRELUDE, 'utf8') : null;
const result = compile(src, { backend: webglBackend, includeLoader });
if (!result.success) {
  console.error('CANONICAL COMPILE FAILED:');
  console.error(result.diagnostics.map((d) => `  ${d.line}:${d.column} ${d.message}`).join('\n'));
  process.exit(1);
}
const fragGlsl = assembleFragmentShader(result);
console.log(`compiled OK -- libraries: [${[...result.libraries].join(', ')}], frag length: ${fragGlsl.length}`);

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>thruster harness</title>
<style>body{background:#111;margin:0;font-family:monospace;color:#ddd}
#c{display:block;width:500px;height:100px;background:#000;image-rendering:pixelated}
#log{padding:8px;white-space:pre-wrap;font-size:12px}
.ok{color:#4f4}.err{color:#f44}</style></head>
<body>
<canvas id="c" width="500" height="100"></canvas>
<div id="log">running...</div>
<script id="vs" type="x-shader/x-vertex">#version 300 es
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID & 1) << 2) - 1.0, float((gl_VertexID & 2) << 1) - 1.0);
  v_uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}</script>
<script id="fs" type="x-shader/x-fragment">${fragGlsl}</script>
<script>
const log = document.getElementById('log');
function say(msg, cls){ log.textContent += '\\n' + msg; if(cls) log.className = cls; window.__harness_status = (window.__harness_status||'') + msg + '\\n'; }
try {
  const canvas = document.getElementById('c');
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true });
  if (!gl) throw new Error('no webgl2');
  function sh(type, srcId){
    const s = gl.createShader(type);
    gl.shaderSource(s, document.getElementById(srcId).textContent);
    gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error((type===gl.VERTEX_SHADER?'VS':'FS')+' COMPILE:\\n'+gl.getShaderInfoLog(s));
    return s;
  }
  const vs = sh(gl.VERTEX_SHADER,'vs'); say('VS compiled', 'ok');
  const fs = sh(gl.FRAGMENT_SHADER,'fs'); say('FS compiled', 'ok');
  const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('LINK:\\n'+gl.getProgramInfoLog(prog));
  say('linked', 'ok');
  gl.useProgram(prog);
  // 256x1 gradient: transparent -> opaque hot orange.
  const N=256, px=new Uint8Array(N*4);
  for(let i=0;i<N;i++){ const t=i/(N-1); px[i*4]=255; px[i*4+1]=Math.round(140*t+40); px[i*4+2]=Math.round(60*t); px[i*4+3]=Math.round(255*t); }
  const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,N,1,0,gl.RGBA,gl.UNSIGNED_BYTE,px);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  function setF(n,v){ const l=gl.getUniformLocation(prog,n); if(l) gl.uniform1f(l,v); }
  function setI(n,v){ const l=gl.getUniformLocation(prog,n); if(l) gl.uniform1i(l,v); }
  setF('u_thrust',1.0); setF('TIME',0.0); setF('ASPECT',5.0); setI('u_gradient',0);
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES,0,3);
  const err=gl.getError(); say('draw done, glError='+err, err? 'err':'ok');
  // Sample center pixel to confirm it actually drew something non-black.
  const mid=new Uint8Array(4); gl.readPixels(canvas.width/2|0, canvas.height/2|0, 1,1, gl.RGBA, gl.UNSIGNED_BYTE, mid);
  say('center pixel rgba='+Array.from(mid).join(','), (mid[0]+mid[1]+mid[2])>0?'ok':'err');
  say('HARNESS_OK', 'ok');
} catch(e){ say('HARNESS_FAIL: '+e.message, 'err'); }
</script>
</body></html>`;
writeFileSync(outPath, html);
console.log(`wrote ${outPath}`);
