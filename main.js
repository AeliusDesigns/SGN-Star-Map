// === Vanilla WebGL star map with LANES + Hover Highlight + Rename ===
const canvas = document.getElementById('gl');
let gl = canvas.getContext('webgl2', { antialias: true });
if (!gl) gl = canvas.getContext('webgl', { antialias: true });
if (!gl) alert('WebGL not supported');

// Resize
function resize() {
  const dpr = 1; // keep lightweight & consistent
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

// --- uniforms/attribs ---
const aPos_points = gl.getAttribLocation(progPoints, 'position');
const uMVP_points = gl.getUniformLocation(progPoints, 'uMVP');
const uSize       = gl.getUniformLocation(progPoints, 'uPointSize');
const uColorPts   = gl.getUniformLocation(progPoints, 'uColor');

const aPos_lines  = gl.getAttribLocation(progLines, 'position');
const uMVP_lines  = gl.getUniformLocation(progLines,  'uMVP');
const uColorLines = gl.getUniformLocation(progLines,  'uColor');

// --- NEW: HALO shader (animated ring around hovered star) ---
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
  // Point sprite coords [-1..+1]
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r = length(uv);

  // Donut ring band
  float inner = 0.55;
  float outer = 0.85;
  float ring = smoothstep(inner, inner+0.02, r) * (1.0 - smoothstep(outer-0.02, outer, r));

  // Rotating "scanner" arc around the ring
  float ang = atan(uv.y, uv.x); // [-pi, +pi]
  float turns = 3.0;            // number of bright arcs
  float speed = 1.8;            // rotation speed
  float phase = fract((ang / 6.2831853) * turns + uTime * speed);
  float scanner = smoothstep(0.05, 0.0, abs(phase - 0.5) - 0.25);

  // Soft glow falloff
  float glow = exp(-6.0 * (r*r));

  // Combine
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
  else dragging = true;                 // left button  -> orbit
});
addEventListener('mouseup', () => { dragging = false; panning = false; });
addEventListener('mousemove', e => {
  const dx = e.clientX - lx, dy = e.clientY - ly;
  lx = e.clientX; ly = e.clientY;
  if (dragging) {
    yaw   += dx * 0.005;
    pitch += dy * 0.005;
    pitch = Math.max(-1.55, Math.min(1.55, pitch));
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

let hoveredId = null;       // currently hovered system id
let haloVBO = null;         // single-vertex buffer for halo
let t0 = performance.now(); // time base for animation

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

// Load JSON and boot
fetch(jsonURL).then(r => r.json()).then(data => {
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

  // build star positions (z = 0 unless your JSON already has it)
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
    const z = (sys.coords && typeof sys.coords.z === 'number') ? sys.coords.z : 0.0; // keep flat unless provided
    idToWorld.set(sys.id, [x, y, z]);
  }
  rebuildStarsVBO();

  // lanes
  const lanes = data.lanes || [];
  lanesSet = new Set(lanes.map(([a,b]) => [a,b].sort().join('::')));
  rebuildLinesVBOFromSet();

  // lane editor
  let editMode = false;
  let pickA = null;

  canvas.addEventListener('click', (e) => {
    if (!editMode) return;
    const proj = mat4Perspective(55 * Math.PI / 180, canvas.width / canvas.height, 0.1, 50000);
    const rot  = mat4Mul(mat4RotateY(yaw), mat4RotateX(pitch));
    const view = mat4Translate(-panX, -panY, -dist);
    const mvp  = mat4Mul(rot, mat4Mul(view, proj));

    const bestId = findNearestSystemId(e.clientX, e.clientY, mvp, 18);
    if (!bestId) return;
    if (!pickA) {
      pickA = bestId;
    } else {
      const key = [pickA, bestId].sort().join('::');
      if (lanesSet.has(key)) lanesSet.delete(key); else lanesSet.add(key);
      pickA = null;
      rebuildLinesVBOFromSet();
    }
  });

  // Middle-click: delete nearest lane (in edit mode)
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
    if (!editMode || e.button !== 1) return;  // middle mouse
    const proj = mat4Perspective(55 * Math.PI / 180, canvas.width / canvas.height, 0.1, 50000);
    const rot  = mat4Mul(mat4RotateY(yaw), mat4RotateX(pitch));
    const view = mat4Translate(-panX, -panY, -dist);
    const mvp  = mat4Mul(rot, mat4Mul(view, proj));
    const [mx,my] = mouseToCanvas(e);
    deleteNearestLane(mx, my, mvp);
  });

  // Double-click to rename
  canvas.addEventListener('dblclick', (e)=>{
    const proj = mat4Perspective(55 * Math.PI / 180, canvas.width / canvas.height, 0.1, 50000);
    const rot  = mat4Mul(mat4RotateY(yaw), mat4RotateX(pitch));
    const view = mat4Translate(-panX, -panY, -dist);
    const mvp  = mat4Mul(rot, mat4Mul(view, proj));
    const id = findNearestSystemId(e.clientX, e.clientY, mvp, 18);
    if (!id) return;
    const sys = systems.find(s => s.id === id);
    const curr = sys?.name || id;
    const nn = prompt('Rename system:', curr);
    if (nn && nn.trim()){
      sys.name = nn.trim();
      console.log(`Renamed ${id} -> ${sys.name}`);
    }
  });

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'e') {
      editMode = !editMode;
      console.log(`Edit Mode: ${editMode ? 'ON' : 'OFF'}`);
    }
    if (!editMode) return;

    if (k === 'c') { // clear all lanes
      lanesSet.clear();
      rebuildLinesVBOFromSet();
      console.log('Cleared all lanes.');
    }
    if (k === 'r') { // restore original JSON lanes
      lanesSet = new Set((data.lanes || []).map(([a,b]) => [a,b].sort().join('::')));
      rebuildLinesVBOFromSet();
      console.log('Restored lanes from JSON.');
    }
    if (k === 'x') { // export (keeps names; z if present already)
      const lanesOut = Array.from(lanesSet).map(s => s.split('::'));
      const out = {
        image_size: data.image_size,
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

  // Single-vertex buffer for halo
  haloVBO = gl.createBuffer();

  // Start render
  requestAnimationFrame(loop);
});

// --- render loop ---
function loop() {
  const t = (performance.now() - t0) * 0.001; // seconds
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

  // Determine hovered system (within 18px)
  hoveredId = null;
  if (systems.length){
    hoveredId = findNearestSystemId(mouseX, mouseY, mvp, 18);
    if (hoveredId){
      const sys = systems.find(s => s.id === hoveredId);
      tip.innerHTML = `<strong>${sys.name || sys.id}</strong><br/><small>${sys.id}</small>`;
      tip.style.left = (mouseX + 12) + 'px';
      tip.style.top  = (mouseY + 12) + 'px';
      tip.style.display = 'block';
    } else {
      tip.style.display = 'none';
    }
  }

  // Draw animated HALO on hovered star
  if (hoveredId && haloVBO){
    const p = idToWorld.get(hoveredId);
    if (p){
      gl.useProgram(progHalo);
      gl.uniformMatrix4fv(uMVP_halo, false, mvp);
      gl.uniform1f(uPix_halo, 34.0);         // halo pixel size
      gl.uniform1f(uTime_halo, t);
      gl.uniform3f(uColGlow, 0.35, 0.95, 1.0); // neon cyan glow
      gl.uniform3f(uColCore, 1.0, 0.95, 0.50); // warm core tint

      gl.bindBuffer(gl.ARRAY_BUFFER, haloVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(aPos_halo);
      gl.vertexAttribPointer(aPos_halo, 3, gl.FLOAT, false, 0, 0);

      // Additive-ish blending for nice glow
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

      gl.drawArrays(gl.POINTS, 0, 1);

      // Restore default alpha blending for other passes (optional)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  requestAnimationFrame(loop);
}
