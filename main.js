const canvas = document.getElementById('gl');
let gl = canvas.getContext('webgl2', { antialias: true });
if (!gl) gl = canvas.getContext('webgl', { antialias: true });
if (!gl) { alert('WebGL not supported'); throw new Error('WebGL not supported'); }

function resize() {
  canvas.width  = Math.floor(innerWidth);
  canvas.height = Math.floor(innerHeight);
  canvas.style.width  = innerWidth  + 'px';
  canvas.style.height = innerHeight + 'px';
  gl.viewport(0, 0, canvas.width, canvas.height);
}
addEventListener('resize', resize);
resize();

function mat4Mul(a, b) {
  const o = new Float32Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++)
    o[r*4+c] = a[r*4+0]*b[0*4+c] + a[r*4+1]*b[1*4+c] + a[r*4+2]*b[2*4+c] + a[r*4+3]*b[3*4+c];
  return o;
}
function mat4Perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,(2*far*near)*nf,0]);
}
function mat4Translate(x, y, z) {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);
}
function mat4RotateY(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
}
function mat4RotateX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);
}
function mat4Invert(m) {
  const a = m, out = new Float32Array(16);
  const a00=a[0],a01=a[1],a02=a[2],a03=a[3],
        a10=a[4],a11=a[5],a12=a[6],a13=a[7],
        a20=a[8],a21=a[9],a22=a[10],a23=a[11],
        a30=a[12],a31=a[13],a32=a[14],a33=a[15];
  const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10,
        b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12,
        b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30,
        b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
  let det = b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
  if (!det) return null;
  det = 1.0 / det;
  out[0]  = ( a11*b11-a12*b10+a13*b09)*det;
  out[1]  = (-a01*b11+a02*b10-a03*b09)*det;
  out[2]  = ( a31*b05-a32*b04+a33*b03)*det;
  out[3]  = (-a21*b05+a22*b04-a23*b03)*det;
  out[4]  = (-a10*b11+a12*b08-a13*b07)*det;
  out[5]  = ( a00*b11-a02*b08+a03*b07)*det;
  out[6]  = (-a30*b05+a32*b02-a33*b01)*det;
  out[7]  = ( a20*b05-a22*b02+a23*b01)*det;
  out[8]  = ( a10*b10-a11*b08+a13*b06)*det;
  out[9]  = (-a00*b10+a01*b08-a03*b06)*det;
  out[10] = ( a30*b04-a31*b02+a33*b00)*det;
  out[11] = (-a20*b04+a21*b02-a23*b00)*det;
  out[12] = (-a10*b09+a11*b07-a12*b06)*det;
  out[13] = ( a00*b09-a01*b07+a02*b06)*det;
  out[14] = (-a30*b03+a31*b01-a32*b00)*det;
  out[15] = ( a20*b03-a21*b01+a22*b00)*det;
  return out;
}
function vec4MulMat(m, v) {
  const x=v[0],y=v[1],z=v[2],w=v[3];
  return new Float32Array([
    m[0]*x+m[4]*y+m[8]*z +m[12]*w,
    m[1]*x+m[5]*y+m[9]*z +m[13]*w,
    m[2]*x+m[6]*y+m[10]*z+m[14]*w,
    m[3]*x+m[7]*y+m[11]*z+m[15]*w
  ]);
}

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s);
  return s;
}
function makeProgram(vsSrc, fsSrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER,   vsSrc));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw gl.getProgramInfoLog(p);
  return p;
}

/* ═══════════════════════════════════════════════════════════════
   SHADERS
   ═══════════════════════════════════════════════════════════════ */

/* ── Background nebula + star dust ── */
const VS_BG = `
attribute vec2 position;
varying vec2 vUV;
void main(){
  vUV = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;
const FS_BG = `
precision highp float;
varying vec2 vUV;
uniform float uTime;
uniform vec2 uRes;
uniform vec3 uPan;
uniform float uZoom;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  mat2 rot = mat2(0.8,-0.6,0.6,0.8);
  for(int i=0;i<6;i++){ v+=a*noise(p); p=rot*p*2.0; a*=0.5; }
  return v;
}
void main(){
  vec2 uv = vUV;
  vec2 aspect = vec2(uRes.x/uRes.y, 1.0);
  vec2 off = uPan.xy * 0.0002;
  vec2 p = (uv - 0.5) * aspect * 2.5 + off;

  // subtle nebula — dark blues and teals, very subdued
  float n1 = fbm(p * 0.7 + uTime * 0.004);
  float n2 = fbm(p * 1.4 + vec2(5.0,3.0) + uTime * 0.006);
  float n3 = fbm(p * 2.8 + vec2(10.0,7.0));

  vec3 col = vec3(0.018, 0.028, 0.06);                    // base void
  col += vec3(0.01, 0.04, 0.08) * smoothstep(0.3,0.7,n1); // blue clouds
  col += vec3(0.02, 0.05, 0.06) * smoothstep(0.4,0.8,n2) * 0.5; // teal wisps
  col += vec3(0.04, 0.01, 0.06) * smoothstep(0.5,0.9,n3) * 0.3; // faint violet

  // vignette
  col *= 1.0 - 0.4 * length((uv - 0.5) * 1.4);

  // star dust — tiny static dots
  vec2 grid = floor(uv * 220.0 + off * 60.0);
  float rnd = hash(grid);
  float rnd2 = hash(grid + 99.0);
  vec2 cell = fract(uv * 220.0 + off * 60.0);
  float d = length(cell - 0.5);
  float star = smoothstep(0.02, 0.0, d - 0.005) * step(0.94, rnd);
  float twinkle = 0.5 + 0.5 * sin(uTime * (1.0 + rnd2 * 4.0) + rnd * 6.28);
  col += star * twinkle * vec3(0.4 + rnd2*0.3, 0.5 + rnd*0.3, 0.7) * 0.25;

  gl_FragColor = vec4(col, 1.0);
}`;

/* ── Simple lines (for lanes) ── */
const VS_LINES = `
attribute vec3 position;
uniform mat4 uMVP;
void main(){ gl_Position = uMVP * vec4(position, 1.0); }`;
const FS_LINES = `
precision mediump float;
uniform vec4 uColor;
void main(){ gl_FragColor = uColor; }`;

/* ── Star points ── */
const VS_POINTS = `
attribute vec3 position;
attribute vec3 aColor;
attribute float aSize;
uniform mat4 uMVP;
varying vec3 vColor;
void main(){
  gl_Position = uMVP * vec4(position, 1.0);
  gl_PointSize = aSize;
  vColor = aColor;
}`;
const FS_POINTS = `
precision highp float;
varying vec3 vColor;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r = length(uv);
  float ang = atan(uv.y, uv.x);

  // bright white core with gaussian falloff
  float core = exp(-r * r * 22.0);
  // colored inner glow
  float inner = exp(-r * r * 5.0) * 0.5;
  // soft outer glow
  float outer = exp(-r * r * 1.5) * 0.18;

  // 4-point diffraction spikes (subtle, thin)
  float spike = 0.0;
  spike += exp(-pow(abs(uv.x), 0.8) * 80.0) * exp(-r * 2.0) * 0.25;
  spike += exp(-pow(abs(uv.y), 0.8) * 80.0) * exp(-r * 2.0) * 0.25;

  float alpha = clamp(core + inner + outer + spike, 0.0, 1.0);
  vec3 white = vec3(1.0, 0.98, 0.94);
  vec3 col = mix(vColor, white, core * 0.8) * (1.0 + core * 2.0);
  col += vColor * outer * 2.0;

  gl_FragColor = vec4(col, alpha);
}`;

/* ── Halo / targeting reticle (hover + selection) ── */
const VS_HALO = `
attribute vec3 position;
uniform mat4 uMVP;
uniform float uPixelSize;
void main(){
  gl_Position = uMVP * vec4(position, 1.0);
  gl_PointSize = uPixelSize;
}`;
const FS_HALO = `
precision highp float;
uniform float uTime;
uniform vec3 uColGlow;
uniform vec3 uColCore;
uniform float uMode; // 0 = hover, 1 = selected, 2 = lane-pick

void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r = length(uv);
  float ang = atan(uv.y, uv.x);
  float PI = 3.14159265;
  float alpha = 0.0;
  vec3 col = mix(uColGlow, uColCore, 0.3);

  // ── strong radial glow filling the interior ──
  float glow = exp(-r * r * 3.5) * 0.3;
  alpha += glow;

  // ── outer thick segmented ring ──
  float outerR = 0.78;
  float outerW = 0.05;
  float outerBand = smoothstep(outerR - outerW, outerR - outerW * 0.5, r)
                  * (1.0 - smoothstep(outerR + outerW * 0.5, outerR + outerW, r));
  // rotating segmented mask — 6 segments
  float rotAng = ang + uTime * 0.35;
  float seg = mod(rotAng + PI, PI / 3.0) / (PI / 3.0);
  float arcMask = smoothstep(0.06, 0.14, seg) * (1.0 - smoothstep(0.86, 0.94, seg));
  alpha += outerBand * arcMask * 1.0;
  // glow around outer ring
  float outerGlow = exp(-pow(abs(r - outerR), 2.0) * 120.0) * 0.5;
  alpha += outerGlow * arcMask;
  col += uColCore * outerGlow * arcMask * 0.3;

  // ── inner solid ring ──
  float innerR = 0.48;
  float innerW = 0.035;
  float innerBand = smoothstep(innerR - innerW, innerR - innerW * 0.3, r)
                  * (1.0 - smoothstep(innerR + innerW * 0.3, innerR + innerW, r));
  alpha += innerBand * 1.0;
  // glow around inner ring
  float innerGlow = exp(-pow(abs(r - innerR), 2.0) * 80.0) * 0.4;
  alpha += innerGlow;

  // ── scanning sweep (wide, bright) ──
  float sweep = mod(ang + uTime * 1.2, PI * 2.0);
  float sweepArc = exp(-pow(sweep - 0.5, 2.0) * 8.0);
  float sweepR = smoothstep(innerR - 0.08, innerR, r) * (1.0 - smoothstep(outerR, outerR + 0.08, r));
  alpha += sweepArc * sweepR * 0.5;
  col += uColCore * sweepArc * sweepR * 0.4;

  // ── 4 bright cardinal ticks extending outward ──
  for(int i = 0; i < 4; i++){
    float tickAng = float(i) * PI * 0.5;
    float da = abs(mod(ang - tickAng + PI, PI * 2.0) - PI);
    float tick = exp(-da * da * 800.0);
    float tickR = smoothstep(outerR + outerW * 0.5, outerR + outerW, r)
                * (1.0 - smoothstep(outerR + outerW + 0.08, outerR + outerW + 0.12, r));
    alpha += tick * tickR * 1.2;
    col += uColCore * tick * tickR * 0.3;
  }

  // ── selection mode extras ──
  if(uMode > 0.5){
    // 4 diagonal bracket marks
    for(int i = 0; i < 4; i++){
      float dAng = float(i) * PI * 0.5 + PI * 0.25;
      float da = abs(mod(ang - dAng + PI, PI * 2.0) - PI);
      float bracket = exp(-da * da * 400.0);
      float bracketR = smoothstep(outerR + outerW, outerR + outerW + 0.01, r)
                     * (1.0 - smoothstep(outerR + outerW + 0.06, outerR + outerW + 0.09, r));
      alpha += bracket * bracketR * 1.0;
      col += uColCore * bracket * bracketR * 0.2;
    }
    // pulsing fill between rings
    float fill = smoothstep(innerR + innerW, innerR + innerW + 0.02, r)
               * (1.0 - smoothstep(outerR - outerW - 0.02, outerR - outerW, r));
    float pulse = 0.12 + 0.08 * sin(uTime * 2.5);
    alpha += fill * pulse;

    // overall brightness pulse
    alpha *= 0.9 + 0.1 * sin(uTime * 2.0);
  }

  // ── bright center pip ──
  float pip = exp(-r * r * 60.0) * 0.5;
  alpha += pip;
  col += vec3(1.0) * pip * 0.3;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}`;

/* ── Compile programs ── */
const progBG     = makeProgram(VS_BG, FS_BG);
const progPoints = makeProgram(VS_POINTS, FS_POINTS);
const progLines  = makeProgram(VS_LINES, FS_LINES);
const progHalo   = makeProgram(VS_HALO, FS_HALO);

/* BG */
const uTimeBG = gl.getUniformLocation(progBG, 'uTime');
const uResBG  = gl.getUniformLocation(progBG, 'uRes');
const uPanBG  = gl.getUniformLocation(progBG, 'uPan');
const uZoomBG = gl.getUniformLocation(progBG, 'uZoom');
const aPosB   = gl.getAttribLocation(progBG, 'position');
const bgVBO   = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, bgVBO);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

/* Points */
const aPos_points   = gl.getAttribLocation(progPoints, 'position');
const aColor_points = gl.getAttribLocation(progPoints, 'aColor');
const aSize_points  = gl.getAttribLocation(progPoints, 'aSize');
const uMVP_points   = gl.getUniformLocation(progPoints, 'uMVP');

/* Lines */
const aPos_lines  = gl.getAttribLocation(progLines, 'position');
const uMVP_lines  = gl.getUniformLocation(progLines, 'uMVP');
const uColorLines = gl.getUniformLocation(progLines, 'uColor');

/* Halo */
const aPos_halo  = gl.getAttribLocation(progHalo, 'position');
const uMVP_halo  = gl.getUniformLocation(progHalo, 'uMVP');
const uPix_halo  = gl.getUniformLocation(progHalo, 'uPixelSize');
const uTime_halo = gl.getUniformLocation(progHalo, 'uTime');
const uColGlow   = gl.getUniformLocation(progHalo, 'uColGlow');
const uColCore   = gl.getUniformLocation(progHalo, 'uColCore');
const uMode_halo = gl.getUniformLocation(progHalo, 'uMode');

let yaw = 0, pitch = 0, dist = 1800;
let dragging = false, dragMoved = false, lx = 0, ly = 0;
let panning = false, panX = 0, panY = 0;
let _clickDownId = null, _clickMoved = false;

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mousedown', e => {
  lx = e.clientX; ly = e.clientY;
  dragMoved = false;
  _clickMoved = false;
  if (e.button === 2) panning = true;
  else {
    dragging = true;
    if (e.button === 0) {
      _clickDownId = hoveredId;
    }
  }
});
addEventListener('mouseup', () => { dragging = false; panning = false; });
addEventListener('mousemove', e => {
  const dx = e.clientX - lx, dy = e.clientY - ly;
  lx = e.clientX; ly = e.clientY;
  if (dragging) {
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) { dragMoved = true; _clickMoved = true; }
    if (!addMode && dragMoved) {
      yaw   += dx * 0.005;
      pitch += dy * 0.005;
      pitch = Math.max(-1.55, Math.min(1.55, pitch));
    }
  } else if (panning) {
    const s = dist / 1000;
    panX -= dx * s;
    panY += dy * s;
  }
});
addEventListener('wheel', e => {
  if (e.target.closest('#sidePanel') || e.target.closest('#orrery-modal')) return;
  dist *= (1 + Math.sign(e.deltaY) * 0.12);
  dist = Math.max(300, Math.min(6000, dist));
});

let starsVBO = null, starCount = 0;
let linesVBO = null, lineVertCount = 0;
let idToWorld = new Map();
let systems = [];
let lanesSet = new Set();
let imgW = 1090, imgH = 1494, worldW = 2200, worldH = 2200*(1090/1494);

const tip      = document.getElementById('tooltip');
const tipName  = document.getElementById('tip-name');
const tipId    = document.getElementById('tip-id');
const tipOwner = document.getElementById('tip-owner');
const tipTags  = document.getElementById('tip-tags');
const tipNotes = document.getElementById('tip-notes');
const cursorEl = document.getElementById('cursor-reticle');
let mouseX = 0, mouseY = 0;
let cursorVisible = false;

addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  if (cursorEl) {
    cursorEl.style.left = e.clientX + 'px';
    cursorEl.style.top  = e.clientY + 'px';
  }
  /* Determine if mouse is over any UI region using bounding rects,
     since pointer-events:none containers won't register in e.target */
  const overUI = isOverElement('hud', e) || isOverElement('sidePanel', e) ||
                 isOverElement('statusBar', e) || isOverElement('orrery-modal', e);
  const shouldShow = !overUI;
  if (shouldShow !== cursorVisible) {
    cursorVisible = shouldShow;
    if (cursorEl) cursorEl.style.display = shouldShow ? 'block' : 'none';
    document.body.classList.toggle('map-cursor', shouldShow);
  }
});

function isOverElement(id, e) {
  const el = document.getElementById(id);
  if (!el) return false;
  /* side panel: only counts when open (translateX(0)) */
  if (id === 'sidePanel' && el.style.transform !== 'translateX(0px)' && el.style.transform !== 'translateX(0)') return false;
  /* orrery: only when open */
  if (id === 'orrery-modal' && !el.classList.contains('open')) return false;
  const r = el.getBoundingClientRect();
  return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
}

canvas.addEventListener('mousedown', () => { if(cursorEl) cursorEl.classList.add('clicking'); });
addEventListener('mouseup', () => { if(cursorEl) cursorEl.classList.remove('clicking'); });

let hoveredId = null;
let selectedId = null;
let haloVBO = null;
const t0 = performance.now();

let editorOK = sessionStorage.getItem('starmap_editor_ok') === '1';
let _editorPW = null;

(async function loadEditorPW() {
  try {
    const r = await fetch('./editor.json', { cache: 'no-store' });
    if (r.ok) {
      const d = await r.json();
      if (typeof d.pw === 'string' && d.pw.length) _editorPW = d.pw;
    }
  } catch {}
})();

function requireEditor() {
  if (editorOK) return true;
  if (_editorPW === null) {
    alert('Editor not available.');
    return false;
  }
  const pw = prompt('Enter editor password:');
  if (pw === _editorPW) {
    editorOK = true;
    sessionStorage.setItem('starmap_editor_ok', '1');
    updateHUD();
    return true;
  }
  alert('Incorrect password.');
  return false;
}

let editMode = false;
let addMode  = false;

function updateHUD() {
  const hudLanes = document.getElementById('hud-lanes');
  const hudAdd   = document.getElementById('hud-add');
  if (hudLanes) {
    let label = 'LANES &nbsp;<b>OFF</b>';
    if (editMode) {
      if (window._lanePickA) {
        const pickSys = systems.find(s => s.id === window._lanePickA);
        const pickName = pickSys?.name || window._lanePickA;
        label = `LANES &nbsp;<b>FROM: ${pickName.toUpperCase()}</b>`;
      } else {
        label = 'LANES &nbsp;<b>ON — PICK 1ST</b>';
      }
    }
    hudLanes.innerHTML = label;
    hudLanes.style.color = editMode ? 'var(--cyan)' : '';
    if (editMode) hudLanes.classList.add('mode-active'); else hudLanes.classList.remove('mode-active');
  }
  if (hudAdd) {
    hudAdd.innerHTML   = `ADD &nbsp;<b>${addMode ? 'ON — CLICK MAP' : 'OFF'}</b>`;
    hudAdd.style.color = addMode ? 'var(--cyan)' : '';
    if (addMode) hudAdd.classList.add('mode-active'); else hudAdd.classList.remove('mode-active');
  }
}

const DEFAULT_DATA = {
  image_size: { width: 1090, height: 1494 },
  systems: [
    { id:'SYS_1', name:'Vanyamar', coords:{ x_norm:0.52, y_norm:0.41, z:0 } },
    { id:'SYS_2', name:'Calithen', coords:{ x_norm:0.31, y_norm:0.64, z:0 } },
    { id:'SYS_3', name:'Elendir',  coords:{ x_norm:0.75, y_norm:0.22, z:0 } }
  ],
  lanes: [['SYS_1','SYS_2'], ['SYS_1','SYS_3']]
};

requestAnimationFrame(loop);

const MAP_STORE_KEY = 'sgn_map_state_v1';

function saveMapState() {
  try {
    const lanesOut = Array.from(lanesSet).map(s => s.split('::'));
    const state = { image_size:{width:imgW,height:imgH}, systems, lanes:lanesOut };
    localStorage.setItem(MAP_STORE_KEY, JSON.stringify(state));
  } catch {}
}

(async function boot() {
  /* try systems.json file first (canonical repo source) */
  let loaded = false;
  try {
    const r = await fetch('./systems.json', { cache: 'no-store' });
    if (r.ok) {
      await initFromData(await r.json());
      loaded = true;
    }
  } catch {}
  /* fall back to localStorage if file not available */
  if (!loaded) {
    try {
      const saved = localStorage.getItem(MAP_STORE_KEY);
      if (saved) {
        await initFromData(JSON.parse(saved));
        loaded = true;
      }
    } catch {}
  }
  if (!loaded) {
    await initFromData(DEFAULT_DATA);
  }
  await loadSolarSystems();
})();

async function loadSolarSystems() {
  /* load solar_systems.json first (canonical repo source) */
  let fileSolarData = null;
  try {
    const r = await fetch('./solar_systems.json', { cache: 'no-store' });
    if (r.ok) fileSolarData = await r.json();
  } catch {}

  for (const sys of systems) {
    /* prefer file data, fall back to localStorage cache */
    if (fileSolarData && fileSolarData[sys.id]) {
      setCachedSystem(sys.id, fileSolarData[sys.id]);
    }
    /* if still nothing, localStorage may already have it from a previous session */
  }
}

async function initFromData(data) {
  imgW = data?.image_size?.width  ?? 1090;
  imgH = data?.image_size?.height ?? 1494;
  const SCALE = 2200;
  worldW = SCALE;
  worldH = SCALE / (imgW / imgH);

  const toWorldXY = (xn, yn) => [(xn - 0.5) * worldW, -(yn - 0.5) * worldH];

  idToWorld = new Map();
  systems = data.systems || [];
  for (const sys of systems) {
    let xn = sys.coords?.x_norm, yn = sys.coords?.y_norm;
    if (xn == null || yn == null) {
      const px = sys.pixel?.x, py = sys.pixel?.y;
      if (px == null || py == null) continue;
      xn = px / imgW; yn = py / imgH;
    }
    const [x, y] = toWorldXY(xn, yn);
    const z = (sys.coords && typeof sys.coords.z === 'number') ? sys.coords.z : 0;
    idToWorld.set(sys.id, [x, y, z]);
  }
  rebuildStarsVBO();

  lanesSet = new Set((data.lanes || []).map(([a,b]) => [a,b].sort().join('::')));
  rebuildLinesVBOFromSet();

  updateHUD();

  const sbSys   = document.getElementById('sb-sys');
  const sbLanes = document.getElementById('sb-lanes-ct');
  if (sbSys)   sbSys.textContent   = `${systems.length} NODES ACTIVE`;
  if (sbLanes) sbLanes.textContent = `${lanesSet.size} LANES MAPPED`;
  await loadFleets();
  updateFleetStatusBar();
}

canvas.addEventListener('mouseup', async e => {
  if (e.button !== 0) return;
  if (_clickMoved) return;

  if (!_clickDownId) {
    if (addMode) {
      if (!requireEditor()) return;
      const mvp = buildMVP();
      const world = screenToWorldOnZ0(e.clientX, e.clientY, mvp);
      if (!world) return;
      const [wx, wy] = world;
      const xn = Math.max(0, Math.min(1, (wx / worldW) + 0.5));
      const yn = Math.max(0, Math.min(1, 0.5 - (wy / worldH)));
      let n = systems.length + 1;
      while (systems.some(s => s.id === 'SYS_' + n)) n++;
      const newId = 'SYS_' + n;
      const defaultName = prompt('Name for new system:', `New System ${n}`) || `New System ${n}`;
      const sys = { id:newId, name:defaultName, coords:{x_norm:xn, y_norm:yn, z:0}, tags:['installation'] };
      systems.push(sys);
      idToWorld.set(newId, [wx, wy, 0]);
      rebuildStarsVBO();
      saveMapState();
      selectedId = newId;
      renderPanel(newId, await ensureSystemDetails(newId));
    }
    return;
  }

  const id = _clickDownId;
  _clickDownId = null;

  if (editMode) {
    if (!requireEditor()) return;
    if (!window._lanePickA) {
      window._lanePickA = id;
      updateHUD();
    } else {
      if (window._lanePickA !== id) {
        const key = [window._lanePickA, id].sort().join('::');
        if (lanesSet.has(key)) lanesSet.delete(key); else lanesSet.add(key);
        rebuildLinesVBOFromSet();
        updateLaneCounts();
        saveMapState();
      }
      window._lanePickA = null;
      updateHUD();
    }
    return;
  }

  selectedId = id;
  updateHUD();
  renderPanel(id, await ensureSystemDetails(id));
});

function mouseToCanvas(e) {
  return [
    e.clientX * (canvas.width  / canvas.clientWidth),
    e.clientY * (canvas.height / canvas.clientHeight)
  ];
}

function distPointToSeg(px, py, ax, ay, bx, by) {
  const abx = bx-ax, aby = by-ay;
  const len2 = abx*abx + aby*aby || 1;
  const t = Math.max(0, Math.min(1, ((px-ax)*abx + (py-ay)*aby) / len2));
  return Math.hypot(px - (ax + t*abx), py - (ay + t*aby));
}

function deleteNearestLane(mx, my, mvp) {
  let bestKey = null, bestD = 1e9;
  for (const key of lanesSet) {
    const [a,b] = key.split('::');
    const pa = idToWorld.get(a), pb = idToWorld.get(b);
    if (!pa || !pb) continue;
    const sa = projectToScreen(pa[0], pa[1], pa[2], mvp);
    const sb = projectToScreen(pb[0], pb[1], pb[2], mvp);
    if (!sa || !sb) continue;
    const d = distPointToSeg(mx, my, sa[0], sa[1], sb[0], sb[1]);
    if (d < bestD) { bestD = d; bestKey = key; }
  }
  if (bestKey && bestD < 20) {
    lanesSet.delete(bestKey);
    rebuildLinesVBOFromSet();
  }
}

canvas.addEventListener('auxclick', e => {
  if (!editMode || e.button !== 1) return;
  if (!requireEditor()) return;
  const [mx, my] = mouseToCanvas(e);
  deleteNearestLane(mx, my, buildMVP());
  updateLaneCounts();
  saveMapState();
});

const panel      = document.getElementById('sidePanel');
const spTitle    = document.getElementById('sp-title');
const spSysId    = document.getElementById('sp-sys-id');
const spOwner    = document.getElementById('sp-owner');
const spStarOrb  = document.getElementById('sp-star-orb');
const spStarAbbr = document.getElementById('sp-star-abbr');

document.getElementById('sp-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  const name = tab.dataset.tab;
  if (name === 'edit' && !requireEditor()) return;
  document.querySelectorAll('#sp-tabs .tab').forEach(t => t.classList.toggle('active', t === tab));
  document.querySelectorAll('#sp-body .tab-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${name}`));
});

document.getElementById('sp-close').onclick  = () => hidePanel();
document.getElementById('sp-gen').onclick    = async () => {
  if (!selectedId) return;
  renderPanel(selectedId, await ensureSystemDetails(selectedId, true));
};
document.getElementById('sp-exp').onclick    = () => { if (selectedId && requireEditor()) exportSystemDetails(selectedId); };
document.getElementById('sp-orrery').onclick = () => { if (selectedId) openOrrery(selectedId); };

document.getElementById('sb-save-repo').onclick = () => {
  if (!requireEditor()) return;

  /* systems.json — map nodes + lanes */
  const lanesOut = Array.from(lanesSet).map(s => s.split('::'));
  const sysBlob = new Blob([JSON.stringify({ image_size:{width:imgW,height:imgH}, systems, lanes:lanesOut }, null, 2)], { type:'application/json' });
  const a1 = document.createElement('a');
  a1.href = URL.createObjectURL(sysBlob);
  a1.download = 'systems.json';
  a1.click();
  URL.revokeObjectURL(a1.href);

  /* solar_systems.json — all star/planet/body compositions */
  const solarData = {};
  for (const sys of systems) {
    const det = getCachedSystem(sys.id);
    if (det) solarData[sys.id] = det;
  }
  const solBlob = new Blob([JSON.stringify(solarData, null, 2)], { type:'application/json' });
  const a2 = document.createElement('a');
  a2.href = URL.createObjectURL(solBlob);
  a2.download = 'solar_systems.json';
  setTimeout(() => { a2.click(); URL.revokeObjectURL(a2.href); }, 300);

  /* fleets.json */
  const fBlob = new Blob([JSON.stringify(fleets, null, 2)], { type:'application/json' });
  const a3 = document.createElement('a');
  a3.href = URL.createObjectURL(fBlob);
  a3.download = 'fleets.json';
  setTimeout(() => { a3.click(); URL.revokeObjectURL(a3.href); }, 600);
};

canvas.addEventListener('dblclick', async e => {
  const id = findNearestSystemId(e.clientX, e.clientY, buildMVP(), 18);
  if (!id) return;
  if (selectedId === id) {
    renderPanel(id, await ensureSystemDetails(id));
    return;
  }
  if (!requireEditor()) return;
  const sys = systems.find(s => s.id === id);
  const nn = prompt('Rename system:', sys?.name || id);
  if (nn && nn.trim()) {
    sys.name = nn.trim();
    rebuildStarsVBO();
    saveMapState();
  }
});

window.addEventListener('keydown', async e => {
  /* ignore shortcuts when typing in any form field */
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;

  const k = e.key.toLowerCase();
  if (k === 'e') {
    if (!requireEditor()) return;
    editMode = !editMode;
    if (editMode) addMode = false;
    if (!editMode) window._lanePickA = null;
    updateHUD();
    return;
  }
  if (k === 'a') {
    if (!requireEditor()) return;
    addMode = !addMode;
    if (addMode) editMode = false;
    updateHUD();
    return;
  }
  if (k === 'enter' && selectedId) {
    renderPanel(selectedId, await ensureSystemDetails(selectedId));
    return;
  }
  if (!editMode) return;
  if (!requireEditor()) return;
  if (k === 'c') {
    if (!confirm('Clear ALL lanes?')) return;
    lanesSet.clear();
    rebuildLinesVBOFromSet();
    updateLaneCounts();
    saveMapState();
  }
  if (k === 'r') {
    if (!confirm('Reset lanes to defaults?')) return;
    lanesSet.clear();
    (DEFAULT_DATA.lanes || []).forEach(([a,b]) => lanesSet.add([a,b].sort().join('::')));
    rebuildLinesVBOFromSet();
    updateLaneCounts();
    saveMapState();
  }
  if (k === 'x') {
    const lanesOut = Array.from(lanesSet).map(s => s.split('::'));
    const blob = new Blob([JSON.stringify({ image_size:{width:imgW,height:imgH}, systems, lanes:lanesOut }, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'systems.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
});

const orreryModal  = document.getElementById('orrery-modal');
const orreryCanvas = document.getElementById('orrery-canvas');
const orreryCtx    = orreryCanvas.getContext('2d');
const orreryClose  = document.getElementById('orrery-close');
const orreryHover  = document.getElementById('orrery-hover');

let orreryRAF   = null;
let orreryData  = null;
let orrerySpeed = 1;
let orreryT     = 0;
let lastTS      = null;
const YEAR_SECS = 40;

orreryClose.onclick = closeOrrery;
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && orreryModal.classList.contains('open')) closeOrrery();
});

document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.onclick = () => {
    orrerySpeed = parseFloat(btn.dataset.speed);
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', b === btn));
  };
});

function openOrrery(id) {
  const det = getCachedSystem(id);
  if (!det) return;
  const sys     = systems.find(s => s.id === id) || { name: id };
  const star    = det.star || {};
  const sm      = getStarMeta(star.kind);
  const planets = (det.planets || []).slice().sort((a,b) => (a.semi_major_AU||0) - (b.semi_major_AU||0));

  orreryData = { sys, details: det, planets, star, sm };
  orreryT  = 0;
  lastTS   = null;

  document.getElementById('orrery-name').textContent = sys.name || id;
  document.getElementById('orrery-sub').textContent  =
    `${star.kind || '—'} · ${planets.length} ORBITAL OBJECT${planets.length !== 1 ? 'S' : ''}`;

  buildOrreryLegend(planets, star.hz);
  orreryModal.classList.add('open');
  requestAnimationFrame(() => {
    resizeOrreryCanvas();
    if (orreryRAF) cancelAnimationFrame(orreryRAF);
    orreryRAF = requestAnimationFrame(orreryTick);
  });
}

function closeOrrery() {
  orreryModal.classList.remove('open');
  if (orreryRAF) { cancelAnimationFrame(orreryRAF); orreryRAF = null; }
}

function resizeOrreryCanvas() {
  const rect = orreryCanvas.parentElement.getBoundingClientRect();
  orreryCanvas.width  = rect.width  * devicePixelRatio;
  orreryCanvas.height = rect.height * devicePixelRatio;
}

window.addEventListener('resize', () => {
  if (orreryModal.classList.contains('open')) resizeOrreryCanvas();
});

function buildOrreryLegend(planets, hz) {
  const leg   = document.getElementById('orrery-legend');
  const types = [...new Set(planets.map(p => p.type))];
  let html = '';
  if (hz && hz[0] > 0) html += `<div class="orrery-legend-item"><div class="orrery-legend-ring"></div>HABITABLE ZONE</div>`;
  types.forEach(t => {
    const pm = getPlanetMeta(t);
    html += `<div class="orrery-legend-item"><div class="orrery-legend-dot" style="background:${pm.color}"></div>${t.toUpperCase()}</div>`;
  });
  leg.innerHTML = html;
}

function orreryTick(ts) {
  if (!orreryData) return;
  if (lastTS !== null) orreryT += Math.min((ts - lastTS) / 1000, 0.1) * orrerySpeed / YEAR_SECS;
  lastTS = ts;
  drawOrrery();
  orreryRAF = requestAnimationFrame(orreryTick);
}

function drawOrrery() {
  const cvs = orreryCanvas, ctx = orreryCtx;
  const W = cvs.width, H = cvs.height, cx = W/2, cy = H/2, dpr = devicePixelRatio;

  ctx.clearRect(0, 0, W, H);
  if (!orreryData) return;
  const { planets, star, sm } = orreryData;
  if (!planets.length) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();

  const allAU   = planets.map(p => p.semi_major_AU || 0.1);
  const minAU   = Math.max(0.01, (star.inner_edge || 0.05) * 0.5);
  const maxAU   = Math.max(...allAU);
  const labelPad = 52 * dpr;
  const maxR    = Math.min(cx, cy) - labelPad;
  const usableR = maxR * 0.82;
  const logMin  = Math.log(minAU), logMax = Math.log(maxAU * 1.15);

  function auToR(au) {
    const t = (Math.log(Math.max(au, 0.001)) - logMin) / (logMax - logMin);
    return 14 * dpr + t * (usableR - 14 * dpr);
  }

  ctx.save();
  for (let r = usableR * 0.25; r <= usableR; r += usableR * 0.25) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(56,232,255,0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  const hz = star.hz || [0,0];
  if (hz[0] > 0 && hz[1] > hz[0]) {
    const r1 = auToR(hz[0]), r2 = auToR(hz[1]);
    ctx.save();
    const grad = ctx.createRadialGradient(cx,cy,r1,cx,cy,r2);
    grad.addColorStop(0,   'rgba(60,220,100,0.00)');
    grad.addColorStop(0.3, 'rgba(60,220,100,0.06)');
    grad.addColorStop(0.7, 'rgba(60,220,100,0.06)');
    grad.addColorStop(1,   'rgba(60,220,100,0.00)');
    ctx.beginPath();
    ctx.arc(cx,cy,r2,0,Math.PI*2);
    ctx.arc(cx,cy,r1,0,Math.PI*2,true);
    ctx.fillStyle = grad; ctx.fill();
    ctx.setLineDash([4*dpr, 6*dpr]);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(60,220,100,0.22)';
    ctx.beginPath(); ctx.arc(cx,cy,r1,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,r2,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.save();
  planets.forEach(p => {
    const a = auToR(p.semi_major_AU || 0.1);
    ctx.beginPath(); ctx.arc(cx, cy, a, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56,232,255,0.18)'; ctx.lineWidth = 0.8; ctx.stroke();
  });
  ctx.restore();

  const starR     = Math.max(6, (star.radius_hint || 5) * dpr * 1.2);
  const starColor = sm.glow || '#38e8ff';
  const sg1 = ctx.createRadialGradient(cx,cy,0,cx,cy,starR*5);
  sg1.addColorStop(0, hexToRgba(starColor,0.35)); sg1.addColorStop(0.3,hexToRgba(starColor,0.12)); sg1.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(cx,cy,starR*5,0,Math.PI*2); ctx.fillStyle=sg1; ctx.fill();
  const sg2 = ctx.createRadialGradient(cx-starR*0.3,cy-starR*0.3,0,cx,cy,starR);
  sg2.addColorStop(0,'#ffffff'); sg2.addColorStop(0.4,starColor); sg2.addColorStop(1,hexToRgba(starColor,0.6));
  ctx.beginPath(); ctx.arc(cx,cy,starR,0,Math.PI*2); ctx.fillStyle=sg2; ctx.fill();

  const planetPositions = [];
  planets.forEach(p => {
    const a      = auToR(p.semi_major_AU || 0.1);
    const period = Math.sqrt(Math.pow(p.semi_major_AU || 1, 3));
    const phase  = ((p.angle_deg || 0) * Math.PI) / 180;
    const angle  = phase + (orreryT / period) * Math.PI * 2;
    const px = cx + Math.cos(angle) * a;
    const py = cy + Math.sin(angle) * a;
    const pm = getPlanetMeta(p.type);
    const pr = Math.max(3*dpr, Math.min(9*dpr, (p.radius_hint||1) * 3.2 * dpr));

    if (p.zone === 'habitable') {
      ctx.save();
      ctx.beginPath(); ctx.arc(px,py,pr+4*dpr,0,Math.PI*2);
      ctx.strokeStyle='rgba(80,255,120,0.4)'; ctx.lineWidth=1; ctx.stroke();
      ctx.restore();
    }

    const pg = ctx.createRadialGradient(px,py,0,px,py,pr*2.5);
    pg.addColorStop(0, hexToRgba(pm.color,0.5)); pg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(px,py,pr*2.5,0,Math.PI*2); ctx.fillStyle=pg; ctx.fill();

    const pb = ctx.createRadialGradient(px-pr*0.3,py-pr*0.3,0,px,py,pr);
    pb.addColorStop(0, lightenHex(pm.color,60)); pb.addColorStop(0.5,pm.color); pb.addColorStop(1,darkenHex(pm.color,50));
    ctx.beginPath(); ctx.arc(px,py,pr,0,Math.PI*2); ctx.fillStyle=pb; ctx.fill();

    ctx.save();
    ctx.font = `${11*dpr}px 'Share Tech Mono', monospace`;
    ctx.fillStyle = 'rgba(180,210,255,0.65)';
    ctx.textAlign = px > cx ? 'left' : 'right';
    ctx.fillText(p.name, px + (px > cx ? pr+4*dpr : -(pr+4*dpr)), py + 4*dpr);
    ctx.restore();

    planetPositions.push({ p, px, py, pr });
  });

  orreryCanvas._planets = planetPositions;
  ctx.restore();
}

orreryCanvas.addEventListener('mousemove', e => {
  if (!orreryCanvas._planets) return;
  const rect = orreryCanvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * devicePixelRatio;
  const my = (e.clientY - rect.top)  * devicePixelRatio;
  let hit = null;
  for (const { p, px, py, pr } of orreryCanvas._planets) {
    if (Math.hypot(mx-px, my-py) < pr + 8 * devicePixelRatio) { hit = p; break; }
  }
  if (hit) {
    document.getElementById('ohl-name').textContent = hit.name;
    document.getElementById('ohl-sub').textContent  = `${hit.type} · ${hit.semi_major_AU} AU`;
    const mRect = orreryModal.getBoundingClientRect();
    orreryHover.style.display = 'block';
    orreryHover.style.left = (e.clientX - mRect.left + 14) + 'px';
    orreryHover.style.top  = (e.clientY - mRect.top  - 14) + 'px';
    orreryCanvas.style.cursor = 'crosshair';
  } else {
    orreryHover.style.display = 'none';
    orreryCanvas.style.cursor = 'default';
  }
});
orreryCanvas.addEventListener('mouseleave', () => { orreryHover.style.display = 'none'; });

function hexToRgba(hex, a) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}
function lightenHex(hex, amt) {
  return `rgb(${Math.min(255,parseInt(hex.slice(1,3),16)+amt)},${Math.min(255,parseInt(hex.slice(3,5),16)+amt)},${Math.min(255,parseInt(hex.slice(5,7),16)+amt)})`;
}
function darkenHex(hex, amt) {
  return `rgb(${Math.max(0,parseInt(hex.slice(1,3),16)-amt)},${Math.max(0,parseInt(hex.slice(3,5),16)-amt)},${Math.max(0,parseInt(hex.slice(5,7),16)-amt)})`;
}

function showPanel() { panel.style.transform = 'translateX(0)'; }
function hidePanel()  { panel.style.transform = 'translateX(100%)'; selectedId = null; }

const SYSGEN_VERSION = 'v2';
function sysKey(id)             { return `sysgen:${SYSGEN_VERSION}:${id}`; }
function getCachedSystem(id)    { try { const r=localStorage.getItem(sysKey(id)); return r ? JSON.parse(r) : null; } catch { return null; } }
function setCachedSystem(id, d) { try { localStorage.setItem(sysKey(id), JSON.stringify(d)); } catch {} }

function prngSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i=0; i<str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  let s = h || 0xdeadbeef;
  return () => { s ^= s<<13; s ^= s>>>17; s ^= s<<5; return (s>>>0) / 4294967296; };
}

async function ensureSystemDetails(id, forceRegen=false) {
  let det = forceRegen ? null : getCachedSystem(id);
  if (!det) { det = generateDeterministic(id); setCachedSystem(id, det); }
  return det;
}

function exportSystemDetails(id) {
  const det = getCachedSystem(id);
  if (!det) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(det,null,2)],{type:'application/json'}));
  a.download = `system_${id}_${SYSGEN_VERSION}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const STAR_META = {
  'Main Sequence': { abbr:'MS', bg:'#2a4a1a', glow:'#7ed44a', text:'#7ed44a' },
  'K-Dwarf':       { abbr:'K',  bg:'#4a2e10', glow:'#e8832a', text:'#e8832a' },
  'G-Dwarf':       { abbr:'G',  bg:'#4a3a10', glow:'#f5c542', text:'#f5c542' },
  'F-Dwarf':       { abbr:'F',  bg:'#3a3a1a', glow:'#fff0a0', text:'#ffe060' },
  'M-Dwarf':       { abbr:'M',  bg:'#4a1a1a', glow:'#ff6666', text:'#ff6666' },
  'Subgiant':      { abbr:'SG', bg:'#3a2a10', glow:'#ffaa44', text:'#ffaa44' },
  'Giant':         { abbr:'GI', bg:'#2a1a40', glow:'#cc88ff', text:'#cc88ff' },
  'Neutron':       { abbr:'NS', bg:'#102030', glow:'#38e8ff', text:'#38e8ff' },
  'Black Hole':    { abbr:'BH', bg:'#080808', glow:'#9955ff', text:'#9955ff' },
};

const PLANET_META = {
  'Rocky':        { icon:'◉', color:'#aa8866' },
  'Ice':          { icon:'❄', color:'#88ccee' },
  'Gas':          { icon:'⬤', color:'#8866bb' },
  'Ocean':        { icon:'◉', color:'#3388cc' },
  'Desert':       { icon:'◉', color:'#cc9944' },
  'Shield World': { icon:'⬡', color:'#33ccaa' },
  'Ecumenopolis': { icon:'⬡', color:'#ffcc44' },
  'Installation': { icon:'◈', color:'#38e8ff' },
  'Habitat':      { icon:'◈', color:'#88ff88' },
};

function getPlanetMeta(type) { return PLANET_META[type] || { icon:'◉', color:'#888' }; }
function getStarMeta(kind)   { return STAR_META[kind]   || { abbr:'?', bg:'#1a2a3a', glow:'#38e8ff', text:'#38e8ff' }; }

function generateDeterministic(id) {
  const rnd = prngSeed(id);

  const starTable = [
    { kind:'M-Dwarf',       w:34, hz:[0.1,0.4],   innerEdge:0.05, outerEdge:8,  starR:3 },
    { kind:'K-Dwarf',       w:22, hz:[0.4,0.9],   innerEdge:0.08, outerEdge:15, starR:4 },
    { kind:'G-Dwarf',       w:18, hz:[0.8,1.6],   innerEdge:0.15, outerEdge:20, starR:5 },
    { kind:'Main Sequence', w:10, hz:[0.9,1.8],   innerEdge:0.15, outerEdge:20, starR:5 },
    { kind:'F-Dwarf',       w:8,  hz:[1.2,2.5],   innerEdge:0.2,  outerEdge:25, starR:6 },
    { kind:'Subgiant',      w:4,  hz:[2.0,5.0],   innerEdge:0.3,  outerEdge:40, starR:7 },
    { kind:'Giant',         w:2,  hz:[5.0,12.0],  innerEdge:0.5,  outerEdge:60, starR:9 },
    { kind:'Neutron',       w:1,  hz:[0.02,0.08], innerEdge:0.01, outerEdge:5,  starR:2 },
    { kind:'Black Hole',    w:1,  hz:[0.0,0.0],   innerEdge:0.3,  outerEdge:50, starR:2 },
  ];
  const totalW = starTable.reduce((s,e) => s+e.w, 0);
  let pick = rnd() * totalW;
  const starEntry = starTable.find(e => { pick -= e.w; return pick <= 0; }) || starTable[2];
  const kind = starEntry.kind;
  const [hzIn, hzOut] = starEntry.hz;

  function classifyZone(a) {
    if (a < starEntry.innerEdge * 1.5)                    return 'inner';
    if (a >= hzIn * 0.7 && a <= hzOut * 1.3)             return 'habitable';
    if (a > hzOut * 1.3 && a < starEntry.outerEdge * 0.4) return 'outer';
    return 'fringe';
  }

  function pickType(zone) {
    const r = rnd();
    if (kind === 'Neutron')    return ['Rocky','Installation','Habitat','Ice'][Math.floor(rnd()*4)];
    if (kind === 'Black Hole') return ['Rocky','Desert','Installation'][Math.floor(rnd()*3)];
    switch(zone) {
      case 'inner':     return r<0.50?'Rocky':r<0.75?'Desert':r<0.88?'Ocean':'Installation';
      case 'habitable': return r<0.30?'Ocean':r<0.55?'Rocky':r<0.70?'Desert':r<0.82?'Ecumenopolis':r<0.90?'Shield World':'Installation';
      case 'outer':     return r<0.45?'Gas':r<0.70?'Ice':r<0.85?'Rocky':'Habitat';
      case 'fringe':    return r<0.55?'Ice':r<0.80?'Gas':'Rocky';
    }
  }

  const TYPE_RADIUS = {
    'Rocky':0.9,'Desert':0.85,'Ocean':1.0,'Ice':0.8,'Gas':2.2,
    'Ecumenopolis':1.1,'Shield World':1.0,'Installation':0.6,'Habitat':0.5
  };

  const usedNames = new Set();
  const prefixes  = ['Aryn','Vel','Cor','Sith','Eld','Myr','Tar','Keth','Vor','Sev','Nox','Cal'];
  const suffixes  = ['is','os','ax','en','ar','ia','um','on','eth','el'];
  function genName() {
    let n;
    do { n = prefixes[Math.floor(rnd()*prefixes.length)] + suffixes[Math.floor(rnd()*suffixes.length)]; }
    while (usedNames.has(n));
    usedNames.add(n);
    return n;
  }

  const planetCount = 2 + Math.floor(rnd() * 9);
  const planets = [];
  let au = starEntry.innerEdge * (1 + rnd() * 2);

  for (let i=0; i<planetCount; i++) {
    const zone = classifyZone(au);
    const type = pickType(zone);
    planets.push({
      name:          genName(),
      semi_major_AU: +au.toFixed(3),
      type, zone,
      radius_hint:   +((TYPE_RADIUS[type]||1) * (0.85 + rnd()*0.3)).toFixed(3),
      ecc:           +(rnd()*0.18).toFixed(3),
      angle_deg:     +(rnd()*360).toFixed(1),
      notes:         (i > 0 && rnd() < 0.12) ? 'Orbital resonance detected' : ''
    });
    au = au * (1.45 + rnd()*0.75) * (0.9 + rnd()*0.2);
    if (au > starEntry.outerEdge) break;
  }

  return {
    version: SYSGEN_VERSION,
    system_id: id,
    seeded: true,
    generated_at: new Date().toISOString(),
    star: { kind, hz: starEntry.hz, inner_edge: starEntry.innerEdge, outer_edge: starEntry.outerEdge, radius_hint: starEntry.starR },
    planets
  };
}

function buildOrbitSVG(planets, starColor, sm, starData) {
  const cx = 110, cy = 110, maxR = 100;
  const allAU  = planets.map(p => p.semi_major_AU||0.1);
  const minAU  = Math.max(0.01, (starData?.inner_edge||0.05) * 0.5);
  const maxAU  = Math.max(...allAU, 1) * 1.15;
  const logMin = Math.log(minAU), logMax = Math.log(maxAU);

  function auToR(au) {
    const t = (Math.log(Math.max(au, 0.001)) - logMin) / (logMax - logMin);
    return 8 + t * (maxR - 8);
  }

  const [hzIn, hzOut] = starData?.hz || [0.8, 1.6];
  const hzR1 = auToR(hzIn), hzR2 = auToR(hzOut);
  const hzVisible = hzR1 < maxR && hzR2 > 8 && hzIn > 0;
  const starVisR = Math.min(7, 3 + (starData?.radius_hint||5) * 0.6);

  const defs = `<defs>
    <filter id="glow-s" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-p" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="1.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="star-grad" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="${starColor}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${starColor}" stop-opacity="0.5"/>
    </radialGradient>
  </defs>`;

  const bg   = `<circle cx="${cx}" cy="${cy}" r="108" fill="rgba(4,7,14,.85)" stroke="rgba(56,232,255,.06)" stroke-width="1"/>`;
  let grid   = '';
  for (let r = 20; r <= maxR; r += 20) grid += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(56,232,255,.05)" stroke-width="0.5"/>`;

  const hz = hzVisible
    ? `<circle cx="${cx}" cy="${cy}" r="${hzR2.toFixed(1)}" fill="rgba(80,255,120,.06)" stroke="rgba(80,255,120,.18)" stroke-width="0.8" stroke-dasharray="3 4"/>
       <circle cx="${cx}" cy="${cy}" r="${hzR1.toFixed(1)}" fill="none" stroke="rgba(80,255,120,.12)" stroke-width="0.6" stroke-dasharray="2 5"/>` : '';

  let orbits = '', dots = '', labels = '';
  planets.forEach(p => {
    const a   = auToR(p.semi_major_AU||0.1), ecc = p.ecc||0;
    const b   = a * Math.sqrt(1 - ecc*ecc), off = a * ecc;
    const rot = p.angle_deg || 0;
    orbits += `<ellipse cx="${(cx+off*0.3).toFixed(1)}" cy="${cy}" rx="${a.toFixed(1)}" ry="${b.toFixed(1)}" fill="none" stroke="rgba(56,232,255,.16)" stroke-width="0.7" transform="rotate(${rot} ${cx} ${cy})"/>`;

    const ang = ((p.angle_deg||0) * Math.PI) / 180;
    const px  = cx + off*0.3 + Math.cos(ang) * a;
    const py  = cy + Math.sin(ang) * b;
    const pr  = Math.max(2.2, Math.min(5.5, (p.radius_hint||1) * 2.2));
    const pm  = getPlanetMeta(p.type);

    if (p.zone === 'habitable') dots += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(pr+3).toFixed(1)}" fill="none" stroke="rgba(80,255,120,.3)" stroke-width="0.8"/>`;
    dots += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${pm.color}" opacity=".92" filter="url(#glow-p)"><title>${p.name} · ${p.type} · ${p.semi_major_AU} AU</title></circle>`;

    const ld = Math.hypot(px-cx, py-cy);
    if (ld > 14 && ld < 104) {
      const lx = cx + (px-cx)/ld * (ld+pr+5), ly = cy + (py-cy)/ld * (ld+pr+5);
      labels += `<text x="${lx.toFixed(1)}" y="${(ly+3).toFixed(1)}" font-family="'Share Tech Mono',monospace" font-size="7" fill="rgba(180,210,255,.55)" text-anchor="${lx>cx?'start':'end'}" letter-spacing="0.5">${p.name}</text>`;
    }
  });

  const starGlow = `<circle cx="${cx}" cy="${cy}" r="${(starVisR*3.5).toFixed(1)}" fill="${starColor}" opacity=".08"/>
    <circle cx="${cx}" cy="${cy}" r="${(starVisR*1.8).toFixed(1)}" fill="${starColor}" opacity=".15"/>
    <circle cx="${cx}" cy="${cy}" r="${starVisR.toFixed(1)}" fill="url(#star-grad)" filter="url(#glow-s)"/>`;

  let ticks = '';
  [0.5, 1, 5, 10, 20].filter(v => v >= minAU && v <= maxAU).forEach(v => {
    const tr = auToR(v);
    if (tr > 10 && tr < maxR - 2) ticks += `<text x="${(cx+tr+2).toFixed(1)}" y="${(cy+3).toFixed(1)}" font-family="'Share Tech Mono',monospace" font-size="6" fill="rgba(56,232,255,.3)">${v}AU</text>`;
  });

  const hzLabel = hzVisible
    ? `<text x="${((hzR1+hzR2)/2+cx+2).toFixed(1)}" y="${(cy-3).toFixed(1)}" font-family="'Share Tech Mono',monospace" font-size="6" fill="rgba(80,255,120,.45)" letter-spacing="0.5">HZ</text>` : '';

  return `<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">${defs}${bg}${grid}${hz}${orbits}${labels}${ticks}${hzLabel}${starGlow}${dots}</svg>`;
}

function renderPanel(id, details) {
  const sys    = systems.find(s => s.id === id);
  const star   = details?.star || {};
  const planets= details?.planets || [];
  const sm     = getStarMeta(star.kind);

  spTitle.textContent        = sys?.name || id;
  spSysId.textContent        = id;
  spOwner.textContent        = sys?.owner ? `◈ ${sys.owner}` : '';
  spStarAbbr.textContent     = sm.abbr;
  spStarOrb.style.background = `radial-gradient(circle at 35% 35%, ${sm.glow}44, ${sm.bg})`;
  spStarOrb.style.boxShadow  = `0 0 12px ${sm.glow}44, inset 0 0 8px ${sm.glow}22`;
  spStarOrb.style.color      = sm.text;

  const pov  = document.getElementById('pane-overview');
  const tags = Array.isArray(sys?.tags) && sys.tags.length
    ? sys.tags.map(t => `<span class="tag-chip">${t}</span>`).join('') : '';

  const orbitSVG = planets.length
    ? `<div class="orbit-diagram">${buildOrbitSVG(planets, sm.glow, sm, details?.star)}</div>` : '';

  const inner  = planets.length ? planets.reduce((a,b) => (a.semi_major_AU||99)<(b.semi_major_AU||99)?a:b).semi_major_AU ?? '?' : '—';
  const outer  = planets.length ? planets.reduce((a,b) => (a.semi_major_AU||0)>(b.semi_major_AU||0)?a:b).semi_major_AU ?? '?' : '—';

  pov.innerHTML = `
    ${orbitSVG}
    <div class="stats-grid">
      <div class="stat-cell">
        <div class="stat-key">Star Class</div>
        <div class="stat-val" style="color:${sm.text};font-size:16px;">${star.kind || '—'}</div>
        <div class="stat-sub">${sm.abbr} TYPE</div>
      </div>
      <div class="stat-cell">
        <div class="stat-key">Bodies</div>
        <div class="stat-val cyan">${planets.length}</div>
        <div class="stat-sub">ORBITAL OBJECTS</div>
      </div>
      <div class="stat-cell">
        <div class="stat-key">Nearest</div>
        <div class="stat-val gold" style="font-size:15px;">${inner}</div>
        <div class="stat-sub">AU INNER ORBIT</div>
      </div>
      <div class="stat-cell">
        <div class="stat-key">Farthest</div>
        <div class="stat-val" style="font-size:15px;">${outer}</div>
        <div class="stat-sub">AU OUTER ORBIT</div>
      </div>
    </div>
    <div class="meta-row"><span class="mk">System ID</span><span class="mv hi">${id}</span></div>
    <div class="meta-row"><span class="mk">Name</span><span class="mv">${sys?.name || '—'}</span></div>
    ${sys?.owner  ? `<div class="meta-row"><span class="mk">Owner</span><span class="mv go">${sys.owner}</span></div>` : ''}
    ${sys?.source ? `<div class="meta-row"><span class="mk">Source</span><span class="mv" style="font-size:13px;color:var(--text-muted);">${sys.source}</span></div>` : ''}
    ${tags        ? `<div class="meta-row"><span class="mk">Tags</span><span class="mv">${tags}</span></div>` : ''}
    <div class="meta-row"><span class="mk">Record</span><span class="mv" style="font-size:13px;color:var(--text-muted);">${details?.version || '—'} · ${details?.generated_at ? new Date(details.generated_at).toLocaleDateString() : 'unscanned'}</span></div>
  `;

  const pbod = document.getElementById('pane-bodies');
  if (!planets.length) {
    pbod.innerHTML = `<div class="empty-state"><div class="empty-state-icon">◎</div><div class="empty-state-text">// NO ORBITAL DATA<br>// PRESS ⟳ SCAN SYSTEM</div></div>`;
  } else {
    const sorted = [...planets].sort((a,b) => (a.semi_major_AU||0) - (b.semi_major_AU||0));
    pbod.innerHTML = `
      <div class="bodies-header">
        <span class="bodies-count">${planets.length} ORBITAL OBJECT${planets.length!==1?'S':''} DETECTED</span>
      </div>
      ${sorted.map(p => {
        const pm = getPlanetMeta(p.type);
        return `<div class="planet-card">
          <div class="p-icon" style="background:${pm.color}22;color:${pm.color};">${pm.icon}</div>
          <div class="p-info">
            <div class="p-name">${p.name}</div>
            <div class="p-type-badge">${p.type ?? 'UNKNOWN'}</div>
            ${p.notes ? `<div class="p-notes-line">${p.notes}</div>` : ''}
          </div>
          <div class="p-orbit-val">${p.semi_major_AU ?? '?'}<br><span style="font-size:7px;color:var(--text-muted);">AU</span></div>
        </div>`;
      }).join('')}
    `;
  }

  renderEditPane(id, details, sys);
  renderFleetsPane(id);
  rebuildStarsVBO();
  showPanel();
}

function renderEditPane(id, details, sys) {
  if (!sys) sys = systems.find(s => s.id === id);
  const star    = details?.star || {};
  const planets = details?.planets || [];
  const starKinds = ['Main Sequence','K-Dwarf','G-Dwarf','F-Dwarf','M-Dwarf','Subgiant','Giant','Neutron','Black Hole'];
  const starOpts = starKinds.map(k => `<option value="${k}" ${star.kind===k?'selected':''}>${k}</option>`).join('');
  const planetTypes = ['Rocky','Ice','Gas','Ocean','Desert','Shield World','Ecumenopolis','Installation','Habitat'];

  /* ── find connected lanes ── */
  const connectedLanes = [];
  for (const key of lanesSet) {
    const [a,b] = key.split('::');
    if (a === id || b === id) {
      const otherId = a === id ? b : a;
      const otherSys = systems.find(s => s.id === otherId);
      connectedLanes.push({ key, otherId, otherName: otherSys?.name || otherId });
    }
  }
  connectedLanes.sort((a,b) => a.otherName.localeCompare(b.otherName));

  /* ── build lane-add target list (exclude self + already connected) ── */
  const connectedIds = new Set(connectedLanes.map(l => l.otherId));
  const laneTargets = systems
    .filter(s => s.id !== id && !connectedIds.has(s.id))
    .sort((a,b) => (a.name||a.id).localeCompare(b.name||b.id));
  const laneTargetOpts = laneTargets.map(s => `<option value="${s.id}">${s.name || s.id}</option>`).join('');

  const pedit = document.getElementById('pane-edit');
  pedit.innerHTML = `
    <div class="edit-section">
      <div class="edit-section-title">System Identity</div>
      <div class="form-row"><span class="fl">ID</span><span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--cyan-dim);letter-spacing:1px;">${id}</span></div>
      <div class="form-row">
        <label class="fl">Name</label>
        <input id="ed-name" class="sci-input" type="text" value="${(sys?.name||'').replaceAll('"','&quot;')}"/>
      </div>
      <div class="form-row">
        <label class="fl">Owner</label>
        <input id="ed-owner" class="sci-input" type="text" value="${(sys?.owner||'').replaceAll('"','&quot;')}" placeholder="Faction / owner..."/>
      </div>
      <div class="form-row">
        <label class="fl">Tags</label>
        <input id="ed-tags" class="sci-input" type="text" value="${(sys?.tags||[]).filter(t => !ALERT_TAG_KEYS.includes(t.toLowerCase())).join(', ')}" placeholder="Custom tags (comma separated)..."/>
      </div>
      <div class="edit-section" style="margin-top:6px;">
        <div class="edit-section-title">System Alerts</div>
        <div id="ed-alert-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          ${ALERT_TAG_DEFS.map(a => {
            const checked = (sys?.tags||[]).some(t => t.toLowerCase() === a.key) ? 'checked' : '';
            return `<label class="alert-check ${a.cls}" style="display:flex;align-items:center;gap:7px;padding:5px 8px;border:1px solid var(--border);border-radius:2px;font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;transition:all .12s;background:${checked ? 'rgba('+a.rgb+',.06)' : 'transparent'};border-color:${checked ? 'rgba('+a.rgb+',.35)' : 'var(--border)'};">
              <input type="checkbox" class="ed-alert-cb" data-tag="${a.key}" ${checked} style="accent-color:${a.color};"/>
              <span style="color:${a.color};">${a.icon}</span>
              <span style="color:${checked ? a.color : 'var(--text-dim)'};">${a.label}</span>
            </label>`;
          }).join('')}
        </div>
      </div>
      <div class="form-row">
        <label class="fl">Notes</label>
        <input id="ed-notes" class="sci-input" type="text" value="${(sys?.notes||'').replaceAll('"','&quot;')}" placeholder="One-liner shown on hover..."/>
      </div>
      <div class="form-row">
        <label class="fl">Star</label>
        <select id="ed-star" class="sci-select">${starOpts}</select>
      </div>
    </div>

    <div class="edit-section">
      <div class="edit-section-title">Lanes (${connectedLanes.length})</div>
      <div id="ed-lane-list">
        ${connectedLanes.length ? connectedLanes.map(l => `
          <div class="lane-row" data-lane-key="${l.key}">
            <span class="lane-row-name">${l.otherName}</span>
            <span class="lane-row-id">${l.otherId}</span>
            <button type="button" class="lane-row-del" title="Remove lane">✕</button>
          </div>
        `).join('') : '<div class="edit-empty-hint">No lanes connected</div>'}
      </div>
      ${laneTargets.length ? `
      <div class="lane-add-bar">
        <select id="ed-lane-target" class="sci-select" style="flex:1;font-size:12px;">
          <option value="" disabled selected>Connect to…</option>
          ${laneTargetOpts}
        </select>
        <button type="button" id="ed-lane-add" class="pbtn primary" style="padding:5px 10px;white-space:nowrap;">+ LANE</button>
      </div>` : ''}
    </div>

    <div class="edit-section">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="edit-section-title" style="flex:1;border:none;margin:0;padding:0;">Bodies (${planets.length})</div>
        <button id="ed-add-body" type="button" class="pbtn primary" style="margin-bottom:8px;padding:3px 10px;">+ BODY</button>
      </div>
      <div id="ed-planet-list">
        ${planets.map((p,i) => planetEditorRow(p, i, planetTypes)).join('')}
      </div>
    </div>

    <div class="edit-actions" style="margin-top:12px;">
      <button id="ed-save" class="pbtn success" style="flex:1;padding:8px;">✓ SAVE ALL</button>
      <button id="ed-delete-sys" class="pbtn danger" style="padding:8px 12px;" title="Delete system">⌫ DEL</button>
    </div>
    <div id="ed-toast" class="edit-toast"></div>
  `;

  /* ── wire up lane management ── */
  const laneList = pedit.querySelector('#ed-lane-list');
  laneList.addEventListener('click', e => {
    const del = e.target.closest('.lane-row-del');
    if (!del) return;
    const row = del.closest('.lane-row');
    const key = row.dataset.laneKey;
    if (key && lanesSet.has(key)) {
      lanesSet.delete(key);
      rebuildLinesVBOFromSet();
      updateLaneCounts();
      saveMapState();
      row.style.opacity = '0';
      row.style.height = row.offsetHeight + 'px';
      requestAnimationFrame(() => { row.style.height = '0'; row.style.padding = '0'; row.style.margin = '0'; row.style.overflow = 'hidden'; });
      setTimeout(() => {
        row.remove();
        if (!laneList.querySelector('.lane-row')) laneList.innerHTML = '<div class="edit-empty-hint">No lanes connected</div>';
        showEditToast('Lane removed');
      }, 180);
    }
  });

  pedit.querySelector('#ed-lane-add')?.addEventListener('click', () => {
    const sel = pedit.querySelector('#ed-lane-target');
    const targetId = sel.value;
    if (!targetId) return;
    const key = [id, targetId].sort().join('::');
    if (!lanesSet.has(key)) {
      lanesSet.add(key);
      rebuildLinesVBOFromSet();
      updateLaneCounts();
      saveMapState();
      const det = getCachedSystem(id) || details;
      renderEditPane(id, det, sys);
      showEditToast('Lane connected');
    }
  });

  /* ── wire up planet list ── */
  const planetList = pedit.querySelector('#ed-planet-list');

  pedit.querySelector('#ed-add-body').onclick = () => {
    const idx = planetList.querySelectorAll('.ed-body-row').length;
    const tmp = document.createElement('div');
    tmp.innerHTML = planetEditorRow({name:`P${idx+1}`,type:'Rocky',semi_major_AU:1.0,notes:''}, idx, planetTypes);
    const row = tmp.firstElementChild;
    planetList.appendChild(row);
    row.style.opacity = '0';
    requestAnimationFrame(() => row.style.opacity = '1');
    reindexPlanets(planetList);
  };

  planetList.addEventListener('click', e => {
    const del = e.target.closest('.ed-body-del');
    if (!del) return;
    const row = del.closest('.ed-body-row');
    row.style.opacity = '0';
    setTimeout(() => { row.remove(); reindexPlanets(planetList); }, 150);
  });

  /* ── collapsible body rows ── */
  planetList.addEventListener('click', e => {
    const head = e.target.closest('.ed-body-head');
    if (!head || e.target.closest('.ed-body-del')) return;
    const row = head.closest('.ed-body-row');
    row.classList.toggle('collapsed');
  });

  /* ── save ── */
  pedit.querySelector('#ed-save').onclick = () => {
    const newName  = pedit.querySelector('#ed-name').value.trim();
    const newOwner = pedit.querySelector('#ed-owner').value.trim();
    const customTags = pedit.querySelector('#ed-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const alertTags = Array.from(pedit.querySelectorAll('.ed-alert-cb:checked')).map(cb => cb.dataset.tag);
    const newTags = [...alertTags, ...customTags];
    const newNotes = pedit.querySelector('#ed-notes').value.trim();
    const newKind  = pedit.querySelector('#ed-star').value;
    const newPlanets = Array.from(planetList.querySelectorAll('.ed-body-row')).map(row => ({
      name:          row.querySelector('.ed-b-name').value.trim() || 'Body',
      type:          row.querySelector('.ed-b-type').value,
      semi_major_AU: +parseFloat(row.querySelector('.ed-b-au').value).toFixed(3) || 1,
      notes:         row.querySelector('.ed-b-notes').value.trim()
    }));

    const base = getCachedSystem(id) || { version:SYSGEN_VERSION, system_id:id, seeded:true };
    const updated = { ...base, star:{ ...base.star, kind:newKind }, planets:newPlanets };
    setCachedSystem(id, updated);

    if (sys) {
      if (newName) sys.name = newName;
      sys.owner = newOwner || undefined;
      sys.tags = newTags.length ? newTags : undefined;
      sys.notes = newNotes || undefined;
    }
    saveMapState();

    showEditToast('Changes saved');
    setTimeout(() => {
      renderPanel(id, updated);
      document.querySelector('#sp-tabs .tab[data-tab="overview"]')?.click();
    }, 400);
  };

  /* ── delete system ── */
  pedit.querySelector('#ed-delete-sys').onclick = () => {
    const sysName = sys?.name || id;
    if (!confirm(`Delete system "${sysName}"?\nThis also removes all lanes connected to it.`)) return;
    /* remove lanes */
    for (const key of [...lanesSet]) {
      const [a,b] = key.split('::');
      if (a === id || b === id) lanesSet.delete(key);
    }
    rebuildLinesVBOFromSet();
    /* remove system */
    const idx = systems.findIndex(s => s.id === id);
    if (idx >= 0) systems.splice(idx, 1);
    idToWorld.delete(id);
    try { localStorage.removeItem(sysKey(id)); } catch {}
    rebuildStarsVBO();
    updateLaneCounts();
    saveMapState();
    selectedId = null;
    hidePanel();
  };
}

function reindexPlanets(container) {
  container.querySelectorAll('.ed-body-row').forEach((row, i) => {
    const idx = row.querySelector('.ed-body-idx');
    if (idx) idx.textContent = `${i + 1}`;
  });
}

function planetEditorRow(p, i, planetTypes) {
  const pm  = getPlanetMeta(p.type);
  const typeOpts = planetTypes.map(t => `<option value="${t}" ${p.type===t?'selected':''}>${t}</option>`).join('');
  return `
  <div class="ed-body-row" style="transition:opacity .15s;">
    <div class="ed-body-head">
      <span class="ed-body-icon" style="color:${pm.color};">${pm.icon}</span>
      <span class="ed-body-idx">${i+1}</span>
      <span class="ed-body-preview">${p.name || 'Body'} <span class="ed-body-au-hint">${p.semi_major_AU ?? '?'} AU</span></span>
      <span class="ed-body-chevron">▾</span>
      <button type="button" class="ed-body-del" title="Remove body">✕</button>
    </div>
    <div class="ed-body-fields">
      <div class="form-row"><span class="fl">Name</span><input class="ed-b-name sci-input" type="text" value="${(p.name||'').replaceAll('"','&quot;')}"/></div>
      <div class="form-row"><span class="fl">Type</span><select class="ed-b-type sci-select">${typeOpts}</select></div>
      <div class="form-row"><span class="fl">Orbit AU</span><input class="ed-b-au sci-input" type="number" step="0.001" min="0.001" value="${p.semi_major_AU ?? 1}"/></div>
      <div class="form-row"><span class="fl">Notes</span><input class="ed-b-notes sci-input" type="text" value="${(p.notes||'').replaceAll('"','&quot;')}" placeholder="optional..."/></div>
    </div>
  </div>`;
}

function showEditToast(msg) {
  const el = document.getElementById('ed-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 1800);
}

function updateLaneCounts() {
  const sbLanes = document.getElementById('sb-lanes-ct');
  if (sbLanes) sbLanes.textContent = `${lanesSet.size} LANES MAPPED`;
}

function projectToScreen(x, y, z, mvp) {
  const cx = x*mvp[0]+y*mvp[4]+z*mvp[8] +mvp[12];
  const cy = x*mvp[1]+y*mvp[5]+z*mvp[9] +mvp[13];
  const cz = x*mvp[2]+y*mvp[6]+z*mvp[10]+mvp[14];
  const cw = x*mvp[3]+y*mvp[7]+z*mvp[11]+mvp[15];
  if (!cw) return null;
  return [
    Math.round((cx/cw*0.5+0.5)*canvas.width),
    Math.round((-cy/cw*0.5+0.5)*canvas.height),
    cz/cw
  ];
}

function screenToWorldOnZ0(clientX, clientY, mvp) {
  const inv = mat4Invert(mvp);
  if (!inv) return null;
  const x = (clientX / canvas.clientWidth)  * 2 - 1;
  const y = -((clientY / canvas.clientHeight) * 2 - 1);
  const p0 = vec4MulMat(inv, new Float32Array([x, y, -1, 1]));
  const p1 = vec4MulMat(inv, new Float32Array([x, y,  1, 1]));
  for (const p of [p0,p1]) { p[0]/=p[3]; p[1]/=p[3]; p[2]/=p[3]; p[3]=1; }
  const dir = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
  if (Math.abs(dir[2]) < 1e-6) return null;
  const t = -p0[2]/dir[2];
  return [p0[0]+dir[0]*t, p0[1]+dir[1]*t, 0];
}

function findNearestSystemId(clientX, clientY, mvp, r=32) {
  const mx  = clientX * (canvas.width  / canvas.clientWidth);
  const my  = clientY * (canvas.height / canvas.clientHeight);
  const r2  = r * r;
  let best = null, bestId = null;
  for (const sys of systems) {
    const p = idToWorld.get(sys.id); if (!p) continue;
    const s = projectToScreen(p[0], p[1], p[2], mvp); if (!s) continue;
    const d2 = (s[0]-mx)**2 + (s[1]-my)**2;
    if (d2 < r2 && (best === null || d2 < best)) { best = d2; bestId = sys.id; }
  }
  return bestId;
}

function buildMVP() {
  const proj = mat4Perspective(55 * Math.PI / 180, canvas.width / canvas.height, 0.1, 50000);
  const rot  = mat4Mul(mat4RotateY(yaw), mat4RotateX(pitch));
  const view = mat4Translate(-panX, -panY, -dist);
  return mat4Mul(rot, mat4Mul(view, proj));
}

const STAR_COLORS = {
  'M-Dwarf':       [1.0,  0.38, 0.28],
  'K-Dwarf':       [1.0,  0.65, 0.25],
  'G-Dwarf':       [1.0,  0.92, 0.55],
  'Main Sequence': [0.95, 1.0,  0.85],
  'F-Dwarf':       [0.95, 0.97, 1.0 ],
  'Subgiant':      [1.0,  0.72, 0.35],
  'Giant':         [0.85, 0.58, 1.0 ],
  'Neutron':       [0.40, 0.95, 1.0 ],
  'Black Hole':    [0.65, 0.35, 1.0 ],
};
const STAR_SIZES = {
  'M-Dwarf':3.5,'K-Dwarf':4.5,'G-Dwarf':5.5,'Main Sequence':5.5,
  'F-Dwarf':6.5,'Subgiant':7.5,'Giant':9.0,'Neutron':3.0,'Black Hole':4.0
};

function getStarVisuals(id) {
  const det = getCachedSystem(id);
  const kind = det?.star?.kind;
  if (kind && STAR_COLORS[kind]) {
    return { color: STAR_COLORS[kind], size: STAR_SIZES[kind] || 5.0 };
  }
  const rnd = prngSeed(id);
  const keys = Object.keys(STAR_COLORS);
  const k = keys[Math.floor(rnd() * keys.length)];
  return { color: STAR_COLORS[k], size: STAR_SIZES[k] || 5.0 };
}

function rebuildStarsVBO() {
  const dpr  = window.devicePixelRatio || 1;
  const verts = [];
  for (const sys of systems) {
    const p = idToWorld.get(sys.id); if (!p) continue;
    const { color, size } = getStarVisuals(sys.id);
    verts.push(p[0], p[1], p[2], color[0], color[1], color[2], size * dpr * 2.8);
  }
  starCount = verts.length / 7;
  if (!starsVBO) starsVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starsVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

function rebuildLinesVBOFromSet() {
  const verts = [];
  for (const key of lanesSet) {
    const [a,b] = key.split('::');
    const pa = idToWorld.get(a), pb = idToWorld.get(b);
    if (!pa || !pb) continue;
    verts.push(pa[0],pa[1],pa[2], pb[0],pb[1],pb[2]);
  }
  lineVertCount = verts.length / 3;
  if (!linesVBO) linesVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, linesVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

function loop() {
  const W = canvas.width, H = canvas.height;
  gl.viewport(0, 0, W, H);
  gl.clearColor(0.0, 0.0, 0.0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);

  const wallTime = (performance.now() - t0) * 0.001;
  const mvp = buildMVP();

  /* ── 1. Nebula background ── */
  gl.useProgram(progBG);
  gl.uniform1f(uTimeBG, wallTime);
  gl.uniform2f(uResBG, W, H);
  gl.uniform3f(uPanBG, panX, panY, 0);
  gl.uniform1f(uZoomBG, dist / 1800.0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bgVBO);
  gl.enableVertexAttribArray(aPosB);
  gl.vertexAttribPointer(aPosB, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.disableVertexAttribArray(aPosB);

  gl.enable(gl.BLEND);

  /* ── 2. Lanes — multi-pass glow using simple GL_LINES ── */
  if (linesVBO && lineVertCount > 0) {
    gl.useProgram(progLines);
    gl.uniformMatrix4fv(uMVP_lines, false, mvp);
    gl.bindBuffer(gl.ARRAY_BUFFER, linesVBO);
    gl.enableVertexAttribArray(aPos_lines);
    gl.vertexAttribPointer(aPos_lines, 3, gl.FLOAT, false, 0, 0);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // outer glow pass (dim, wide if supported)
    gl.uniform4f(uColorLines, 0.10, 0.50, 0.65, 0.12);
    gl.lineWidth(3.0);
    gl.drawArrays(gl.LINES, 0, lineVertCount);

    // mid glow
    gl.uniform4f(uColorLines, 0.15, 0.60, 0.75, 0.30);
    gl.lineWidth(2.0);
    gl.drawArrays(gl.LINES, 0, lineVertCount);

    // core line (bright)
    gl.uniform4f(uColorLines, 0.25, 0.80, 0.95, 0.65);
    gl.lineWidth(1.0);
    gl.drawArrays(gl.LINES, 0, lineVertCount);
  }

  /* ── 3. Stars ── */
  if (starsVBO && starCount > 0) {
    gl.useProgram(progPoints);
    gl.uniformMatrix4fv(uMVP_points, false, mvp);
    gl.bindBuffer(gl.ARRAY_BUFFER, starsVBO);
    const stride = 7 * 4;
    gl.enableVertexAttribArray(aPos_points);
    gl.vertexAttribPointer(aPos_points, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aColor_points);
    gl.vertexAttribPointer(aColor_points, 3, gl.FLOAT, false, stride, 3 * 4);
    gl.enableVertexAttribArray(aSize_points);
    gl.vertexAttribPointer(aSize_points, 1, gl.FLOAT, false, stride, 6 * 4);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, starCount);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disableVertexAttribArray(aColor_points);
    gl.disableVertexAttribArray(aSize_points);
  }

  /* ── 4. Hover / selection ── */
  let hoveredNow = null;
  if (systems.length) {
    const mx  = mouseX * (canvas.width  / canvas.clientWidth);
    const my  = mouseY * (canvas.height / canvas.clientHeight);
    const r2  = (32 * (window.devicePixelRatio || 1)) ** 2;
    let best = null;
    for (const sys of systems) {
      const p = idToWorld.get(sys.id); if (!p) continue;
      const s = projectToScreen(p[0], p[1], p[2], mvp); if (!s) continue;
      const d2 = (s[0]-mx)**2 + (s[1]-my)**2;
      if (d2 < r2 && (best === null || d2 < best)) { best = d2; hoveredNow = sys.id; }
    }
    hoveredId = hoveredNow || null;
    if (cursorEl) cursorEl.classList.toggle('hovering', !!hoveredNow);
    if (hoveredNow) {
      const sys = systems.find(s => s.id === hoveredNow);
      if (tipName)  tipName.textContent  = sys.name || sys.id;
      if (tipId)    tipId.textContent    = sys.id;
      if (tipOwner) tipOwner.textContent = sys.owner ? `◈ ${sys.owner}` : '';
      if (tipTags) {
        const tags = Array.isArray(sys.tags) && sys.tags.length ? sys.tags : [];
        tipTags.innerHTML = tags.map(t => {
          const lc = t.toLowerCase();
          const cls = ['contested','shipyard','capital','frontier','outpost','homeworld','fortress'].includes(lc) ? ' ' + lc : '';
          return `<span class="tip-tag${cls}">${t}</span>`;
        }).join('');
      }
      if (tipNotes) tipNotes.textContent = sys.notes || '';
      tip.style.left    = mouseX + 'px';
      tip.style.top     = mouseY + 'px';
      tip.style.display = 'block';
    } else {
      tip.style.display = 'none';
    }
  }

  /* ── 5. Halos ── */
  if (!haloVBO) haloVBO = gl.createBuffer();
  function drawHalo(id, pix, ht, glow, core, mode) {
    const p = idToWorld.get(id); if (!p) return;
    gl.useProgram(progHalo);
    gl.uniformMatrix4fv(uMVP_halo, false, mvp);
    gl.uniform1f(uPix_halo, pix);
    gl.uniform1f(uTime_halo, ht);
    gl.uniform3f(uColGlow, glow[0], glow[1], glow[2]);
    gl.uniform3f(uColCore, core[0], core[1], core[2]);
    gl.uniform1f(uMode_halo, mode || 0.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, haloVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPos_halo);
    gl.vertexAttribPointer(aPos_halo, 3, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  const t = wallTime;
  if (hoveredNow) {
    drawHalo(hoveredNow, 70.0, t, [0.20,0.60,0.70], [0.35,0.95,1.0], 0.0); // bloom
    drawHalo(hoveredNow, 48.0, t, [0.35,0.95,1.0], [1.0,0.95,0.50], 0.0); // crisp
  }
  if (selectedId) {
    drawHalo(selectedId, 80.0, t, [0.50,0.40,0.15], [1.0,0.85,0.35], 1.0); // bloom
    drawHalo(selectedId, 56.0, t, [1.0,0.85,0.35],  [1.0,0.98,0.70], 1.0); // crisp
  }
  if (window._lanePickA) {
    drawHalo(window._lanePickA, 65.0, t*1.5, [0.10,0.40,0.55], [0.15,0.65,0.78], 2.0);
    drawHalo(window._lanePickA, 46.0, t*1.5, [0.15,0.65,0.78], [0.4,0.85,1.0],  2.0);
  }

  updateFleetMapIcons(mvp);
  updateAlertIcons(mvp);

  requestAnimationFrame(loop);
}

/* ═══════════════════════════════════════════════════════════════════
   FLEET MANAGEMENT SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

const ELVISH_SHIP_CLASSES = [
  { name: 'LÓMIËL-CLASS INTERCEPTOR',    shortName: 'Lómiël',     tier: 'Interceptor',  size: 1 },
  { name: 'ELENIR-CLASS LANCEWING',       shortName: 'Elenir',     tier: 'Lancewing',    size: 2 },
  { name: 'SENTINEL-Θ AUTONOMOUS UNIT',   shortName: 'Sentinel-Θ', tier: 'Autonomous',   size: 3 },
  { name: 'TALASIR-CLASS TRANSPORT',      shortName: 'Talasir',    tier: 'Transport',    size: 4 },
  { name: 'ERYNDOR-CLASS CORVETTE',       shortName: 'Eryndor',    tier: 'Corvette',     size: 5 },
  { name: 'THALANIS-CLASS PHANTOM',       shortName: 'Thalanis',   tier: 'Frigate',      size: 6 },
  { name: 'THALASRËN-CLASS LIGHT FRIGATE',shortName: 'Thalasrën',  tier: 'Lt Frigate',   size: 7 },
  { name: 'AELINDOR-CLASS FRIGATE',       shortName: 'Aelindor',   tier: 'Frigate',      size: 8 },
  { name: 'VAELISAR-CLASS DESTROYER',     shortName: 'Vaelisar',   tier: 'Destroyer',    size: 9 },
  { name: 'CALARION-CLASS CRUISER',       shortName: 'Calarion',   tier: 'Cruiser',      size: 10 },
  { name: 'SILVARON-CLASS CARRIER',       shortName: 'Silvaron',   tier: 'Carrier',      size: 11 },
  { name: 'TIRION-CLASS BATTLESHIP',      shortName: 'Tirion',     tier: 'Battleship',   size: 12 },
  { name: 'AERANDOR-CLASS SUPERCARRIER',  shortName: 'Aerandor',   tier: 'Supercarrier', size: 13 },
];

const FLEET_STATUSES = ['Stationed', 'In Transit', 'Patrol', 'Combat'];

let fleets = [];
let activeFleetId = null;
let fleetViewMode = 'list'; // 'list' | 'detail' | 'edit'

const FLEET_STORE_KEY = 'sgn_fleets_v1';

async function loadFleets() {
  /* try fleets.json file first (canonical repo source) */
  try {
    const r = await fetch('./fleets.json', { cache: 'no-store' });
    if (r.ok) {
      fleets = await r.json();
      updateFleetStatusBar();
      return;
    }
  } catch {}
  /* fall back to localStorage */
  try {
    const raw = localStorage.getItem(FLEET_STORE_KEY);
    if (raw) { fleets = JSON.parse(raw); updateFleetStatusBar(); return; }
  } catch {}
  fleets = [];
}

function saveFleets() {
  try { localStorage.setItem(FLEET_STORE_KEY, JSON.stringify(fleets)); } catch {}
  updateFleetStatusBar();
}

function updateFleetStatusBar() {
  const el = document.getElementById('sb-fleets-ct');
  if (el) el.textContent = `${fleets.length} FLEET${fleets.length !== 1 ? 'S' : ''}`;
}

function generateFleetId() {
  return 'FLT_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).slice(2,6).toUpperCase();
}

function getTotalShips(fleet) {
  return (fleet.ships || []).reduce((sum, s) => sum + (s.qty || 0), 0);
}

function getFleetSystemName(systemId) {
  if (!systemId) return '—';
  const sys = systems.find(s => s.id === systemId);
  return sys?.name || systemId;
}

function renderFleetsPane(systemId) {
  const pane = document.getElementById('pane-fleets');
  if (!pane) return;

  const systemFleets = fleets.filter(f => f.systemId === systemId);
  const otherFleets = fleets.filter(f => f.systemId !== systemId);

  if (fleetViewMode === 'detail' && activeFleetId) {
    const fleet = fleets.find(f => f.id === activeFleetId);
    if (fleet) {
      renderFleetDetail(pane, fleet);
      return;
    }
  }
  if (fleetViewMode === 'edit') {
    const fleet = activeFleetId ? fleets.find(f => f.id === activeFleetId) : null;
    renderFleetEditor(pane, fleet, systemId);
    return;
  }

  fleetViewMode = 'list';
  activeFleetId = null;

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <span class="bodies-count">${systemFleets.length} FLEET${systemFleets.length!==1?'S':''} AT ${getFleetSystemName(systemId).toUpperCase()}</span>
      <button class="pbtn primary" id="fleet-add-btn" style="padding:4px 10px;">+ NEW FLEET</button>
    </div>
  `;

  if (systemFleets.length > 0) {
    html += systemFleets.map(f => fleetListItemHTML(f)).join('');
  }

  if (otherFleets.length > 0) {
    html += `<div style="margin-top:18px;margin-bottom:10px;" class="fleet-section-title">ALL OTHER FLEETS (${otherFleets.length})</div>`;
    html += otherFleets.map(f => fleetListItemHTML(f)).join('');
  }

  if (systemFleets.length === 0 && otherFleets.length === 0) {
    html += `<div class="empty-state" style="padding-top:16px;">
      <div class="empty-state-icon">⬡</div>
      <div class="empty-state-text">// NO FLEETS REGISTERED<br>// USE + NEW FLEET TO CREATE ONE</div>
    </div>`;
  }

  pane.innerHTML = html;

  pane.querySelector('#fleet-add-btn')?.addEventListener('click', () => {
    activeFleetId = null;
    fleetViewMode = 'edit';
    renderFleetsPane(systemId);
  });

  pane.querySelectorAll('.fleet-list-item').forEach(el => {
    el.addEventListener('click', () => {
      activeFleetId = el.dataset.fleetId;
      fleetViewMode = 'detail';
      renderFleetsPane(systemId);
    });
  });
}

function fleetListItemHTML(f) {
  const total = getTotalShips(f);
  const statusClass = (f.status || 'Stationed').toLowerCase().replace(/\s/g,'-');
  return `<div class="fleet-list-item" data-fleet-id="${f.id}">
    <div class="fleet-emblem">⬡</div>
    <div class="fleet-info">
      <div class="fleet-name">${f.name || 'Unnamed Fleet'}</div>
      <div class="fleet-subtitle">${f.captain || '—'} · <span class="fleet-status-badge ${statusClass}">${f.status || 'Stationed'}</span></div>
    </div>
    <div class="fleet-ship-count">${total}<br><span style="font-size:9px;color:var(--text-muted);">SHIPS</span></div>
  </div>`;
}

function renderFleetDetail(pane, fleet) {
  const total = getTotalShips(fleet);
  const systemName = getFleetSystemName(fleet.systemId);
  const statusClass = (fleet.status || 'Stationed').toLowerCase().replace(/\s/g,'-');
  const destName = fleet.destinationId ? getFleetSystemName(fleet.destinationId) : null;

  let shipsHTML = '';
  if (fleet.ships && fleet.ships.length > 0) {
    shipsHTML = fleet.ships.filter(s => s.qty > 0).map(s => {
      const cls = ELVISH_SHIP_CLASSES.find(c => c.name === s.className) || {};
      return `<div class="ship-line">
        <span class="ship-tier-badge">${cls.tier || '—'}</span>
        <span class="ship-class-name">${s.className}</span>
        <span class="ship-qty">×${s.qty}</span>
      </div>`;
    }).join('');
  } else {
    shipsHTML = '<div style="color:var(--text-muted);font-size:13px;font-style:italic;">No vessels assigned</div>';
  }

  pane.innerHTML = `
    <div style="margin-bottom:10px;">
      <button class="pbtn" id="fleet-back-btn" style="padding:4px 10px;font-size:10px;">← FLEET LIST</button>
    </div>
    <div class="fleet-detail-header">
      <div class="fleet-detail-emblem">⬡</div>
      <div>
        <div class="fleet-detail-title">${fleet.name || 'Unnamed Fleet'}</div>
        <div class="fleet-detail-sub">${fleet.id}</div>
      </div>
    </div>
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="stat-cell">
        <div class="stat-key">Captain</div>
        <div class="stat-val" style="font-size:15px;color:var(--gold);">${fleet.captain || '—'}</div>
      </div>
      <div class="stat-cell">
        <div class="stat-key">Vessels</div>
        <div class="stat-val gold">${total}</div>
        <div class="stat-sub">${(fleet.ships || []).filter(s=>s.qty>0).length} CLASSES</div>
      </div>
      <div class="stat-cell">
        <div class="stat-key">Status</div>
        <div style="margin-top:4px;"><span class="fleet-status-badge ${statusClass}">${fleet.status || 'Stationed'}</span></div>
      </div>
      <div class="stat-cell">
        <div class="stat-key">Location</div>
        <div class="stat-val" style="font-size:14px;"><span class="fleet-location-chip" data-sys="${fleet.systemId || ''}">${systemName}</span></div>
      </div>
    </div>
    ${destName ? `<div class="meta-row"><span class="mk">Destination</span><span class="mv go">${destName}</span></div>` : ''}
    ${fleet.designation ? `<div class="meta-row"><span class="mk">Designation</span><span class="mv">${fleet.designation}</span></div>` : ''}
    <div class="fleet-section" style="margin-top:14px;">
      <div class="fleet-section-title">Ship Manifest</div>
      ${shipsHTML}
    </div>
    <div class="fleet-section">
      <div class="fleet-section-title">Fleet Notes</div>
      <div class="fleet-notes-box">${fleet.notes || ''}</div>
    </div>
    <div class="edit-actions" style="margin-top:10px;">
      <button class="pbtn primary" id="fleet-edit-btn" style="flex:1;padding:8px;">✎ EDIT FLEET</button>
      <button class="pbtn danger" id="fleet-delete-btn" style="padding:8px 12px;">✕ DELETE</button>
    </div>
  `;

  pane.querySelector('#fleet-back-btn').addEventListener('click', () => {
    fleetViewMode = 'list';
    activeFleetId = null;
    renderFleetsPane(selectedId);
  });

  pane.querySelector('#fleet-edit-btn').addEventListener('click', () => {
    fleetViewMode = 'edit';
    renderFleetsPane(selectedId);
  });

  pane.querySelector('#fleet-delete-btn').addEventListener('click', () => {
    if (!confirm(`Delete fleet "${fleet.name}"?`)) return;
    fleets = fleets.filter(f => f.id !== fleet.id);
    saveFleets();
    fleetViewMode = 'list';
    activeFleetId = null;
    renderFleetsPane(selectedId);
  });

  pane.querySelectorAll('.fleet-location-chip').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const sysId = el.dataset.sys;
      if (sysId && sysId !== selectedId) {
        selectedId = sysId;
        ensureSystemDetails(sysId).then(det => renderPanel(sysId, det));
      }
    });
  });
}

function renderFleetEditor(pane, fleet, systemId) {
  const isNew = !fleet;
  const f = fleet || { id: generateFleetId(), name: '', captain: '', status: 'Stationed', systemId: systemId, destinationId: '', designation: '', ships: [], notes: '' };

  const shipClassOptions = ELVISH_SHIP_CLASSES.map(c => `<option value="${c.name}">${c.shortName} — ${c.tier}</option>`).join('');
  const statusOptions = FLEET_STATUSES.map(s => `<option value="${s}" ${f.status===s?'selected':''}>${s}</option>`).join('');
  const systemOptions = systems.map(s => `<option value="${s.id}" ${f.systemId===s.id?'selected':''}>${s.name || s.id}</option>`).join('');
  const destOptions = `<option value="">— None —</option>` + systems.map(s => `<option value="${s.id}" ${f.destinationId===s.id?'selected':''}>${s.name || s.id}</option>`).join('');

  let shipsHTML = '';
  (f.ships || []).forEach((s, i) => {
    shipsHTML += fleetShipEditorRow(s, i, shipClassOptions);
  });

  pane.innerHTML = `
    <div style="margin-bottom:10px;">
      <button class="pbtn" id="fleet-back-btn" style="padding:4px 10px;font-size:10px;">← CANCEL</button>
    </div>
    <div class="fleet-section-title" style="margin-bottom:12px;">${isNew ? 'CREATE NEW FLEET' : 'EDIT FLEET'}</div>
    <div class="edit-section">
      <div class="edit-section-title">Fleet Identity</div>
      <div class="form-row"><span class="fl">Name</span><input id="fe-name" class="sci-input" type="text" value="${(f.name||'').replace(/"/g,'&quot;')}" placeholder="Fleet name..."/></div>
      <div class="form-row"><span class="fl">Captain</span><input id="fe-captain" class="sci-input" type="text" value="${(f.captain||'').replace(/"/g,'&quot;')}" placeholder="Commanding officer..."/></div>
      <div class="form-row"><span class="fl">Designation</span><input id="fe-designation" class="sci-input" type="text" value="${(f.designation||'').replace(/"/g,'&quot;')}" placeholder="e.g. 3rd Expeditionary"/></div>
      <div class="form-row"><span class="fl">Status</span><select id="fe-status" class="sci-select">${statusOptions}</select></div>
      <div class="form-row"><span class="fl">System</span><select id="fe-system" class="sci-select">${systemOptions}</select></div>
      <div class="form-row"><span class="fl">Destination</span><select id="fe-dest" class="sci-select">${destOptions}</select></div>
    </div>
    <div class="edit-section">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="edit-section-title" style="flex:1;border:none;margin:0;padding:0;">Ship Composition</div>
        <button id="fe-add-ship" class="pbtn primary" style="margin-bottom:10px;padding:3px 8px;font-size:10px;">+ ADD CLASS</button>
      </div>
      <div id="fe-ship-list" style="margin-top:6px;">
        ${shipsHTML}
      </div>
    </div>
    <div class="edit-section">
      <div class="edit-section-title">Notes</div>
      <textarea id="fe-notes" class="fleet-textarea" placeholder="Fleet notes, mission briefing, orders...">${f.notes || ''}</textarea>
    </div>
    <div class="edit-actions">
      <button id="fe-save" class="pbtn success" style="flex:1;padding:8px;">✓ ${isNew ? 'CREATE FLEET' : 'SAVE CHANGES'}</button>
      <button id="fe-cancel" class="pbtn danger" style="padding:8px 12px;">✕</button>
    </div>
  `;

  const shipList = pane.querySelector('#fe-ship-list');

  pane.querySelector('#fe-add-ship').addEventListener('click', () => {
    const idx = shipList.querySelectorAll('.fleet-edit-ship-row').length;
    const tmp = document.createElement('div');
    tmp.innerHTML = fleetShipEditorRow({ className: ELVISH_SHIP_CLASSES[0].name, qty: 1 }, idx, shipClassOptions);
    shipList.appendChild(tmp.firstElementChild);
  });

  shipList.addEventListener('click', e => {
    if (e.target?.matches('.del-ship-btn')) {
      e.target.closest('.fleet-edit-ship-row').remove();
    }
  });

  const goBack = () => {
    if (isNew) {
      fleetViewMode = 'list';
      activeFleetId = null;
    } else {
      fleetViewMode = 'detail';
    }
    renderFleetsPane(selectedId);
  };

  pane.querySelector('#fleet-back-btn').addEventListener('click', goBack);
  pane.querySelector('#fe-cancel').addEventListener('click', goBack);

  pane.querySelector('#fe-save').addEventListener('click', () => {
    if (!requireEditor()) return;
    const newFleet = {
      id: f.id,
      name: pane.querySelector('#fe-name').value.trim() || 'Unnamed Fleet',
      captain: pane.querySelector('#fe-captain').value.trim(),
      designation: pane.querySelector('#fe-designation').value.trim(),
      status: pane.querySelector('#fe-status').value,
      systemId: pane.querySelector('#fe-system').value,
      destinationId: pane.querySelector('#fe-dest').value || '',
      notes: pane.querySelector('#fe-notes').value,
      ships: Array.from(shipList.querySelectorAll('.fleet-edit-ship-row')).map(row => ({
        className: row.querySelector('.fe-ship-class').value,
        qty: Math.max(0, parseInt(row.querySelector('.fe-ship-qty').value) || 0)
      })).filter(s => s.qty > 0)
    };

    if (isNew) {
      fleets.push(newFleet);
    } else {
      const idx = fleets.findIndex(fl => fl.id === f.id);
      if (idx >= 0) fleets[idx] = newFleet;
    }
    saveFleets();
    activeFleetId = newFleet.id;
    fleetViewMode = 'detail';
    renderFleetsPane(selectedId);
  });
}

function fleetShipEditorRow(ship, idx, classOptions) {
  const selected = ship.className || ELVISH_SHIP_CLASSES[0].name;
  const opts = ELVISH_SHIP_CLASSES.map(c => `<option value="${c.name}" ${c.name===selected?'selected':''}>${c.shortName} — ${c.tier}</option>`).join('');
  return `<div class="fleet-edit-ship-row">
    <select class="fe-ship-class sci-select" style="font-size:12px;">${opts}</select>
    <input class="fe-ship-qty sci-input" type="number" min="0" value="${ship.qty || 1}" style="text-align:center;"/>
    <button type="button" class="del-ship-btn" title="Remove">✕</button>
  </div>`;
}

/* ── FLEET MAP ICONS ── */

const fleetIconsLayer = document.getElementById('fleet-icons-layer');
let fleetIconElements = new Map();

function updateFleetMapIcons(mvp) {
  if (!fleetIconsLayer) return;

  // Group fleets by system
  const bySystem = new Map();
  for (const f of fleets) {
    if (!f.systemId) continue;
    if (!bySystem.has(f.systemId)) bySystem.set(f.systemId, []);
    bySystem.get(f.systemId).push(f);
  }

  // Track which systems still have fleets
  const activeKeys = new Set();

  for (const [sysId, sysFleets] of bySystem) {
    const pos = idToWorld.get(sysId);
    if (!pos) continue;

    const screen = projectToScreen(pos[0], pos[1], pos[2], mvp);
    if (!screen || screen[2] < -1 || screen[2] > 1) {
      // Off screen
      for (const f of sysFleets) {
        const el = fleetIconElements.get(f.id);
        if (el) el.style.display = 'none';
      }
      continue;
    }

    const sx = screen[0] / (canvas.width / canvas.clientWidth);
    const sy = screen[1] / (canvas.height / canvas.clientHeight);

    const totalFleets = sysFleets.length;
    sysFleets.forEach((f, i) => {
      activeKeys.add(f.id);
      let el = fleetIconElements.get(f.id);
      if (!el) {
        el = createFleetIconElement(f);
        fleetIconsLayer.appendChild(el);
        fleetIconElements.set(f.id, el);
      }

      // Position: offset to the right/left of the star
      const offsetX = 20 + i * 18;
      const offsetY = -6;
      el.style.left = (sx + offsetX) + 'px';
      el.style.top = (sy + offsetY) + 'px';
      el.style.display = 'flex';

      const statusClass = (f.status || 'Stationed').toLowerCase().replace(/\s/g,'-');
      el.className = 'fleet-map-icon' + (statusClass === 'in-transit' ? ' in-transit' : '');

      // Update label
      const labelEl = el.querySelector('.fmi-label');
      if (labelEl) labelEl.textContent = f.name || 'FLT';
      const countEl = el.querySelector('.fmi-count');
      if (countEl) countEl.textContent = getTotalShips(f) + ' ships';
    });
  }

  // Hide removed fleet icons
  for (const [fid, el] of fleetIconElements) {
    if (!activeKeys.has(fid)) {
      el.style.display = 'none';
    }
  }
}

function createFleetIconElement(fleet) {
  const el = document.createElement('div');
  el.className = 'fleet-map-icon';
  el.innerHTML = `
    <div class="fmi-diamond"></div>
    <div class="fmi-label">${fleet.name || 'FLT'}</div>
    <div class="fmi-count">${getTotalShips(fleet)} ships</div>
  `;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (fleet.systemId) {
      selectedId = fleet.systemId;
      activeFleetId = fleet.id;
      fleetViewMode = 'detail';
      ensureSystemDetails(fleet.systemId).then(det => {
        renderPanel(fleet.systemId, det);
        // Switch to fleets tab
        document.querySelector('#sp-tabs .tab[data-tab="fleets"]')?.click();
      });
    }
  });
  return el;
}

/* ══════════════════════════════════════════════════════════════════
   SYSTEM ALERT ICONS (map overlay)
   ══════════════════════════════════════════════════════════════════ */

const ALERT_TAGS = {
  'contested':  { icon: '⚠', cls: 'contested',  label: '!' },
  'caution':    { icon: '⚠', cls: 'caution',    label: '!' },
  'hazard':     { icon: '☢', cls: 'hazard',     label: '!' },
  'secure':     { icon: '✓', cls: 'secure',     label: '✓' },
  'classified': { icon: '◆', cls: 'classified', label: '◆' },
  'blockade':   { icon: '⊘', cls: 'contested',  label: '⊘' },
  'siege':      { icon: '⚔', cls: 'contested',  label: '⚔' },
  'homeworld':  { icon: '★', cls: 'secure',     label: '★' },
  'shipyard':   { icon: '⚓', cls: 'caution',    label: '⚓' },
  'fortress':   { icon: '⛊', cls: 'classified', label: '⛊' },
  'frontier':   { icon: '◇', cls: 'hazard',     label: '◇' },
  'outpost':    { icon: '◎', cls: 'secure',     label: '◎' },
  'capital':    { icon: '⟐', cls: 'caution',    label: '⟐' },
};

const ALERT_TAG_DEFS = [
  { key: 'contested',  label: 'Contested',  icon: '⚠', cls: 'contested',  color: 'var(--red-alert)', rgb: '255,59,59' },
  { key: 'caution',    label: 'Caution',    icon: '⚠', cls: 'caution',    color: 'var(--gold)',      rgb: '245,197,66' },
  { key: 'hazard',     label: 'Hazard',     icon: '☢', cls: 'hazard',     color: 'var(--purple)',    rgb: '179,136,255' },
  { key: 'blockade',   label: 'Blockade',   icon: '⊘', cls: 'contested',  color: 'var(--red-alert)', rgb: '255,59,59' },
  { key: 'siege',      label: 'Siege',      icon: '⚔', cls: 'contested',  color: 'var(--red-alert)', rgb: '255,59,59' },
  { key: 'classified', label: 'Classified', icon: '◆', cls: 'classified', color: 'var(--cyan)',      rgb: '56,232,255' },
  { key: 'secure',     label: 'Secure',     icon: '✓', cls: 'secure',     color: 'var(--green)',     rgb: '92,219,122' },
  { key: 'homeworld',  label: 'Homeworld',  icon: '★', cls: 'secure',     color: 'var(--gold)',      rgb: '245,197,66' },
  { key: 'shipyard',   label: 'Shipyard',   icon: '⚓', cls: 'caution',    color: 'var(--gold)',      rgb: '245,197,66' },
  { key: 'fortress',   label: 'Fortress',   icon: '⛊', cls: 'classified', color: 'var(--cyan)',      rgb: '56,232,255' },
  { key: 'frontier',   label: 'Frontier',   icon: '◇', cls: 'hazard',     color: 'var(--purple)',    rgb: '179,136,255' },
  { key: 'outpost',    label: 'Outpost',    icon: '◎', cls: 'secure',     color: 'var(--green)',     rgb: '92,219,122' },
  { key: 'capital',    label: 'Capital',    icon: '⟐', cls: 'caution',    color: 'var(--gold)',      rgb: '245,197,66' },
];
const ALERT_TAG_KEYS = ALERT_TAG_DEFS.map(a => a.key);

const alertIconsLayer = document.getElementById('alert-icons-layer');
let alertIconElements = new Map();

function updateAlertIcons(mvp) {
  if (!alertIconsLayer) return;

  const activeKeys = new Set();

  for (const sys of systems) {
    const tags = Array.isArray(sys.tags) ? sys.tags : [];
    const alerts = tags.filter(t => ALERT_TAGS[t.toLowerCase()]);
    if (!alerts.length) continue;

    const pos = idToWorld.get(sys.id);
    if (!pos) continue;
    const screen = projectToScreen(pos[0], pos[1], pos[2], mvp);
    if (!screen || screen[2] < -1 || screen[2] > 1) {
      const el = alertIconElements.get(sys.id);
      if (el) el.style.display = 'none';
      continue;
    }

    const sx = screen[0] / (canvas.width / canvas.clientWidth);
    const sy = screen[1] / (canvas.height / canvas.clientHeight);
    const key = sys.id;
    activeKeys.add(key);

    let el = alertIconElements.get(key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'sys-alert';
      alertIconsLayer.appendChild(el);
      alertIconElements.set(key, el);
    }

    /* render alert icons */
    el.innerHTML = alerts.map(t => {
      const a = ALERT_TAGS[t.toLowerCase()];
      if (!a) return '';
      return `<div class="sys-alert-icon ${a.cls}" title="${t}">${a.label}</div>`;
    }).join('');

    /* position above the star */
    el.style.left = sx + 'px';
    el.style.top = (sy - 18) + 'px';
    el.style.display = 'flex';
  }

  /* hide removed alerts */
  for (const [sid, el] of alertIconElements) {
    if (!activeKeys.has(sid)) el.style.display = 'none';
  }
}

// Also export fleets when pressing X in editor mode
const _origKeydown = null;
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'x' && editMode && editorOK) {
    // The existing X handler saves systems.json; we also include fleets
    // We let the original handler fire, and additionally save fleets into the JSON
  }
});

// Override the X export to include fleets
const origXHandler = window.addEventListener;
// Patch into the existing X key export by wrapping initFromData's export
// Actually, let's just modify the existing key handler indirectly.
// The simplest approach: store fleets alongside systems in the export.

// We'll hook into the existing 'x' key by also exporting a fleets.json
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'f' && !editMode && !addMode) {
    // F key toggles fleet tab if panel is open
    if (panel.style.transform === 'translateX(0)' || panel.style.transform === 'translateX(0px)') {
      document.querySelector('#sp-tabs .tab[data-tab="fleets"]')?.click();
    }
  }
});
