// === Vanilla WebGL star map with LANES + Hover Highlight + Rename + Select + System Panel (Edit Mode) + ADD SYSTEM MODE ===
const canvas = document.getElementById('gl');
let gl = canvas.getContext('webgl2', { antialias: true });
if (!gl) gl = canvas.getContext('webgl', { antialias: true });
if (!gl) { alert('WebGL not supported'); throw new Error('WebGL not supported'); }

console.log('[SGN] Booting…');

// Resize
function resize() {
  const dpr = 1;
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  gl.viewport(0, 0, canvas.width, canvas.height);
}
addEventListener('resize', resize);
resize();

// --- tiny matrix helpers ---
function mat4Mul(a, b) {
  const o = new Float32Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++)
    o[r*4+c] =
      a[r*4+0]*b[0*4+c] +
      a[r*4+1]*b[1*4+c] +
      a[r*4+2]*b[2*4+c] +
      a[r*4+3]*b[3*4+c];
  return o;
}
function mat4Perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([
    f/aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far+near)*nf, -1,
    0, 0, (2*far*near)*nf, 0
  ]);
}
function mat4Translate(x, y, z) {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);
}
function mat4RotateY(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([ c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1 ]);
}
function mat4RotateX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([ 1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1 ]);
}
function mat4Invert(m){
  const a = m, out = new Float32Array(16);
  const a00=a[0],a01=a[1],a02=a[2],a03=a[3],
        a10=a[4],a11=a[5],a12=a[6],a13=a[7],
        a20=a[8],a21=a[9],a22=a[10],a23=a[11],
        a30=a[12],a31=a[13],a32=a[14],a33=a[15];

  const b00=a00*a11 - a01*a10;
  const b01=a00*a12 - a02*a10;
  const b02=a00*a13 - a03*a10;
  const b03=a01*a12 - a02*a11;
  const b04=a01*a13 - a03*a11;
  const b05=a02*a13 - a03*a12;
  const b06=a20*a31 - a21*a30;
  const b07=a20*a32 - a22*a30;
  const b08=a20*a33 - a23*a30;
  const b09=a21*a32 - a22*a31;
  const b10=a21*a33 - a23*a31;
  const b11=a22*a33 - a23*a32;

  let det = b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06;
  if (!det) return null;
  det = 1.0 / det;

  out[0]  = ( a11*b11 - a12*b10 + a13*b09) * det;
  out[1]  = (-a01*b11 + a02*b10 - a03*b09) * det;
  out[2]  = ( a31*b05 - a32*b04 + a33*b03) * det;
  out[3]  = (-a21*b05 + a22*b04 - a23*b03) * det;
  out[4]  = (-a10*b11 + a12*b08 - a13*b07) * det;
  out[5]  = ( a00*b11 - a02*b08 + a03*b07) * det;
  out[6]  = (-a30*b05 + a32*b02 - a33*b01) * det;
  out[7]  = ( a20*b05 - a22*b02 + a23*b01) * det;
  out[8]  = ( a10*b10 - a11*b08 + a13*b06) * det;
  out[9]  = (-a00*b10 + a01*b08 - a03*b06) * det;
  out[10] = ( a30*b04 - a31*b02 + a33*b00) * det;
  out[11] = (-a20*b04 + a21*b02 - a23*b00) * det;
  out[12] = (-a10*b09 + a11*b07 - a12*b06) * det;
  out[13] = ( a00*b09 - a01*b07 + a02*b06) * det;
  out[14] = (-a30*b03 + a31*b01 - a32*b00) * det;
  out[15] = ( a20*b03 - a21*b01 + a22*b00) * det;
  return out;
}
function vec4MulMat(m, v){
  const x=v[0],y=v[1],z=v[2],w=v[3];
  return new Float32Array([
    m[0]*x + m[4]*y + m[8]*z  + m[12]*w,
    m[1]*x + m[5]*y + m[9]*z  + m[13]*w,
    m[2]*x + m[6]*y + m[10]*z + m[14]*w,
    m[3]*x + m[7]*y + m[11]*z + m[15]*w
  ]);
}

// --- shader helpers ---
function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw gl.getShaderInfoLog(s);
  return s;
}
function makeProgram(vsSrc, fsSrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw gl.getProgramInfoLog(p);
  return p;
}

// --- programs: points + lines ---
const VS_POINTS = `
attribute vec3 position;
uniform mat4 uMVP;
uniform float uPointSize;
void main(){
  gl_Position = uMVP * vec4(position, 1.0);
  gl_PointSize = uPointSize;
}`;
const FS_POINTS = `
precision mediump float;
uniform vec3 uColor;
void main(){
  vec2 uv = gl_PointCoord*2.0 - 1.0;
  float d = dot(uv,uv);
  float alpha = smoothstep(1.0, 0.8, 1.0 - d);
  gl_FragColor = vec4(uColor, alpha);
}`;
const VS_LINES = `
attribute vec3 position;
uniform mat4 uMVP;
void main(){
  gl_Position = uMVP * vec4(position, 1.0);
}`;
const FS_LINES = `
precision mediump float;
uniform vec3 uColor;
void main(){ gl_FragColor = vec4(uColor, 1.0); }`;

const progPoints = makeProgram(VS_POINTS, FS_POINTS);
const progLines  = makeProgram(VS_LINES,  FS_LINES);

// --- uniforms/attribs (points + lines) ---
let aPos_points, uMVP_points, uSize, uColorPts;
let aPos_lines,  uMVP_lines,  uColorLines;

aPos_points = gl.getAttribLocation(progPoints, 'position');
uMVP_points = gl.getUniformLocation(progPoints, 'uMVP');
uSize       = gl.getUniformLocation(progPoints, 'uPointSize');
uColorPts   = gl.getUniformLocation(progPoints, 'uColor');

aPos_lines  = gl.getAttribLocation(progLines,  'position');
uMVP_lines  = gl.getUniformLocation(progLines, 'uMVP');
uColorLines = gl.getUniformLocation(progLines, 'uColor');

// --- HALO shaders (hover + selection) ---
const VS_HALO = `
attribute vec3 position;
uniform mat4 uMVP;
uniform float uPixelSize;
void main(){
  gl_Position = uMVP * vec4(position, 1.0);
  gl_PointSize = uPixelSize; // size in pixels
}`;
const FS_HALO = `
precision mediump float;
uniform float uTime;
uniform vec3 uColGlow;
uniform vec3 uColCore;

void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r = length(uv);

  float inner = 0.55;
  float outer = 0.85;
  float ring = smoothstep(inner, inner+0.02, r) * (1.0 - smoothstep(outer-0.02, outer, r));

  float ang = atan(uv.y, uv.x);
  float turns = 3.0;
  float speed = 1.8;
  float phase = fract((ang / 6.2831853) * turns + uTime * speed);
  float scanner = smoothstep(0.05, 0.0, abs(phase - 0.5) - 0.25);

  float glow = exp(-6.0 * (r*r));

  vec3 col = mix(uColGlow, uColCore, 0.35);
  float alpha = clamp(ring * (0.55 + 0.45*scanner) + glow*0.15, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}`;

const progHalo = makeProgram(VS_HALO, FS_HALO);
const aPos_halo   = gl.getAttribLocation(progHalo, 'position');
const uMVP_halo   = gl.getUniformLocation(progHalo, 'uMVP');
const uPix_halo   = gl.getUniformLocation(progHalo, 'uPixelSize');
const uTime_halo  = gl.getUniformLocation(progHalo, 'uTime');
const uColGlow    = gl.getUniformLocation(progHalo, 'uColGlow');
const uColCore    = gl.getUniformLocation(progHalo, 'uColCore');

// --- camera/orbit/pan ---
let yaw = 0, pitch = 0, dist = 1800, dragging = false, lx = 0, ly = 0;
let panning = false, panX = 0, panY = 0;

// prevent context menu during RMB pan
canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mousedown', e => {
  lx = e.clientX; ly = e.clientY;
  if (e.button === 2) panning = true;   // right button -> pan
  else dragging = true;                 // left button  -> orbit / select / add
});
addEventListener('mouseup', () => { dragging = false; panning = false; });
addEventListener('mousemove', e => {
  const dx = e.clientX - lx, dy = e.clientY - ly;
  lx = e.clientX; ly = e.clientY;
  if (dragging) {
    if (!addMode) {
      yaw   += dx * 0.005;
      pitch += dy * 0.005;
      pitch = Math.max(-1.55, Math.min(1.55, pitch));
    }
  } else if (panning) {
    const s = dist / 1000;  // pan speed scales with zoom distance
    panX -= dx * s;
    panY += dy * s;
  }
});
addEventListener('wheel', e => {
  dist *= (1 + Math.sign(e.deltaY) * 0.12);
  dist = Math.max(300, Math.min(6000, dist));
});

// --- data buffers ---
let starsVBO = null, starCount = 0;
let linesVBO = null, lineVertCount = 0;

// JSON path
const jsonURL = './systems.json';

// Globals for interactivity/export
let idToWorld = new Map();
let systems = [];
let lanesSet = new Set();
let imgW = 1090, imgH = 1494, worldW = 2200, worldH = 2200*(1090/1494);

// Hover tooltip + hover id
const tip = document.createElement('div');
tip.style.cssText = "position:fixed;padding:6px 8px;background:#111c;border:1px solid #444;border-radius:8px;pointer-events:none;display:none;color:#fff;font:12px/1.3 system-ui";
document.body.appendChild(tip);
let mouseX = 0, mouseY = 0;
addEventListener('mousemove', (e)=>{ mouseX = e.clientX; mouseY = e.clientY; });

let hoveredId = null;         // hovered system id
let selectedId = null;        // sticky selection
let haloVBO = null;           // single-vertex buffer for halos
let t0 = performance.now();   // time base for animation

// === simple editor auth ===
let editorOK = sessionStorage.getItem('starmap_editor_ok') === '1';
function requireEditor() {
  if (editorOK) return true;
  const pw = prompt('Enter editor password:');
  if (pw === '1776') {
    editorOK = true;
    sessionStorage.setItem('starmap_editor_ok', '1');
    updateHUD?.();
    return true;
  }
  alert('Incorrect password.');
  return false;
}

// === HOLOGRAM: widget container (DOM) — HIGH DETAIL VERSION ===
const HOLO_DETAIL = 'high'; // 'high' | 'medium' (stroke thickness scales)
const HOLO_COLOR  = '#90faff';

const holo = document.createElement('div');
holo.id = 'holo';
holo.className = 'off';
holo.innerHTML = `
  <div class="holo-wrap">
    <div id="holo-canvas" aria-label="Holographic object"></div>
    <div class="holo-overlay"></div>
    <button class="holo-close" title="Close">✕</button>
    <div class="holo-label">Hologram</div>
  </div>
`;
document.body.appendChild(holo);

(function mountHoloStyles(){
  const style = document.createElement('style');
  style.textContent = `
  #holo{position:fixed;left:14px;bottom:14px;z-index:12;width:300px;height:300px;
        pointer-events:none;opacity:0;transform:translateY(8px) scale(.98);
        transition:opacity .18s,transform .18s}
  #holo.on{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
  #holo .holo-wrap{position:relative;width:100%;height:100%;
        background:radial-gradient(180px 180px at 60% 60%,#0af2,transparent 70%),
                   radial-gradient(70px 70px at 30% 30%,#08f2,transparent 60%);
        border:1px solid #2ad; border-radius:14px; padding:10px;
        box-shadow:0 0 28px #0ff4,inset 0 0 16px #0ff2; backdrop-filter:blur(3px)}
  #holo #holo-canvas{position:absolute;inset:10px}
  #holo .holo-overlay{
        position:absolute;inset:10px;border-radius:10px;pointer-events:none;
        background:
          repeating-linear-gradient(transparent 0 2px,#0ff1 2px 4px),
          radial-gradient(120px 120px at 60% 60%,#0ff1,transparent 70%);
        mix-blend-mode:screen;opacity:.1}
  #holo .holo-label{position:absolute;left:12px;bottom:8px;color:#cfffff;
        font:12px/1.2 system-ui;text-shadow:0 0 6px #0ff;letter-spacing:.3px}
  #holo .holo-close{position:absolute;right:8px;top:6px;width:24px;height:24px;
        border-radius:7px;border:1px solid #3bd;background:#083247cc;color:#cff;
        cursor:pointer;font-weight:700;box-shadow:0 0 6px #0ff4}
  /* Subtle vibration */
  #holo.on .holo-wrap{animation:holo-breathe 2.6s ease-in-out infinite}
  @keyframes holo-breathe{0%,100%{filter:saturate(1)}50%{filter:saturate(1.2)}}
  `;
  document.head.appendChild(style);
})();

const holoCanvas = document.getElementById('holo-canvas');
const holoLabel  = holo.querySelector('.holo-label');
holo.querySelector('.holo-close').onclick = () => hideHolo();
window.addEventListener('keydown', e => { if (e.key === 'Escape') hideHolo(); });

function showHoloVector(type='Shield world', label='Object'){
  holoCanvas.innerHTML = '';
  const svg = makeSVGFor(type);
  holoCanvas.appendChild(svg);
  holoLabel.textContent = label || (type || 'Hologram');
  holo.classList.add('on');
}
function hideHolo(){ holo.classList.remove('on'); }

// ====== High-detail SVG builder ======
const NS = 'http://www.w3.org/2000/svg';
function S(tag, attrs={}, children=[]){
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  (Array.isArray(children)?children:[children]).forEach(c=> c && el.appendChild(c));
  return el;
}

// Shared defs: multi-glow, grain, chromatic bleed, and scan ring gradient
function buildDefs() {
  return S('defs',{},[
    // Gaussian multi-glow
    S('filter',{id:'glow',x:'-40%',y:'-40%',width:'180%',height:'180%'},
      [
        S('feGaussianBlur',{in:'SourceGraphic',stdDeviation:'1.2',result:'b1'}),
        S('feGaussianBlur',{in:'SourceGraphic',stdDeviation:'2.4',result:'b2'}),
        S('feMerge',{},[
          S('feMergeNode',{in:'b2'}),
          S('feMergeNode',{in:'b1'}),
          S('feMergeNode',{in:'SourceGraphic'}),
        ])
      ]
    ),
    // Subtle static/grain via turbulence
    S('filter',{id:'grain',x:'-20%',y:'-20%',width:'140%',height:'140%'},
      [
        S('feTurbulence',{type:'fractalNoise', baseFrequency:'0.9', numOctaves:'1', seed:'7', result:'n'}),
        S('feColorMatrix',{in:'n', type:'saturate', values:'0'}),
        S('feBlend',{in:'SourceGraphic', in2:'n', mode:'screen', result:'blend'})
      ]
    ),
    // Chromatic outline (faux aberration)
    S('filter',{id:'chromatic',x:'-30%',y:'-30%',width:'160%',height:'160%'},
      [
        S('feOffset',{dx:'0.35', dy:'0.35', result:'off1'}),
        S('feColorMatrix',{in:'off1', type:'matrix',
          values:'1 0 0 0 0  0 .5 0 0 0  0 0 .9 0 0  0 0 0 1 0', result:'c1'}),
        S('feMerge',{},[
          S('feMergeNode',{in:'c1'}),
          S('feMergeNode',{in:'SourceGraphic'})
        ])
      ]
    ),
    // Gradient used for hotspots
    S('radialGradient',{id:'hot',cx:'50%',cy:'50%',r:'50%'},
      [S('stop',{offset:'0%','stop-color':'#e7ffff'}),
       S('stop',{offset:'100%','stop-color':HOLO_COLOR, 'stop-opacity':'0.1'})]
    ),
    // Ring sweep gradient
    S('linearGradient',{id:'sweep',x1:'0%',y1:'0%',x2:'100%',y2:'0%'},
      [S('stop',{offset:'0%','stop-color':HOLO_COLOR,'stop-opacity':'.05'}),
       S('stop',{offset:'50%','stop-color':HOLO_COLOR,'stop-opacity':'1'}),
       S('stop',{offset:'100%','stop-color':HOLO_COLOR,'stop-opacity':'.05'})]
    )
  ]);
}

function baseSVG() {
  // Larger viewBox for precision; strokes adapt by HOLO_DETAIL
  const stroke = HOLO_DETAIL === 'high' ? 1.35 : 1.0;
  const svg = S('svg',{
    viewBox:'0 0 200 200', width:'100%', height:'100%',
    fill:'none', stroke:HOLO_COLOR, 'stroke-width':String(stroke),
    'shape-rendering':'geometricPrecision'
  });
  svg.appendChild(buildDefs());
  return svg;
}

function addPolarGrid(svg) {
  // Fine sci-fi polar grid + angle ticks (under the model)
  const grid = S('g',{opacity:'.35', filter:'url(#grain)'});
  const circles = [20,35,50,65,80].map(r => S('circle',{cx:100, cy:100, r}));
  circles.forEach(c=>grid.appendChild(c));
  for (let i=0;i<36;i++){
    const a = (i/36)*Math.PI*2, r1 = 18, r2 = 82;
    const x1=100+Math.cos(a)*r1, y1=100+Math.sin(a)*r1;
    const x2=100+Math.cos(a)*r2, y2=100+Math.sin(a)*r2;
    grid.appendChild(S('line',{x1,y1,x2,y2,opacity:(i%3===0)?'.5':'.25'}));
  }
  svg.appendChild(grid);
}

function addSweepingRings(svg) {
  // Slow sweeping rings for a scanning feel
  const stroke = HOLO_DETAIL === 'high' ? 1.1 : 0.9;
  const g = S('g',{opacity:'.9','stroke-width':String(stroke)});
  const ring1 = S('circle',{cx:100,cy:100,r:87,stroke:'url(#sweep)'});
  const ring2 = S('circle',{cx:100,cy:100,r:92,stroke:'url(#sweep)'});
  g.appendChild(ring1); g.appendChild(ring2);
  g.style.animation = 'sweep1 8s linear infinite';
  svg.appendChild(g);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes sweep1 { 0%{transform:rotate(0deg);transform-origin:100px 100px}
                        100%{transform:rotate(360deg);transform-origin:100px 100px} }
  `;
  svg.appendChild(style);
}

// ——— High-detail silhouette builders ———

// INSTALLATION (Lesser Ark) — star-like arms with panel ribs + hotspots
function svgLesserArk(){
  const svg = baseSVG();
  addPolarGrid(svg);
  addSweepingRings(svg);

  const body = S('g',{filter:'url(#chromatic)'});
  // Core glow
  body.appendChild(S('circle',{cx:100, cy:100, r:10, fill:'url(#hot)', stroke:'none', filter:'url(#glow)'}));

  // Eight curved arms shaped by bezier arcs
  const arms = S('g', {opacity:'.95'});
  for (let i=0;i<8;i++){
    const a = (i/8)*Math.PI*2;
    const r1 = 20, r2 = 78;
    const w  = 8;
    const x1 = 100 + Math.cos(a)*r1, y1 = 100 + Math.sin(a)*r1;
    const x2 = 100 + Math.cos(a)*r2, y2 = 100 + Math.sin(a)*r2;
    // slightly bowed arm using quadratic control halfway, offset orthogonal
    const nx = Math.cos(a+Math.PI/2), ny = Math.sin(a+Math.PI/2);
    const cx = 100 + Math.cos(a)*((r1+r2)/2) + nx*10;
    const cy = 100 + Math.sin(a)*((r1+r2)/2) + ny*10;

    const pathOuter = `M ${x1 - nx*w},${y1 - ny*w} Q ${cx},${cy} ${x2 - nx*2},${y2 - ny*2}`;
    const pathInner = `M ${x1 + nx*w},${y1 + ny*w} Q ${cx},${cy} ${x2 + nx*2},${y2 + ny*2}`;
    arms.appendChild(S('path',{d:pathOuter}));
    arms.appendChild(S('path',{d:pathInner, opacity:'.7'}));

    // arm ribs
    for (let t=0.18;t<=0.82;t+=0.16){
      const rx = (1-t)*x1 + t*x2, ry = (1-t)*y1 + t*y2;
      const rxO = rx - nx*(w*0.6), ryO = ry - ny*(w*0.6);
      const rxI = rx + nx*(w*0.6), ryI = ry + ny*(w*0.6);
      arms.appendChild(S('line',{x1:rxO,y1:ryO,x2:rxI,y2:ryI,opacity:'.5'}));
    }

    // tip beacons
    const tx = 100 + Math.cos(a)*(r2+4), ty = 100 + Math.sin(a)*(r2+4);
    arms.appendChild(S('circle',{cx:tx, cy:ty, r:1.6, fill:'url(#hot)', stroke:'none', filter:'url(#glow)'}));
  }
  body.appendChild(arms);

  // Foundry ring with small docking nodes
  const foundry = S('g',{opacity:'.9'});
  foundry.appendChild(S('circle',{cx:100,cy:100,r:55}));
  for (let i=0;i<24;i++){
    const a = (i/24)*Math.PI*2, r=55;
    const x=100+Math.cos(a)*r, y=100+Math.sin(a)*r;
    const nx=Math.cos(a+Math.PI/2), ny=Math.sin(a+Math.PI/2);
    foundry.appendChild(S('line',{x1:x-nx*3,y1:y-ny*3,x2:x+nx*3,y2:y+ny*3,opacity:'.55'}));
  }
  body.appendChild(foundry);

  // slow rotation to sell “3D” parallax
  body.style.transformOrigin = '100px 100px';
  body.style.animation = 'spinArk 36s linear infinite';
  const style = document.createElement('style');
  style.textContent = `@keyframes spinArk { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`;
  svg.appendChild(style);

  svg.appendChild(body);
  return svg;
}

// SHIELD WORLD — ring + equatorial trench + pole nodes
function svgShieldWorld(){
  const svg = baseSVG();
  addPolarGrid(svg); addSweepingRings(svg);

  const g = S('g',{filter:'url(#chromatic)'});
  // Outer defense ring
  g.appendChild(S('circle',{cx:100,cy:100,r:70}));
  // Equatorial trench (thickened)
  g.appendChild(S('circle',{cx:100,cy:100,r:40,'stroke-width':HOLO_DETAIL==='high'?'2.2':'1.8'}));
  // Meridians
  for (let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2; const r1=25,r2=70;
    const x1=100+Math.cos(a)*r1, y1=100+Math.sin(a)*r1;
    const x2=100+Math.cos(a)*r2, y2=100+Math.sin(a)*r2;
    g.appendChild(S('line',{x1,y1,x2,y2,opacity:'.55'}));
  }
  // Poles
  g.appendChild(S('circle',{cx:100,cy:60,r:3,fill:'url(#hot)',stroke:'none',filter:'url(#glow)'}));
  g.appendChild(S('circle',{cx:100,cy:140,r:3,fill:'url(#hot)',stroke:'none',filter:'url(#glow)'}));
  svg.appendChild(g);
  return svg;
}

// ECUMENOPOLIS — dense arcology rings + “highways”
function svgEcumenopolis(){
  const svg = baseSVG();
  addPolarGrid(svg); addSweepingRings(svg);
  const g = S('g',{filter:'url(#chromatic)'});

  // city shell
  g.appendChild(S('circle',{cx:100,cy:100,r:58,opacity:'.95'}));
  // layered ring roads
  [50,42,34,26].forEach(r => g.appendChild(S('circle',{cx:100,cy:100,r,opacity:'.65'})));
  // radial highways
  for (let i=0;i<24;i++){
    const a=(i/24)*Math.PI*2; const r1=18,r2=58;
    const x1=100+Math.cos(a)*r1, y1=100+Math.sin(a)*r1;
    const x2=100+Math.cos(a)*r2, y2=100+Math.sin(a)*r2;
    g.appendChild(S('line',{x1,y1,x2,y2,opacity:(i%3===0)?'.85':'.35'}));
  }
  // districts (short arcs)
  for (let i=0;i<12;i++){
    const a0=(i/12)*360, a1=a0+18;
    g.appendChild(S('path',{d:arcPath(100,100,50, a0,a1), opacity:'.9'}));
    g.appendChild(S('path',{d:arcPath(100,100,42, a0+8,a1+12), opacity:'.6'}));
  }

  svg.appendChild(g);
  return svg;
}

// GAS GIANT — banding + vortex
function svgGas(){
  const svg = baseSVG();
  addPolarGrid(svg);
  const g = S('g',{filter:'url(#chromatic)'});
  g.appendChild(S('circle',{cx:100,cy:100,r:62, opacity:'.25'}));
  const bands = [ -28,-18,-9,0,9,18,27 ];
  bands.forEach((y,i)=>{
    const amp = i%2?6:4;
    g.appendChild(S('path',{d:wave(30,y,140,amp,3), opacity:'.95'}));
  });
  // vortex eye
  g.appendChild(S('circle',{cx:148,cy:120,r:5,fill:'url(#hot)',stroke:'none',filter:'url(#glow)'}));
  svg.appendChild(g);
  addSweepingRings(svg);
  return svg;
}

// ROCKY — terrain cracks + crater field
function svgRocky(){
  const svg = baseSVG();
  addPolarGrid(svg); addSweepingRings(svg);
  const g = S('g',{filter:'url(#chromatic)'});
  g.appendChild(S('circle',{cx:100,cy:100,r:55,opacity:'.95'}));
  // cracks
  [['M72,110 L120,84','M86,132 L128,106','M70,90 L92,70']].forEach(d=>g.appendChild(S('path',{d:d[0],opacity:'.6'})));
  // craters
  [[122,88,4],[86,116,6],[104,128,3],[80,86,2]].forEach(([x,y,r])=>{
    g.appendChild(S('circle',{cx:x,cy:y,r,opacity:'.9'}));
    g.appendChild(S('circle',{cx:x,cy:y,r:r*1.6,opacity:'.25','stroke-dasharray':'2 2'}));
  });
  svg.appendChild(g);
  return svg;
}

// OCEAN — layered swells
function svgOcean(){
  const svg = baseSVG();
  addPolarGrid(svg); addSweepingRings(svg);
  const g = S('g',{filter:'url(#chromatic)'});
  g.appendChild(S('circle',{cx:100,cy:100,r:56,opacity:'.95'}));
  [24,34,44,54].forEach((r,i)=>{
    const y=100;
    g.appendChild(S('path',{d:`M ${100-r},${y} A ${r} ${r} 0 0 1 ${100+r},${y}`, opacity:String(.45 + i*0.1)}));
  });
  svg.appendChild(g);
  return svg;
}

// ICE — fault lines + meridional arcs
function svgIce(){
  const svg = baseSVG();
  addPolarGrid(svg); addSweepingRings(svg);
  const g = S('g',{filter:'url(#chromatic)'});
  g.appendChild(S('circle',{cx:100,cy:100,r:56,opacity:'.95'}));
  [['M60,70 L140,130'],['M52,110 L148,90'],['M90,60 L110,140']].forEach(d=>g.appendChild(S('path',{d:d[0],opacity:'.75'})));
  [20,32,44].forEach(r=> g.appendChild(S('circle',{cx:100,cy:100,r,opacity:'.35'})));
  svg.appendChild(g);
  return svg;
}

// --- helpers for shapes ---
function arcPath(cx,cy,r, a0deg,a1deg){
  const a0 = a0deg*Math.PI/180, a1 = a1deg*Math.PI/180;
  const x0 = cx + Math.cos(a0)*r, y0 = cy + Math.sin(a0)*r;
  const x1 = cx + Math.cos(a1)*r, y1 = cy + Math.sin(a1)*r;
  const large = (a1-a0) % (Math.PI*2) > Math.PI ? 1 : 0;
  return `M ${x0},${y0} A ${r} ${r} 0 ${large} 1 ${x1},${y1}`;
}
function wave(x0,y0,width,amp,cycles){
  // smooth parametric band
  const segs = 60, k = cycles*2*Math.PI/width;
  let d = `M ${x0},${100+y0}`;
  for (let i=1;i<=segs;i++){
    const x = x0 + (i/segs)*width;
    const y = 100 + y0 + Math.sin(k*x)*amp;
    d += ` L ${x},${y}`;
  }
  return d;
}

// ——— Router ———
// NOTE: “Artificial world” remains removed; “Installation” maps to Lesser Ark.
function makeSVGFor(type){
  const t=(type||'').toLowerCase();
  if (t.includes('installation') || t.includes('ark')) return svgLesserArk();
  if (t.includes('shield'))        return svgShieldWorld();
  if (t.includes('ecumen'))        return svgEcumenopolis();
  if (t.includes('gas'))           return svgGas();
  if (t.includes('ocean'))         return svgOcean();
  if (t.includes('rocky'))         return svgRocky();
  if (t.includes('ice'))           return svgIce();
  // default fallback
  return svgRocky();
}

// Projection helper reused for hover/picking
function projectToScreen(x, y, z, mvp){
  const v = new Float32Array([x,y,z,1]);
  const m = mvp;
  const cx = v[0]*m[0] + v[1]*m[4] + v[2]*m[8]  + v[3]*m[12];
  const cy = v[0]*m[1] + v[1]*m[5] + v[2]*m[9]  + v[3]*m[13];
  const cz = v[0]*m[2] + v[1]*m[6] + v[2]*m[10] + v[3]*m[14];
  const cw = v[0]*m[3] + v[1]*m[7] + v[2]*m[11] + v[3]*m[15];
  if (!cw) return null;
  const ndcX = cx/cw, ndcY = cy/cw;
  return [
    Math.round((ndcX*0.5+0.5)*canvas.width),
    Math.round((-ndcY*0.5+0.5)*canvas.height),
    cz/cw
  ];
}

// Unproject: screen (client) -> world on z=0 plane
function screenToWorldOnZ0(clientX, clientY, mvp){
  const inv = mat4Invert(mvp);
  if (!inv) return null;
  const x = (clientX / canvas.clientWidth) * 2 - 1;
  const y = -((clientY / canvas.clientHeight) * 2 - 1);

  const p0 = vec4MulMat(inv, new Float32Array([x, y, -1, 1]));
  const p1 = vec4MulMat(inv, new Float32Array([x, y,  1, 1]));
  for (const p of [p0,p1]){ p[0]/=p[3]; p[1]/=p[3]; p[2]/=p[3]; p[3]=1; }

  const dir = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
  if (Math.abs(dir[2]) < 1e-6) return null;
  const t = -p0[2]/dir[2];
  return [ p0[0] + dir[0]*t, p0[1] + dir[1]*t, 0 ];
}

// Find nearest system id to given client coords (within r pixels)
function findNearestSystemId(clientX, clientY, mvp, r=18){
  const mx = clientX * (canvas.width  / canvas.clientWidth);
  const my = clientY * (canvas.height / canvas.clientHeight);
  let best = null, bestId = null, r2 = r*r;
  for (const sys of systems){
    const p = idToWorld.get(sys.id);
    if (!p) continue;
    const s = projectToScreen(p[0], p[1], p[2], mvp);
    if (!s) continue;
    const dx = s[0] - mx, dy = s[1] - my;
    const d2 = dx*dx + dy*dy;
    if (d2 < r2 && (best===null || d2 < best)){ best = d2; bestId = sys.id; }
  }
  return bestId;
}

// Rebuild star buffer from current systems/idToWorld
function rebuildStarsVBO(){
  const stars = [];
  for (const sys of systems){
    const p = idToWorld.get(sys.id);
    if (!p) continue;
    stars.push(p[0], p[1], p[2]);
  }
  starCount = stars.length/3;
  if (!starsVBO) starsVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starsVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(stars), gl.STATIC_DRAW);
}

// Rebuild line buffer from lanesSet/idToWorld
function rebuildLinesVBOFromSet() {
  const lanesArr = Array.from(lanesSet).map(s => s.split('::'));
  const verts = [];
  for (const [a, b] of lanesArr) {
    const pa = idToWorld.get(a), pb = idToWorld.get(b);
    if (!pa || !pb) continue;
    verts.push(pa[0], pa[1], pa[2], pb[0], pb[1], pb[2]);
  }
  lineVertCount = verts.length / 3;
  if (!linesVBO) linesVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, linesVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

// Helpers for ID + HUD
let editMode = false; // lanes editor
let addMode  = false; // add system mode
function updateHUD(){
  const hudLanes = document.getElementById('hud-lanes');
  const hudAdd   = document.getElementById('hud-add');
  if (hudLanes) hudLanes.innerHTML = `Lanes: <b>${editMode?'ON':'OFF'}</b> (E)`;
  if (hudAdd)   hudAdd.innerHTML   = `Add System: <b>${addMode?'ON':'OFF'}</b> (A)`;
}

// === Boot data (robust) ===
const DEFAULT_DATA = {
  image_size: { width: 1090, height: 1494 },
  systems: [
    { id:'SYS_1', name:'Vanyamar', coords:{ x_norm:0.52, y_norm:0.41, z:0 } },
    { id:'SYS_2', name:'Calithen', coords:{ x_norm:0.31, y_norm:0.64, z:0 } },
    { id:'SYS_3', name:'Elendir',  coords:{ x_norm:0.75, y_norm:0.22, z:0 } }
  ],
  lanes: [['SYS_1','SYS_2'], ['SYS_1','SYS_3']]
};

// Start the render loop ASAP so you never see a blank screen
requestAnimationFrame(loop);
console.log('[SGN] Render loop started');

// Load JSON and boot (with fallback)
(async function boot(){
  try {
    console.log('[SGN] Fetching systems.json…');
    const r = await fetch(jsonURL, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${jsonURL}`);
    const data = await r.json();
    console.log('[SGN] systems.json loaded');
    initFromData(data);
  } catch (err) {
    console.warn('[SGN] Could not load systems.json, using fallback:', err?.message || err);
    initFromData(DEFAULT_DATA);
  }
})();

function initFromData(data){
  // dimensions
  imgW = data?.image_size?.width  ?? 1090;
  imgH = data?.image_size?.height ?? 1494;
  const SCALE = 2200, aspect = imgW / imgH;
  worldW = SCALE; worldH = SCALE / aspect;

  const toWorldXY = (xn, yn) => {
    const x = (xn - 0.5) * worldW;
    const y = -(yn - 0.5) * worldH;
    return [x, y];
  };

  // stars (z = 0 unless JSON has it)
  idToWorld = new Map();
  systems = data.systems || [];
  for (const sys of systems){
    let xn = sys.coords?.x_norm, yn = sys.coords?.y_norm;
    if (xn == null || yn == null) {
      const px = sys.pixel?.x, py = sys.pixel?.y;
      if (px == null || py == null) continue;
      xn = px / imgW; yn = py / imgH;
    }
    const [x, y] = toWorldXY(xn, yn);
    const z = (sys.coords && typeof sys.coords.z === 'number') ? sys.coords.z : 0.0;
    idToWorld.set(sys.id, [x, y, z]);
  }
  rebuildStarsVBO();

  // lanes
  const lanes = data.lanes || [];
  lanesSet = new Set(lanes.map(([a,b]) => [a,b].sort().join('::')));
  rebuildLinesVBOFromSet();

  // build the HUD content now (after DOM existing)
  const hud = document.querySelector('#hud');
  if (hud && !document.getElementById('hud-lanes')) {
    hud.insertAdjacentHTML('beforeend', `
      <span id="hud-sep1" style="margin:0 8px;opacity:.35;">|</span>
      <span id="hud-lanes" style="opacity:.8;">Lanes: <b>OFF</b> (E)</span>
      <span id="hud-sep2" style="margin:0 8px;opacity:.35;">|</span>
      <span id="hud-add" style="opacity:.8;">Add System: <b>OFF</b> (A)</span>
    `);
  }
  updateHUD();

  console.log(`[SGN] Initialized: ${systems.length} systems, ${lanesSet.size} lanes`);
}

// CLICK handler: lane edit / select / ADD SYSTEM
canvas.addEventListener('click', (e) => {
  const proj = mat4Perspective(55 * Math.PI / 180, canvas.width / canvas.height, 0.1, 50000);
  const rot  = mat4Mul(mat4RotateY(yaw), mat4RotateX(pitch));
  const view = mat4Translate(-panX, -panY, -dist);
  const mvp  = mat4Mul(rot, mat4Mul(view, proj));

  if (editMode){
    const bestId = findNearestSystemId(e.clientX, e.clientY, mvp, 18);
    if (!bestId) return;
    if (!window._lanePickA) window._lanePickA = null;
    if (!window._lanePickA) {
      window._lanePickA = bestId;
    } else {
      const key = [window._lanePickA, bestId].sort().join('::');
      if (lanesSet.has(key)) lanesSet.delete(key); else lanesSet.add(key);
      window._lanePickA = null;
      rebuildLinesVBOFromSet();
    }
    return;
  }

  if (addMode){
    const nearId = findNearestSystemId(e.clientX, e.clientY, mvp, 18);
    if (nearId){
      selectedId = nearId;
      updateHUD();
      return;
    }
    const world = screenToWorldOnZ0(e.clientX, e.clientY, mvp);
    if (!world) return;
    const [wx, wy] = world;

    let xn = (wx / worldW) + 0.5;
    let yn = 0.5 - (wy / worldH);
    xn = Math.max(0, Math.min(1, xn));
    yn = Math.max(0, Math.min(1, yn));

    const base = "SYS_";
    let n = systems.length + 1;
    while (systems.some(s=>s.id === base + n)) n++;
    const newId = base + n;

    const defaultName = prompt('Name for new system:', `New System ${n}`) || `New System ${n}`;

    const sys = {
      id: newId,
      name: defaultName,
      coords: { x_norm: xn, y_norm: yn, z: 0 },
      tags: ["manmade"]
    };
    systems.push(sys);
    idToWorld.set(newId, [wx, wy, 0]);
    rebuildStarsVBO();

    selectedId = newId;
    ensureSystemDetails(newId).then(det=>{
      renderPanel(newId, det, true);
    });

    return;
  }

  const id = findNearestSystemId(e.clientX, e.clientY, mvp, 18);
  if (id) selectedId = id;
});

// Middle-click to delete nearest lane (edit mode)
function mouseToCanvas(e){
  const mx = e.clientX * (canvas.width  / canvas.clientWidth);
  const my = e.clientY * (canvas.height / canvas.clientHeight);
  return [mx, my];
}
function distPointToSeg(px,py, ax,ay, bx,by){
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const len2 = abx*abx + aby*aby || 1;
  let t = (apx*abx + apy*aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t*abx, cy = ay + t*aby;
  const dx = px - cx, dy = py - cy;
  return Math.hypot(dx, dy);
}
function deleteNearestLane(mx, my, mvp){
  let bestKey = null, bestD = 1e9;
  for (const key of lanesSet){
    const [a,b] = key.split('::');
    const pa = idToWorld.get(a), pb = idToWorld.get(b);
    if (!pa || !pb) continue;
    const sa = projectToScreen(pa[0], pa[1], pa[2], mvp);
    const sb = projectToScreen(pb[0], pb[1], pb[2], mvp);
    if (!sa || !sb) continue;
    const d = distPointToSeg(mx, my, sa[0], sa[1], sb[0], sb[1]);
    if (d < bestD) { bestD = d; bestKey = key; }
  }
  if (bestKey && bestD < 20){
    lanesSet.delete(bestKey);
    rebuildLinesVBOFromSet();
    console.log('Deleted lane:', bestKey);
  } else {
    console.log('No lane near cursor to delete.');
  }
}
canvas.addEventListener('auxclick', (e)=>{
  if (!editMode || e.button !== 1) return;
  if (!editorOK) return;
  const proj = mat4Perspective(55 * Math.PI / 180, canvas.width / canvas.height, 0.1, 50000);
  const rot  = mat4Mul(mat4RotateY(yaw), mat4RotateX(pitch));
  const view = mat4Translate(-panX, -panY, -dist);
  const mvp  = mat4Mul(rot, mat4Mul(view, proj));
  const [mx,my] = mouseToCanvas(e);
  deleteNearestLane(mx, my, mvp);
});

// Panel
const panel = document.createElement('div');
panel.style.cssText = `
  position:fixed; top:0; right:0; height:100vh; width:360px; background:#0b0f14e6;
  border-left:1px solid #243143; color:#e8f0ff; font:14px/1.4 system-ui;
  transform:translateX(100%); transition:transform .18s ease; display:flex; flex-direction:column; z-index:10;
`;
panel.innerHTML = `
  <div style="padding:12px 14px; border-bottom:1px solid #243143; display:flex; justify-content:space-between; align-items:center;">
    <strong id="sp-title">System</strong>
    <div style="display:flex; gap:8px;">
      <button id="sp-gen"  title="Generate/Load" style="background:#12314b;border:1px solid #2a3b52;color:#e8f0ff;border-radius:8px;padding:6px 10px;cursor:pointer;">Generate/Load</button>
      <button id="sp-edit" title="Edit"          style="background:#1b2a3a;border:1px solid #2a3b52;color:#e8f0ff;border-radius:8px;padding:6px 10px;cursor:pointer;">Edit</button>
      <button id="sp-close"                      style="background:#17202b;border:1px solid #2a3b52;color:#e8f0ff;border-radius:8px;padding:6px 10px;cursor:pointer;">Close</button>
    </div>
  </div>
  <div id="sp-body" style="padding:12px 14px; overflow:auto; flex:1;">
    <em>Select a star and press Enter, or double-click the selected star.</em>
  </div>
  <div style="padding:10px 14px; border-top:1px solid #243143; display:flex; gap:8px;">
    <button id="sp-exp"  style="flex:1;background:#1f2b3a;border:1px solid #2a3b52;color:#e8f0ff;border-radius:8px;padding:8px;cursor:pointer;">Export</button>
  </div>
`;
document.body.appendChild(panel);
const spTitle = panel.querySelector('#sp-title');
const spBody  = panel.querySelector('#sp-body');
panel.querySelector('#sp-close').onclick = () => hidePanel();
panel.querySelector('#sp-gen').onclick   = async ()=>{ if(selectedId){ const d = await ensureSystemDetails(selectedId); renderPanel(selectedId, d, false); } };
panel.querySelector('#sp-edit').onclick  = async ()=>{
  if(!selectedId) return;
  if(!requireEditor()) return;
  const d = await ensureSystemDetails(selectedId);
  renderPanel(selectedId, d, true);
};
panel.querySelector('#sp-exp').onclick   = ()=>{ if(selectedId){ exportSystemDetails(selectedId); } };
function showPanel(){ panel.style.transform = 'translateX(0)'; }
function hidePanel(){ panel.style.transform = 'translateX(100%)'; }

// system details cache/generator
const SYSGEN_VERSION = "v1";
function sysKey(id){ return `sysgen:${SYSGEN_VERSION}:${id}`; }
function getCachedSystem(id){ try { const raw = localStorage.getItem(sysKey(id)); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function setCachedSystem(id, details){ try { localStorage.setItem(sysKey(id), JSON.stringify(details)); } catch {} }
function prngSeed(str){
  let h = 2166136261 >>> 0;
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  let s = h || 0xdeadbeef;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s>>>0) / 4294967296); };
}
function generateDeterministic(id){
  const rnd = prngSeed(id);
  const kinds = ["Main Sequence","K-Dwarf","G-Dwarf","F-Dwarf","M-Dwarf","Subgiant","Giant","Neutron","Black Hole"];
  const kind = kinds[Math.floor(rnd()*kinds.length)];
  const planetCount = 1 + Math.floor(rnd()*10);
  const planets = Array.from({length: planetCount}, (_,i)=>({
    name: `P${i+1}`,
    semi_major_AU: +(0.2 + rnd()*15).toFixed(2),
    type: rnd()<0.3 ? "Rocky" : (rnd()<0.7 ? "Ice" : "Gas"),
    notes: rnd()<0.15 ? "In resonance" : ""
  }));
  return { version: SYSGEN_VERSION, system_id: id, seeded: true, generated_at: new Date().toISOString(), star: { kind }, planets };
}
async function ensureSystemDetails(id){
  let det = getCachedSystem(id);
  if (!det){ det = generateDeterministic(id); setCachedSystem(id, det); }
  return det;
}
function exportSystemDetails(id){
  const det = getCachedSystem(id);
  if (!det) return;
  const blob = new Blob([JSON.stringify(det, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `system_${id}_${SYSGEN_VERSION}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Renders read or edit mode
function renderPanel(id, details, edit=false){
  const sys = systems.find(s=>s.id===id);
  spTitle.textContent = sys?.name || id;

  if (!edit){
    const star = details?.star || {};
    const planets = details?.planets || [];
    spBody.innerHTML = `
      <div style="margin-bottom:10px;">
        <div><strong>ID:</strong> ${id}</div>
        <div><strong>Name:</strong> ${sys?.name || '(unnamed)'}</div>
        <div><strong>Star:</strong> ${star.kind || '—'}</div>
        <div><strong>Version:</strong> ${details?.version || '—'}</div>
        ${Array.isArray(sys?.tags) ? `<div><strong>Tags:</strong> ${sys.tags.join(', ')}</div>` : ``}
      </div>
      <div style="margin:10px 0;"><strong>Planets (${planets.length})</strong></div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${planets.map((p,i)=>`
          <div class="planet-card" data-type="${p.type ?? ''}" data-name="${p.name || ('Planet '+(i+1))}"
            style="border:1px solid #243143; border-radius:8px; padding:8px; cursor:pointer;">
            <div><strong>${p.name || 'Planet '+(i+1)}</strong> — ${p.type ?? 'Unknown'}</div>
            <div>Orbit: ${p.semi_major_AU ?? '?'} AU</div>
            ${p.notes ? `<div style="opacity:.8;">${p.notes}</div>` : ``}
          </div>
        `).join('') || '<em>No planets generated yet. Click Generate/Load.</em>'}
      </div>
    `;

    // hologram clicks here
    spBody.querySelectorAll('.planet-card').forEach(el => {
      const t = el.dataset.type || 'Rocky';
      const n = el.dataset.name || 'Object';
      el.addEventListener('click', () => showHoloVector(t, n));
    });

  } else {
    const starKinds = ["Main Sequence","K-Dwarf","G-Dwarf","F-Dwarf","M-Dwarf","Subgiant","Giant","Neutron","Black Hole"];
    const planets = details?.planets || [];
    const options = starKinds.map(k=>`<option value="${k}" ${details?.star?.kind===k?'selected':''}>${k}</option>`).join('');
    spBody.innerHTML = `
      <form id="sys-edit" style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:grid; grid-template-columns:100px 1fr; gap:8px; align-items:center;">
          <label><strong>ID</strong></label>
          <div>${id}</div>

          <label for="sysName"><strong>Name</strong></label>
          <input id="sysName" type="text" value="${(sys?.name||'').replaceAll('"','&quot;')}" style="background:#0e1620;color:#e8f0ff;border:1px solid #2a3b52;border-radius:6px;padding:6px 8px;"/>

          <label for="starKind"><strong>Star</strong></label>
          <select id="starKind" style="background:#0e1620;color:#e8f0ff;border:1px solid #2a3b52;border-radius:6px;padding:6px 8px;">
            ${options}
          </select>
        </div>

        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
          <strong>Planets (${planets.length})</strong>
          <button id="addPlanet" type="button" style="background:#12314b;border:1px solid #2a3b52;color:#e8f0ff;border-radius:6px;padding:6px 10px;cursor:pointer;">+ Add Planet</button>
        </div>

        <div id="planetList" style="display:flex; flex-direction:column; gap:8px;">
          ${planets.map((p,i)=>planetEditorRow(p,i)).join('')}
        </div>

        <div style="display:flex; gap:8px; margin-top:6px;">
          <button id="saveEdit" type="submit" style="flex:1;background:#1e3b26;border:1px solid #2a3b52;color:#e8f0ff;border-radius:8px;padding:8px;cursor:pointer;">Save</button>
          <button id="cancelEdit" type="button" style="flex:1;background:#3a1e1e;border:1px solid #2a3b52;color:#e8f0ff;border-radius:8px;padding:8px;cursor:pointer;">Cancel</button>
        </div>
      </form>
    `;

    const form = spBody.querySelector('#sys-edit');
    const btnAdd = spBody.querySelector('#addPlanet');
    const listEl = spBody.querySelector('#planetList');
    btnAdd.onclick = ()=>{
      const idx = listEl.children.length;
      const row = document.createElement('div');
      row.innerHTML = planetEditorRow({name:`P${idx+1}`, type:'Rocky', semi_major_AU:1.0, notes:''}, idx);
      listEl.appendChild(row.firstElementChild);
    };
    listEl.addEventListener('click', (e)=>{
      if (e.target && e.target.matches('.delPlanet')) {
        e.target.closest('.planetRow').remove();
        Array.from(listEl.querySelectorAll('.planetRow')).forEach((el,i)=>{
          el.querySelector('.pIndex').textContent = `#${i+1}`;
        });
      }
    });
    form.onsubmit = (ev)=>{
      ev.preventDefault();
      const newName = spBody.querySelector('#sysName').value.trim();
      const newKind = spBody.querySelector('#starKind').value;

      const rows = Array.from(listEl.querySelectorAll('.planetRow'));
      const planets = rows.map(row=>{
        const name = row.querySelector('.pName').value.trim() || 'Planet';
        const type = row.querySelector('.pType').value;
        const sma  = parseFloat(row.querySelector('.pSMA').value);
        const notes= row.querySelector('.pNotes').value.trim();
        return {
          name,
          type,
          semi_major_AU: isFinite(sma) ? +sma.toFixed(2) : null,
          notes
        };
      });

      const updated = {
        ...(getCachedSystem(id) || {version: SYSGEN_VERSION, system_id: id, seeded:true}),
        star: { kind: newKind },
        planets
      };
      setCachedSystem(id, updated);

      if (newName) {
        const s = systems.find(s=>s.id===id);
        if (s) s.name = newName;
        spTitle.textContent = newName;
      }

      renderPanel(id, updated, false);
    };
    spBody.querySelector('#cancelEdit').onclick = ()=>{
      renderPanel(id, details, false);
    };
  }
  showPanel();
}
function planetEditorRow(p,i){
  const opt = (v,sel)=> `<option value="${v}" ${sel===v?'selected':''}>${v}</option>`;
  return `
  <div class="planetRow" style="border:1px solid #243143; border-radius:8px; padding:8px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <strong class="pIndex">#${i+1}</strong>
      <button type="button" class="delPlanet" style="background:#3a2424;border:1px solid #503636;color:#ffd9d9;border-radius:6px;padding:4px 8px;cursor:pointer;">Remove</button>
    </div>
    <div style="display:grid; grid-template-columns:110px 1fr; gap:8px; align-items:center;">
      <label><strong>Name</strong></label>
      <input class="pName" type="text" value="${(p.name||'').replaceAll('"','&quot;')}" style="background:#0e1620;color:#e8f0ff;border:1px solid #2a3b52;border-radius:6px;padding:6px 8px;"/>

      <label><strong>Type</strong></label>
      <select class="pType" style="background:#0e1620;color:#e8f0ff;border:1px solid #2a3b52;border-radius:6px;padding:6px 8px;">
        ${opt('Rocky', p.type)}${opt('Ice', p.type)}${opt('Gas', p.type)}${opt('Ocean', p.type)}${opt('Desert', p.type)}${opt('Shield World', p.type)}${opt('Ecumenopolis', p.type)}${opt('Installation', p.type)}${opt('Habitat', p.type)}
      </select>

      <label><strong>Orbit (AU)</strong></label>
      <input class="pSMA" type="number" step="0.01" value="${p.semi_major_AU ?? 1}" style="background:#0e1620;color:#e8f0ff;border:1px solid #2a3b52;border-radius:6px;padding:6px 8px;"/>

      <label><strong>Notes</strong></label>
      <input class="pNotes" type="text" value="${(p.notes||'').replaceAll('"','&quot;')}" style="background:#0e1620;color:#e8f0ff;border:1px solid #2a3b52;border-radius:6px;padding:6px 8px;"/>
    </div>
  </div>`;
}

// --- render loop ---
function loop() {
  gl.clearColor(0.043, 0.055, 0.075, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const proj = mat4Perspective(55 * Math.PI / 180, canvas.width / canvas.height, 0.1, 50000);
  const rot  = mat4Mul(mat4RotateY(yaw), mat4RotateX(pitch));
  const view = mat4Translate(-panX, -panY, -dist);
  const mvp  = mat4Mul(rot, mat4Mul(view, proj));

  // lanes first
  if (linesVBO && lineVertCount > 0) {
    gl.useProgram(progLines);
    gl.uniformMatrix4fv(uMVP_lines, false, mvp);
    gl.uniform3f(uColorLines, 1.0, 0.85, 0.35);
    gl.bindBuffer(gl.ARRAY_BUFFER, linesVBO);
    gl.enableVertexAttribArray(aPos_lines);
    gl.vertexAttribPointer(aPos_lines, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, lineVertCount);
  }

  // stars
  if (starsVBO && starCount > 0) {
    gl.useProgram(progPoints);
    gl.uniformMatrix4fv(uMVP_points, false, mvp);
    gl.uniform1f(uSize, 6.0);
    gl.uniform3f(uColorPts, 1.0, 0.92, 0.6);
    gl.bindBuffer(gl.ARRAY_BUFFER, starsVBO);
    gl.enableVertexAttribArray(aPos_points);
    gl.vertexAttribPointer(aPos_points, 3, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.POINTS, 0, starCount);
  }

  // hover tooltip
  let hoveredNow = null;
  if (systems.length){
    hoveredNow = (function(){
      const mx = mouseX * (canvas.width  / canvas.clientWidth);
      const my = mouseY * (canvas.height / canvas.clientHeight);
      let best=null,bestId=null,r2=18*18;
      for (const sys of systems){
        const p = idToWorld.get(sys.id); if(!p) continue;
        const s = projectToScreen(p[0], p[1], p[2], mvp); if(!s) continue;
        const dx = s[0]-mx, dy = s[1]-my; const d2=dx*dx+dy*dy;
        if (d2<r2 && (best===null || d2<best)){best=d2;bestId=sys.id;}
      }
      return bestId;
    })();
    if (hoveredNow){
      const sys = systems.find(s => s.id === hoveredNow);
      tip.innerHTML = `<strong>${sys.name || sys.id}</strong><br/><small>${sys.id}</small>`;
      tip.style.left = (mouseX + 12) + 'px';
      tip.style.top  = (mouseY + 12) + 'px';
      tip.style.display = 'block';
    } else {
      tip.style.display = 'none';
    }
  }

  // halos
  if (!haloVBO) haloVBO = gl.createBuffer();
  function drawHalo(id, pix, t, glow, core){
    const p = idToWorld.get(id); if(!p) return;
    gl.useProgram(progHalo);
    gl.uniformMatrix4fv(uMVP_halo, false, mvp);
    gl.uniform1f(uPix_halo, pix);
    gl.uniform1f(uTime_halo, t);
    gl.uniform3f(uColGlow, glow[0], glow[1], glow[2]);
    gl.uniform3f(uColCore, core[0], core[1], core[2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, haloVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPos_halo);
    gl.vertexAttribPointer(aPos_halo, 3, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  if (hoveredNow) drawHalo(hoveredNow, 34.0, (performance.now()-t0)*0.001, [0.35,0.95,1.0], [1.0,0.95,0.50]);
  if (selectedId) drawHalo(selectedId, 42.0, (performance.now()-t0)*0.0007, [1.0,0.85,0.35], [1.0,0.98,0.7]);

  requestAnimationFrame(loop);
}

// === Double-click to open panel / rename ===
canvas.addEventListener('dblclick', async (e)=>{
  const proj = mat4Perspective(55 * Math.PI / 180, canvas.width / canvas.height, 0.1, 50000);
  const rot  = mat4Mul(mat4RotateY(yaw), mat4RotateX(pitch));
  const view = mat4Translate(-panX, -panY, -dist);
  const mvp  = mat4Mul(rot, mat4Mul(view, proj));
  const id = findNearestSystemId(e.clientX, e.clientY, mvp, 18);
  if (!id) return;

  if (selectedId === id){
    const details = await ensureSystemDetails(id);
    renderPanel(id, details, false);
    return;
  }
  if (!requireEditor()) return; // guard rename
  const sys = systems.find(s => s.id === id);
  const curr = sys?.name || id;
  const nn = prompt('Rename system:', curr);
  if (nn && nn.trim()){
    sys.name = nn.trim();
    console.log(`Renamed ${id} -> ${sys.name}`);
  }
});

// Keyboard controls
window.addEventListener('keydown', async (e) => {
  const k = e.key.toLowerCase();
  if (k === 'e') {
    if (!requireEditor()) return;
    editMode = !editMode;
    if (editMode) addMode = false;
    updateHUD();
    console.log(`Edit Mode (lanes): ${editMode ? 'ON' : 'OFF'}`);
    return;
  }
  if (k === 'a') {
    if (!requireEditor()) return;
    addMode = !addMode;
    if (addMode) editMode = false;
    updateHUD();
    console.log(`Add System Mode: ${addMode ? 'ON' : 'OFF'}`);
    return;
  }
  if (k === 'enter' && selectedId){
    const details = await ensureSystemDetails(selectedId);
    renderPanel(selectedId, details, false);
    return;
  }

  if (!editMode) return;

  if (k === 'c') { // clear all lanes
    if (!editorOK) return;
    lanesSet.clear();
    rebuildLinesVBOFromSet();
    console.log('Cleared all lanes.');
  }
  if (k === 'r') { // restore original JSON lanes
    if (!editorOK) return;
    // NOTE: this just restores based on DEFAULT_DATA if systems.json wasn't loaded
    lanesSet.clear();
    (DEFAULT_DATA.lanes || []).forEach(([a,b]) => lanesSet.add([a,b].sort().join('::')));
    rebuildLinesVBOFromSet();
    console.log('Restored lanes (default).');
  }
  if (k === 'x') { // export
    if (!editorOK) { alert('Editor lock: enter password first.'); return; }
    const lanesOut = Array.from(lanesSet).map(s => s.split('::'));
    const out = {
      image_size: { width: imgW, height: imgH },
      systems: systems,
      lanes: lanesOut
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'systems.json';
    a.click();
    URL.revokeObjectURL(a.href);
    console.log(`Exported ${lanesOut.length} lanes, ${systems.length} systems`);
  }
});
