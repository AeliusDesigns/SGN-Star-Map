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
precision mediump float;
varying vec3 vColor;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r = length(uv);
  float core  = smoothstep(0.18, 0.0,  r);
  float inner = smoothstep(0.55, 0.10, r) * 0.6;
  float glow  = smoothstep(1.0,  0.0,  r) * 0.25;
  float spike1 = smoothstep(0.04, 0.0, abs(uv.x)) * smoothstep(1.0, 0.1, r) * 0.35;
  float spike2 = smoothstep(0.04, 0.0, abs(uv.y)) * smoothstep(1.0, 0.1, r) * 0.35;
  float alpha = clamp(core + inner + glow + spike1 + spike2, 0.0, 1.0);
  vec3 col = mix(vec3(1.0), vColor, 0.55) * (core * 2.5 + 1.0);
  gl_FragColor = vec4(col, alpha);
}`;
const VS_LINES = `
attribute vec3 position;
uniform mat4 uMVP;
void main(){ gl_Position = uMVP * vec4(position, 1.0); }`;
const FS_LINES = `
precision mediump float;
uniform vec3 uColor;
void main(){ gl_FragColor = vec4(uColor, 1.0); }`;

const progPoints = makeProgram(VS_POINTS, FS_POINTS);
const progLines  = makeProgram(VS_LINES,  FS_LINES);

const aPos_points   = gl.getAttribLocation(progPoints, 'position');
const aColor_points = gl.getAttribLocation(progPoints, 'aColor');
const aSize_points  = gl.getAttribLocation(progPoints, 'aSize');
const uMVP_points   = gl.getUniformLocation(progPoints, 'uMVP');
const aPos_lines    = gl.getAttribLocation(progLines,  'position');
const uMVP_lines    = gl.getUniformLocation(progLines, 'uMVP');
const uColorLines   = gl.getUniformLocation(progLines, 'uColor');

const VS_HALO = `
attribute vec3 position;
uniform mat4 uMVP;
uniform float uPixelSize;
void main(){
  gl_Position = uMVP * vec4(position, 1.0);
  gl_PointSize = uPixelSize;
}`;
const FS_HALO = `
precision mediump float;
uniform float uTime;
uniform vec3 uColGlow;
uniform vec3 uColCore;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r = length(uv);
  float inner = 0.55, outer = 0.85;
  float ring = smoothstep(inner, inner+0.02, r) * (1.0 - smoothstep(outer-0.02, outer, r));
  float ang = atan(uv.y, uv.x);
  float phase = fract((ang / 6.2831853) * 3.0 + uTime * 1.8);
  float scanner = smoothstep(0.05, 0.0, abs(phase - 0.5) - 0.25);
  float glow = exp(-6.0 * (r*r));
  vec3 col = mix(uColGlow, uColCore, 0.35);
  float alpha = clamp(ring * (0.55 + 0.45*scanner) + glow*0.15, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}`;

const progHalo    = makeProgram(VS_HALO, FS_HALO);
const aPos_halo   = gl.getAttribLocation(progHalo, 'position');
const uMVP_halo   = gl.getUniformLocation(progHalo, 'uMVP');
const uPix_halo   = gl.getUniformLocation(progHalo, 'uPixelSize');
const uTime_halo  = gl.getUniformLocation(progHalo, 'uTime');
const uColGlow    = gl.getUniformLocation(progHalo, 'uColGlow');
const uColCore    = gl.getUniformLocation(progHalo, 'uColCore');

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
let mouseX = 0, mouseY = 0;
addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

let hoveredId = null;
let selectedId = null;
let haloVBO = null;
const t0 = performance.now();

let editorOK = sessionStorage.getItem('starmap_editor_ok') === '1';
function requireEditor() {
  if (editorOK) return true;
  const pw = prompt('Enter editor password:');
  if (pw === '1776') {
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
    hudLanes.innerHTML = `LANES &nbsp;<b>${editMode ? 'ON' : 'OFF'}</b>`;
    hudLanes.style.color = editMode ? 'var(--cyan)' : '';
  }
  if (hudAdd) {
    hudAdd.innerHTML   = `ADD &nbsp;<b>${addMode ? 'ON' : 'OFF'}</b>`;
    hudAdd.style.color = addMode ? 'var(--cyan)' : '';
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

(async function boot() {
  try {
    const r = await fetch('./systems.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    initFromData(await r.json());
  } catch {
    initFromData(DEFAULT_DATA);
  }
})();

function initFromData(data) {
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
}

canvas.addEventListener('mouseup', async e => {
  if (e.button !== 0) return;
  if (_clickMoved) return;

  if (!_clickDownId) {
    if (addMode) {
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
      selectedId = newId;
      renderPanel(newId, await ensureSystemDetails(newId));
    }
    return;
  }

  const id = _clickDownId;
  _clickDownId = null;

  if (editMode) {
    if (!window._lanePickA) {
      window._lanePickA = id;
    } else {
      const key = [window._lanePickA, id].sort().join('::');
      if (lanesSet.has(key)) lanesSet.delete(key); else lanesSet.add(key);
      window._lanePickA = null;
      rebuildLinesVBOFromSet();
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
  if (!editMode || e.button !== 1 || !editorOK) return;
  const [mx, my] = mouseToCanvas(e);
  deleteNearestLane(mx, my, buildMVP());
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
  document.querySelectorAll('#sp-tabs .tab').forEach(t => t.classList.toggle('active', t === tab));
  document.querySelectorAll('#sp-body .tab-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${name}`));
});

document.getElementById('sp-close').onclick  = () => hidePanel();
document.getElementById('sp-gen').onclick    = async () => {
  if (!selectedId) return;
  renderPanel(selectedId, await ensureSystemDetails(selectedId, true));
};
document.getElementById('sp-exp').onclick    = () => { if (selectedId) exportSystemDetails(selectedId); };
document.getElementById('sp-orrery').onclick = () => { if (selectedId) openOrrery(selectedId); };

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
  if (nn && nn.trim()) sys.name = nn.trim();
});

window.addEventListener('keydown', async e => {
  const k = e.key.toLowerCase();
  if (k === 'e') {
    if (!requireEditor()) return;
    editMode = !editMode;
    if (editMode) addMode = false;
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
  if (!editMode || !editorOK) return;
  if (k === 'c') {
    lanesSet.clear();
    rebuildLinesVBOFromSet();
  }
  if (k === 'r') {
    lanesSet.clear();
    (DEFAULT_DATA.lanes || []).forEach(([a,b]) => lanesSet.add([a,b].sort().join('::')));
    rebuildLinesVBOFromSet();
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
const YEAR_SECS = 80;

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
function hidePanel()  { panel.style.transform = 'translateX(100%)'; }

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
  rebuildStarsVBO();
  showPanel();
}

function renderEditPane(id, details, sys) {
  if (!sys) sys = systems.find(s => s.id === id);
  const star    = details?.star || {};
  const planets = details?.planets || [];
  const starKinds = ['Main Sequence','K-Dwarf','G-Dwarf','F-Dwarf','M-Dwarf','Subgiant','Giant','Neutron','Black Hole'];
  const options = starKinds.map(k => `<option value="${k}" ${star.kind===k?'selected':''}>${k}</option>`).join('');

  const pedit = document.getElementById('pane-edit');
  pedit.innerHTML = `
    <form id="sys-edit">
      <div class="edit-section">
        <div class="edit-section-title">System Identity</div>
        <div class="form-row"><span class="fl">ID</span><span style="font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--cyan-dim);letter-spacing:1px;">${id}</span></div>
        <div class="form-row">
          <label class="fl" for="sysName">Name</label>
          <input id="sysName" class="sci-input" type="text" value="${(sys?.name||'').replaceAll('"','&quot;')}"/>
        </div>
        <div class="form-row">
          <label class="fl" for="starKind">Star Class</label>
          <select id="starKind" class="sci-select">${options}</select>
        </div>
      </div>
      <div class="edit-section">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div class="edit-section-title" style="flex:1;border:none;margin:0;padding:0;">Orbital Bodies</div>
          <button id="addPlanet" type="button" class="pbtn primary" style="margin-bottom:10px;">+ ADD BODY</button>
        </div>
        <div id="planetList" style="margin-top:8px;">
          ${planets.map((p,i) => planetEditorRow(p,i)).join('')}
        </div>
      </div>
      <div class="edit-actions">
        <button id="saveEdit"   type="submit" class="pbtn success" style="flex:1;padding:8px;">&#10003; SAVE CHANGES</button>
        <button id="cancelEdit" type="button" class="pbtn danger"  style="padding:8px 12px;">✕</button>
      </div>
    </form>
  `;

  const form   = pedit.querySelector('#sys-edit');
  const btnAdd = pedit.querySelector('#addPlanet');
  const listEl = pedit.querySelector('#planetList');

  btnAdd.onclick = () => {
    const idx = listEl.querySelectorAll('.planetRow').length;
    const tmp = document.createElement('div');
    tmp.innerHTML = planetEditorRow({name:`P${idx+1}`,type:'Rocky',semi_major_AU:1.0,notes:''}, idx);
    listEl.appendChild(tmp.firstElementChild);
  };

  listEl.addEventListener('click', e => {
    if (e.target?.matches('.delPlanet')) {
      e.target.closest('.planetRow').remove();
      listEl.querySelectorAll('.planetRow .p-idx').forEach((el,i) => { el.textContent = `BODY ${i+1}`; });
    }
  });

  form.onsubmit = ev => {
    ev.preventDefault();
    if (!requireEditor()) return;
    const newName    = pedit.querySelector('#sysName').value.trim();
    const newKind    = pedit.querySelector('#starKind').value;
    const newPlanets = Array.from(listEl.querySelectorAll('.planetRow')).map(row => ({
      name:          row.querySelector('.pName').value.trim() || 'Body',
      type:          row.querySelector('.pType').value,
      semi_major_AU: +parseFloat(row.querySelector('.pSMA').value).toFixed(2) || null,
      notes:         row.querySelector('.pNotes').value.trim()
    }));
    const updated = { ...(getCachedSystem(id)||{version:SYSGEN_VERSION,system_id:id,seeded:true}), star:{kind:newKind}, planets:newPlanets };
    setCachedSystem(id, updated);
    if (newName) { const s=systems.find(s=>s.id===id); if(s) s.name=newName; }
    renderPanel(id, updated);
    document.querySelector('#sp-tabs .tab[data-tab="overview"]').click();
  };

  pedit.querySelector('#cancelEdit').onclick = () => {
    document.querySelector('#sp-tabs .tab[data-tab="overview"]').click();
  };
}

function planetEditorRow(p, i) {
  const opt = (v, sel) => `<option value="${v}" ${sel===v?'selected':''}>${v}</option>`;
  const pm  = getPlanetMeta(p.type);
  return `
  <div class="planetRow planet-row">
    <div class="planet-row-head">
      <span class="p-idx pIndex" style="display:flex;align-items:center;gap:6px;">
        <span style="color:${pm.color};font-size:14px;">${pm.icon}</span>BODY ${i+1}
      </span>
      <button type="button" class="delPlanet pbtn danger" style="padding:3px 8px;">REMOVE</button>
    </div>
    <div class="planet-row-body">
      <div class="form-row"><span class="fl">Name</span><input class="pName sci-input" type="text" value="${(p.name||'').replaceAll('"','&quot;')}"/></div>
      <div class="form-row"><span class="fl">Type</span><select class="pType sci-select">
        ${opt('Rocky',p.type)}${opt('Ice',p.type)}${opt('Gas',p.type)}${opt('Ocean',p.type)}
        ${opt('Desert',p.type)}${opt('Shield World',p.type)}${opt('Ecumenopolis',p.type)}
        ${opt('Installation',p.type)}${opt('Habitat',p.type)}
      </select></div>
      <div class="form-row"><span class="fl">Orbit (AU)</span><input class="pSMA sci-input" type="number" step="0.01" min="0.01" value="${p.semi_major_AU ?? 1}"/></div>
      <div class="form-row"><span class="fl">Notes</span><input class="pNotes sci-input" type="text" value="${(p.notes||'').replaceAll('"','&quot;')}"/></div>
    </div>
  </div>`;
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
  gl.clearColor(0.020, 0.031, 0.063, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const mvp = buildMVP();

  if (linesVBO && lineVertCount > 0) {
    gl.useProgram(progLines);
    gl.uniformMatrix4fv(uMVP_lines, false, mvp);
    gl.uniform3f(uColorLines, 0.15, 0.65, 0.78);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, linesVBO);
    gl.enableVertexAttribArray(aPos_lines);
    gl.vertexAttribPointer(aPos_lines, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, lineVertCount);
  }

  if (starsVBO && starCount > 0) {
    gl.useProgram(progPoints);
    gl.uniformMatrix4fv(uMVP_points, false, mvp);
    gl.bindBuffer(gl.ARRAY_BUFFER, starsVBO);
    const stride = 7 * 4;
    gl.enableVertexAttribArray(aPos_points);
    gl.vertexAttribPointer(aPos_points,   3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aColor_points);
    gl.vertexAttribPointer(aColor_points, 3, gl.FLOAT, false, stride, 3 * 4);
    gl.enableVertexAttribArray(aSize_points);
    gl.vertexAttribPointer(aSize_points,  1, gl.FLOAT, false, stride, 6 * 4);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, starCount);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disableVertexAttribArray(aColor_points);
    gl.disableVertexAttribArray(aSize_points);
  }

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
    if (hoveredNow) {
      const sys = systems.find(s => s.id === hoveredNow);
      if (tipName)  tipName.textContent  = sys.name || sys.id;
      if (tipId)    tipId.textContent    = sys.id;
      if (tipOwner) tipOwner.textContent = sys.owner ? `◈ ${sys.owner}` : '';
      tip.style.left    = mouseX + 'px';
      tip.style.top     = mouseY + 'px';
      tip.style.display = 'block';
    } else {
      tip.style.display = 'none';
    }
  }

  if (!haloVBO) haloVBO = gl.createBuffer();
  function drawHalo(id, pix, t, glow, core) {
    const p = idToWorld.get(id); if (!p) return;
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

  const t = (performance.now() - t0) * 0.001;
  if (hoveredNow) drawHalo(hoveredNow, 34.0, t,        [0.35,0.95,1.0], [1.0,0.95,0.50]);
  if (selectedId) drawHalo(selectedId, 42.0, t*0.0007, [1.0,0.85,0.35], [1.0,0.98,0.70]);

  requestAnimationFrame(loop);
}
