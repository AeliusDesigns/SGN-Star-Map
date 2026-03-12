// ============================================================
//  SGN — Stellar Gate Network  |  Star Map  |  main.js
//  Ground-up rewrite. No type=module. Click uses hoveredId
//  written by the render loop — zero separate hit-testing.
// ============================================================

// ── WebGL context ────────────────────────────────────────────
var canvas = document.getElementById('gl');
var gl = canvas.getContext('webgl2', { antialias: true })
      || canvas.getContext('webgl',  { antialias: true });
if (!gl) { alert('WebGL not supported'); throw new Error('no webgl'); }

console.log('[SGN] boot');

// ── Canvas resize (DPR=1 keeps picking simple) ───────────────
function resize() {
  canvas.width  = innerWidth;
  canvas.height = innerHeight;
  canvas.style.width  = innerWidth  + 'px';
  canvas.style.height = innerHeight + 'px';
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

// ── Matrix helpers ───────────────────────────────────────────
function mat4Mul(a, b) {
  var o = new Float32Array(16);
  for (var r = 0; r < 4; r++)
    for (var c = 0; c < 4; c++)
      o[r*4+c] = a[r*4+0]*b[c] + a[r*4+1]*b[4+c] + a[r*4+2]*b[8+c] + a[r*4+3]*b[12+c];
  return o;
}
function mat4Perspective(fovy, aspect, near, far) {
  var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
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
  var c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
}
function mat4RotateX(a) {
  var c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);
}
function mat4Invert(m) {
  var a=m, o=new Float32Array(16);
  var a00=a[0],a01=a[1],a02=a[2],a03=a[3],
      a10=a[4],a11=a[5],a12=a[6],a13=a[7],
      a20=a[8],a21=a[9],a22=a[10],a23=a[11],
      a30=a[12],a31=a[13],a32=a[14],a33=a[15];
  var b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10,
      b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12,
      b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30,
      b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
  var det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
  if (!det) return null;
  det=1/det;
  o[0]=(a11*b11-a12*b10+a13*b09)*det; o[1]=(-a01*b11+a02*b10-a03*b09)*det;
  o[2]=(a31*b05-a32*b04+a33*b03)*det; o[3]=(-a21*b05+a22*b04-a23*b03)*det;
  o[4]=(-a10*b11+a12*b08-a13*b07)*det; o[5]=(a00*b11-a02*b08+a03*b07)*det;
  o[6]=(-a30*b05+a32*b02-a33*b01)*det; o[7]=(a20*b05-a22*b02+a23*b01)*det;
  o[8]=(a10*b10-a11*b08+a13*b06)*det; o[9]=(-a00*b10+a01*b08-a03*b06)*det;
  o[10]=(a30*b04-a31*b02+a33*b00)*det; o[11]=(-a20*b04+a21*b02-a23*b00)*det;
  o[12]=(-a10*b09+a11*b07-a12*b06)*det; o[13]=(a00*b09-a01*b07+a02*b06)*det;
  o[14]=(-a30*b03+a31*b01-a32*b00)*det; o[15]=(a20*b03-a21*b01+a22*b00)*det;
  return o;
}
function vec4MulMat(m, v) {
  var x=v[0],y=v[1],z=v[2],w=v[3];
  return new Float32Array([
    m[0]*x+m[4]*y+m[8]*z+m[12]*w,
    m[1]*x+m[5]*y+m[9]*z+m[13]*w,
    m[2]*x+m[6]*y+m[10]*z+m[14]*w,
    m[3]*x+m[7]*y+m[11]*z+m[15]*w
  ]);
}

// ── Shader helpers ────────────────────────────────────────────
function compileShader(type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error('Shader error: ' + gl.getShaderInfoLog(s));
  return s;
}
function makeProgram(vsSrc, fsSrc) {
  var p = gl.createProgram();
  gl.attachShader(p, compileShader(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compileShader(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error('Program error: ' + gl.getProgramInfoLog(p));
  return p;
}

// ── Programs ──────────────────────────────────────────────────
var progPoints = makeProgram(
  'attribute vec3 position;uniform mat4 uMVP;uniform float uPointSize;void main(){gl_Position=uMVP*vec4(position,1.0);gl_PointSize=uPointSize;}',
  'precision mediump float;uniform vec3 uColor;void main(){vec2 uv=gl_PointCoord*2.0-1.0;float d=dot(uv,uv);float a=smoothstep(1.0,0.8,1.0-d);gl_FragColor=vec4(uColor,a);}'
);
var progLines = makeProgram(
  'attribute vec3 position;uniform mat4 uMVP;void main(){gl_Position=uMVP*vec4(position,1.0);}',
  'precision mediump float;uniform vec3 uColor;void main(){gl_FragColor=vec4(uColor,1.0);}'
);
var progHalo = makeProgram(
  'attribute vec3 position;uniform mat4 uMVP;uniform float uPixelSize;void main(){gl_Position=uMVP*vec4(position,1.0);gl_PointSize=uPixelSize;}',
  'precision mediump float;uniform float uTime;uniform vec3 uColGlow;uniform vec3 uColCore;void main(){vec2 uv=gl_PointCoord*2.0-1.0;float r=length(uv);float inner=0.55,outer=0.85;float ring=smoothstep(inner,inner+0.02,r)*(1.0-smoothstep(outer-0.02,outer,r));float ang=atan(uv.y,uv.x);float phase=fract((ang/6.2831853)*3.0+uTime*1.8);float scanner=smoothstep(0.05,0.0,abs(phase-0.5)-0.25);float glow=exp(-6.0*(r*r));vec3 col=mix(uColGlow,uColCore,0.35);float alpha=clamp(ring*(0.55+0.45*scanner)+glow*0.15,0.0,1.0);gl_FragColor=vec4(col,alpha);}'
);

// Attrib/uniform locations
var aPos_pts  = gl.getAttribLocation(progPoints, 'position');
var uMVP_pts  = gl.getUniformLocation(progPoints, 'uMVP');
var uSize_pts = gl.getUniformLocation(progPoints, 'uPointSize');
var uCol_pts  = gl.getUniformLocation(progPoints, 'uColor');

var aPos_lin  = gl.getAttribLocation(progLines, 'position');
var uMVP_lin  = gl.getUniformLocation(progLines, 'uMVP');
var uCol_lin  = gl.getUniformLocation(progLines, 'uColor');

var aPos_halo   = gl.getAttribLocation(progHalo, 'position');
var uMVP_halo   = gl.getUniformLocation(progHalo, 'uMVP');
var uPix_halo   = gl.getUniformLocation(progHalo, 'uPixelSize');
var uTime_halo  = gl.getUniformLocation(progHalo, 'uTime');
var uColGlow    = gl.getUniformLocation(progHalo, 'uColGlow');
var uColCore    = gl.getUniformLocation(progHalo, 'uColCore');

// ── Camera state ──────────────────────────────────────────────
var yaw   = 0, pitch = 0, dist  = 1800;
var panX  = 0, panY  = 0;
var t0    = performance.now();

// ── Mouse state ───────────────────────────────────────────────
var mouseX = 0, mouseY = 0;
var dragging = false, panning = false;
var dragMoved = false, lx = 0, ly = 0;

window.addEventListener('mousemove', function(e) {
  mouseX = e.clientX; mouseY = e.clientY;
  var dx = e.clientX - lx, dy = e.clientY - ly;
  lx = e.clientX; ly = e.clientY;
  if (dragging) {
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragMoved = true;
    if (!addMode && dragMoved) {
      yaw   += dx * 0.005;
      pitch  = Math.max(-1.55, Math.min(1.55, pitch + dy * 0.005));
    }
  } else if (panning) {
    var s = dist / 1000;
    panX -= dx * s;
    panY += dy * s;
  }
});

canvas.addEventListener('mousedown', function(e) {
  lx = e.clientX; ly = e.clientY;
  dragMoved = false;
  if (e.button === 2) panning  = true;
  else                dragging = true;
});

canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });

window.addEventListener('mouseup', function() { dragging = false; panning = false; });

window.addEventListener('wheel', function(e) {
  dist = Math.max(300, Math.min(6000, dist * (1 + Math.sign(e.deltaY) * 0.12)));
});

// ── Data ──────────────────────────────────────────────────────
var systems   = [];
var lanesSet  = new Set();
var idToWorld = new Map();
var imgW = 1090, imgH = 1494, worldW = 2200, worldH = 2200*(1090/1494);

var starsVBO = null, starCount = 0;
var linesVBO = null, lineVertCount = 0;
var haloVBO  = null;

// ── Selection state ───────────────────────────────────────────
// hoveredId is written EVERY FRAME by the render loop.
// Click just reads it — no separate picking math ever.
var hoveredId  = null;
var selectedId = null;

// ── Modes ─────────────────────────────────────────────────────
var editMode = false;
var addMode  = false;
var editorOK = sessionStorage.getItem('sgn_editor') === '1';
var lanePickA = null;

function requireEditor() {
  if (editorOK) return true;
  var pw = prompt('Editor password:');
  if (pw === '1776') { editorOK = true; sessionStorage.setItem('sgn_editor','1'); updateHUD(); return true; }
  alert('Incorrect.'); return false;
}

function updateHUD() {
  var el = document.getElementById('hud-lanes');
  var ea = document.getElementById('hud-add');
  if (el) { el.innerHTML = 'LANES &nbsp;<b>' + (editMode ? 'ON' : 'OFF') + '</b>'; el.style.color = editMode ? 'var(--cyan)' : ''; }
  if (ea) { ea.innerHTML = 'ADD &nbsp;<b>'   + (addMode  ? 'ON' : 'OFF') + '</b>'; ea.style.color = addMode  ? 'var(--cyan)' : ''; }
}

// ── Project 3-D world point → canvas pixel coords ────────────
function projectToScreen(x, y, z, mvp) {
  var cx = x*mvp[0]+y*mvp[4]+z*mvp[8]+mvp[12];
  var cy = x*mvp[1]+y*mvp[5]+z*mvp[9]+mvp[13];
  var cw = x*mvp[3]+y*mvp[7]+z*mvp[11]+mvp[15];
  if (Math.abs(cw) < 1e-6) return null;
  var ndcX = cx/cw, ndcY = cy/cw;
  return [
    (ndcX * 0.5 + 0.5) * canvas.width,
    (-ndcY * 0.5 + 0.5) * canvas.height
  ];
}

// Unproject screen → world on Z=0 plane (for addMode placement)
function screenToWorldZ0(clientX, clientY, mvp) {
  var inv = mat4Invert(mvp);
  if (!inv) return null;
  var nx =  (clientX / canvas.clientWidth)  * 2 - 1;
  var ny = -((clientY / canvas.clientHeight) * 2 - 1);
  var p0 = vec4MulMat(inv, new Float32Array([nx,ny,-1,1]));
  var p1 = vec4MulMat(inv, new Float32Array([nx,ny, 1,1]));
  p0[0]/=p0[3]; p0[1]/=p0[3]; p0[2]/=p0[3];
  p1[0]/=p1[3]; p1[1]/=p1[3]; p1[2]/=p1[3];
  var dz = p1[2]-p0[2];
  if (Math.abs(dz) < 1e-6) return null;
  var t = -p0[2]/dz;
  return [p0[0]+t*(p1[0]-p0[0]), p0[1]+t*(p1[1]-p0[1])];
}

// ── Click handler ─────────────────────────────────────────────
// Simple and reliable: if hoveredId is set at mouseup we have a click.
canvas.addEventListener('click', function(e) {
  if (dragMoved) return;   // was a drag, not a click

  if (addMode && !hoveredId) {
    // Place a new system at clicked world position
    var mvp = getMVP();
    var world = screenToWorldZ0(e.clientX, e.clientY, mvp);
    if (!world) return;
    var wx = world[0], wy = world[1];
    var xn = Math.max(0, Math.min(1, wx/worldW + 0.5));
    var yn = Math.max(0, Math.min(1, 0.5 - wy/worldH));
    var n = systems.length + 1;
    while (systems.some(function(s){ return s.id === 'SYS_'+n; })) n++;
    var newId = 'SYS_' + n;
    var defName = prompt('Name for new system:', 'New System ' + n) || ('New System ' + n);
    var sys = { id: newId, name: defName, coords: { x_norm: xn, y_norm: yn, z: 0 }, tags: ['installation'] };
    systems.push(sys);
    idToWorld.set(newId, [wx, wy, 0]);
    rebuildStarsVBO();
    selectSystem(newId);
    return;
  }

  if (!hoveredId) return;   // clicked empty space
  var id = hoveredId;

  if (editMode) {
    // Lane toggle
    if (!lanePickA) {
      lanePickA = id;
      console.log('[SGN] lane pick A:', id);
    } else {
      var key = [lanePickA, id].sort().join('::');
      if (lanesSet.has(key)) lanesSet.delete(key); else lanesSet.add(key);
      lanePickA = null;
      rebuildLinesVBO();
    }
    return;
  }

  // Normal click — select and open panel
  selectSystem(id);
});

function selectSystem(id) {
  selectedId = id;
  ensureDetails(id).then(function(det) {
    renderPanel(id, det);
  });
}

// ── Build MVP from current camera state ───────────────────────
function getMVP() {
  var proj = mat4Perspective(55 * Math.PI / 180, canvas.width / canvas.height, 0.1, 50000);
  var rot  = mat4Mul(mat4RotateY(yaw), mat4RotateX(pitch));
  var view = mat4Translate(-panX, -panY, -dist);
  return mat4Mul(rot, mat4Mul(view, proj));
}

// ── Render loop ───────────────────────────────────────────────
function loop() {
  gl.clearColor(0.020, 0.031, 0.063, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var mvp = getMVP();

  // Lanes
  if (linesVBO && lineVertCount > 0) {
    gl.useProgram(progLines);
    gl.uniformMatrix4fv(uMVP_lin, false, mvp);
    gl.uniform3f(uCol_lin, 0.15, 0.65, 0.78);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, linesVBO);
    gl.enableVertexAttribArray(aPos_lin);
    gl.vertexAttribPointer(aPos_lin, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, lineVertCount);
  }

  // Stars
  if (starsVBO && starCount > 0) {
    gl.useProgram(progPoints);
    gl.uniformMatrix4fv(uMVP_pts, false, mvp);
    gl.uniform1f(uSize_pts, 7.0);
    gl.uniform3f(uCol_pts, 0.78, 0.90, 1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, starsVBO);
    gl.enableVertexAttribArray(aPos_pts);
    gl.vertexAttribPointer(aPos_pts, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, starCount);
  }

  // ── Hover detection (runs every frame, writes hoveredId) ────
  // mouseX/mouseY are in CSS pixels == canvas pixels (DPR=1)
  var newHover = null;
  if (systems.length) {
    var PICK_R2 = 28 * 28;  // 28-pixel hit radius
    var best = Infinity;
    for (var i = 0; i < systems.length; i++) {
      var sys = systems[i];
      var wp = idToWorld.get(sys.id);
      if (!wp) continue;
      var sp = projectToScreen(wp[0], wp[1], wp[2], mvp);
      if (!sp) continue;
      var dx = sp[0] - mouseX, dy = sp[1] - mouseY;
      var d2 = dx*dx + dy*dy;
      if (d2 < PICK_R2 && d2 < best) { best = d2; newHover = sys.id; }
    }
  }
  hoveredId = newHover;

  // Tooltip
  var tip = document.getElementById('tooltip');
  if (hoveredId) {
    var hs = systems.find(function(s){ return s.id === hoveredId; });
    if (hs) {
      document.getElementById('tip-name').textContent  = hs.name || hs.id;
      document.getElementById('tip-id').textContent    = hs.id;
      document.getElementById('tip-owner').textContent = hs.owner ? ('\u25C8 ' + hs.owner) : '';
      tip.style.left    = mouseX + 'px';
      tip.style.top     = mouseY + 'px';
      tip.style.display = 'block';
    }
  } else {
    tip.style.display = 'none';
  }

  // Halos
  if (!haloVBO) haloVBO = gl.createBuffer();
  var now = (performance.now() - t0) * 0.001;
  if (hoveredId)  drawHalo(hoveredId,  34, now,          [0.35,0.95,1.0], [1.0,0.95,0.50], mvp);
  if (selectedId) drawHalo(selectedId, 42, now * 0.7,    [1.0,0.85,0.35], [1.0,0.98,0.70], mvp);

  requestAnimationFrame(loop);
}

function drawHalo(id, pix, t, glow, core, mvp) {
  var p = idToWorld.get(id); if (!p) return;
  gl.useProgram(progHalo);
  gl.uniformMatrix4fv(uMVP_halo, false, mvp);
  gl.uniform1f(uPix_halo,  pix);
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

// ── VBO builders ──────────────────────────────────────────────
function rebuildStarsVBO() {
  var verts = [];
  systems.forEach(function(s) {
    var p = idToWorld.get(s.id);
    if (p) verts.push(p[0], p[1], p[2]);
  });
  starCount = verts.length / 3;
  if (!starsVBO) starsVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starsVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

function rebuildLinesVBO() {
  var verts = [];
  lanesSet.forEach(function(key) {
    var ab = key.split('::');
    var pa = idToWorld.get(ab[0]), pb = idToWorld.get(ab[1]);
    if (pa && pb) verts.push(pa[0],pa[1],pa[2], pb[0],pb[1],pb[2]);
  });
  lineVertCount = verts.length / 3;
  if (!linesVBO) linesVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, linesVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

// ── Boot / data loading ───────────────────────────────────────
var DEFAULT_DATA = {
  image_size: { width: 1090, height: 1494 },
  systems: [
    { id:'SYS_1', name:'Vanyamar', coords:{ x_norm:0.52, y_norm:0.41, z:0 } },
    { id:'SYS_2', name:'Calithen', coords:{ x_norm:0.31, y_norm:0.64, z:0 } },
    { id:'SYS_3', name:'Elendir',  coords:{ x_norm:0.75, y_norm:0.22, z:0 } }
  ],
  lanes: [['SYS_1','SYS_2'],['SYS_1','SYS_3']]
};

requestAnimationFrame(loop);

fetch('./systems.json', { cache: 'no-store' })
  .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(function(d) { initFromData(d); })
  .catch(function(err) { console.warn('[SGN] using fallback data:', err); initFromData(DEFAULT_DATA); });

function initFromData(data) {
  imgW = (data.image_size && data.image_size.width)  || 1090;
  imgH = (data.image_size && data.image_size.height) || 1494;
  var SCALE = 2200, aspect = imgW / imgH;
  worldW = SCALE; worldH = SCALE / aspect;

  idToWorld = new Map();
  systems = data.systems || [];
  systems.forEach(function(sys) {
    var xn = sys.coords && sys.coords.x_norm;
    var yn = sys.coords && sys.coords.y_norm;
    if (xn == null || yn == null) {
      var px = sys.pixel && sys.pixel.x, py = sys.pixel && sys.pixel.y;
      if (px == null || py == null) return;
      xn = px / imgW; yn = py / imgH;
    }
    var x = (xn - 0.5) * worldW;
    var y = -(yn - 0.5) * worldH;
    var z = (sys.coords && typeof sys.coords.z === 'number') ? sys.coords.z : 0;
    idToWorld.set(sys.id, [x, y, z]);
  });
  rebuildStarsVBO();

  lanesSet = new Set((data.lanes || []).map(function(ab) { return [ab[0],ab[1]].sort().join('::'); }));
  rebuildLinesVBO();
  updateHUD();

  var sbSys   = document.getElementById('sb-sys');
  var sbLanes = document.getElementById('sb-lanes-ct');
  if (sbSys)   sbSys.textContent   = systems.length + ' NODES ACTIVE';
  if (sbLanes) sbLanes.textContent = lanesSet.size  + ' LANES MAPPED';
  console.log('[SGN] loaded: ' + systems.length + ' systems, ' + lanesSet.size + ' lanes');
}

// ── Keyboard shortcuts ────────────────────────────────────────
window.addEventListener('keydown', function(e) {
  var k = e.key.toLowerCase();
  if (k === 'e') {
    if (!requireEditor()) return;
    editMode = !editMode; if (editMode) addMode = false;
    lanePickA = null; updateHUD(); return;
  }
  if (k === 'a') {
    if (!requireEditor()) return;
    addMode = !addMode; if (addMode) editMode = false;
    updateHUD(); return;
  }
  if (k === 'escape') {
    closePanel(); closeOrrery(); return;
  }
  if (k === 'enter' && selectedId) {
    ensureDetails(selectedId).then(function(d) { renderPanel(selectedId, d); });
    return;
  }
  if (!editMode) return;
  if (k === 'c' && editorOK) { lanesSet.clear(); rebuildLinesVBO(); }
  if (k === 'x' && editorOK) exportJSON();
});

// ── Middle-click: delete nearest lane in edit mode ────────────
canvas.addEventListener('auxclick', function(e) {
  if (!editMode || e.button !== 1 || !editorOK) return;
  var mvp = getMVP();
  var mx = e.clientX, my = e.clientY;
  var bestKey = null, bestD = 1e9;
  lanesSet.forEach(function(key) {
    var ab = key.split('::');
    var pa = idToWorld.get(ab[0]), pb = idToWorld.get(ab[1]);
    if (!pa || !pb) return;
    var sa = projectToScreen(pa[0],pa[1],pa[2],mvp);
    var sb = projectToScreen(pb[0],pb[1],pb[2],mvp);
    if (!sa || !sb) return;
    var d = distToSeg(mx,my, sa[0],sa[1], sb[0],sb[1]);
    if (d < bestD) { bestD = d; bestKey = key; }
  });
  if (bestKey && bestD < 20) { lanesSet.delete(bestKey); rebuildLinesVBO(); }
});

function distToSeg(px,py, ax,ay, bx,by) {
  var abx=bx-ax,aby=by-ay, apx=px-ax,apy=py-ay;
  var t=Math.max(0,Math.min(1,(apx*abx+apy*aby)/(abx*abx+aby*aby||1)));
  return Math.hypot(px-(ax+t*abx), py-(ay+t*aby));
}

// ── Export ────────────────────────────────────────────────────
function exportJSON() {
  var out = {
    image_size: { width: imgW, height: imgH },
    systems: systems,
    lanes: Array.from(lanesSet).map(function(k){ return k.split('::'); })
  };
  var blob = new Blob([JSON.stringify(out,null,2)], { type:'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'systems.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── System details cache + generator ─────────────────────────
var SYSGEN_VER = 'v2';
function sysKey(id) { return 'sysgen:' + SYSGEN_VER + ':' + id; }
function getCached(id) { try { var r=localStorage.getItem(sysKey(id)); return r?JSON.parse(r):null; } catch(e){ return null; } }
function putCached(id, d) { try { localStorage.setItem(sysKey(id), JSON.stringify(d)); } catch(e){} }

function ensureDetails(id, force) {
  var d = force ? null : getCached(id);
  if (!d) { d = generateSystem(id); putCached(id, d); }
  return Promise.resolve(d);
}

function exportSystemDetails(id) {
  var d = getCached(id); if (!d) return;
  var blob = new Blob([JSON.stringify(d,null,2)], { type:'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'system_' + id + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── PRNG ──────────────────────────────────────────────────────
function prng(str) {
  var h = 2166136261 >>> 0;
  for (var i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); }
  var s = h || 0xdeadbeef;
  return function(){ s^=s<<13; s^=s>>>17; s^=s<<5; return (s>>>0)/4294967296; };
}

// ── Star / Planet metadata ────────────────────────────────────
var STAR_META = {
  'M-Dwarf':       { abbr:'M',  bg:'#4a1a1a', glow:'#ff6666', text:'#ff6666' },
  'K-Dwarf':       { abbr:'K',  bg:'#4a2e10', glow:'#e8832a', text:'#e8832a' },
  'G-Dwarf':       { abbr:'G',  bg:'#4a3a10', glow:'#f5c542', text:'#f5c542' },
  'Main Sequence': { abbr:'MS', bg:'#2a4a1a', glow:'#7ed44a', text:'#7ed44a' },
  'F-Dwarf':       { abbr:'F',  bg:'#3a3a1a', glow:'#fff0a0', text:'#ffe060' },
  'Subgiant':      { abbr:'SG', bg:'#3a2a10', glow:'#ffaa44', text:'#ffaa44' },
  'Giant':         { abbr:'GI', bg:'#2a1a40', glow:'#cc88ff', text:'#cc88ff' },
  'Neutron':       { abbr:'NS', bg:'#102030', glow:'#38e8ff', text:'#38e8ff' },
  'Black Hole':    { abbr:'BH', bg:'#080808', glow:'#9955ff', text:'#9955ff' }
};

var PLANET_META = {
  'Rocky':        { icon:'&#9675;', color:'#aa8866' },
  'Ice':          { icon:'&#10052;', color:'#88ccee' },
  'Gas':          { icon:'&#9679;', color:'#8866bb' },
  'Ocean':        { icon:'&#9675;', color:'#3388cc' },
  'Desert':       { icon:'&#9675;', color:'#cc9944' },
  'Shield World': { icon:'&#11041;', color:'#33ccaa' },
  'Ecumenopolis': { icon:'&#11041;', color:'#ffcc44' },
  'Installation': { icon:'&#9672;', color:'#38e8ff' },
  'Habitat':      { icon:'&#9672;', color:'#88ff88' }
};

function getStarMeta(kind) { return STAR_META[kind] || { abbr:'?', bg:'#1a2a3a', glow:'#38e8ff', text:'#38e8ff' }; }
function getPlanetMeta(t)  { return PLANET_META[t]   || { icon:'&#9675;', color:'#888' }; }

// ── Deterministic system generator ───────────────────────────
function generateSystem(id) {
  var rnd = prng(id);

  var starTable = [
    { kind:'M-Dwarf',       w:34, hz:[0.1,0.4],   innerEdge:0.05, outerEdge:8,  starR:3 },
    { kind:'K-Dwarf',       w:22, hz:[0.4,0.9],   innerEdge:0.08, outerEdge:15, starR:4 },
    { kind:'G-Dwarf',       w:18, hz:[0.8,1.6],   innerEdge:0.15, outerEdge:20, starR:5 },
    { kind:'Main Sequence', w:10, hz:[0.9,1.8],   innerEdge:0.15, outerEdge:20, starR:5 },
    { kind:'F-Dwarf',       w:8,  hz:[1.2,2.5],   innerEdge:0.2,  outerEdge:25, starR:6 },
    { kind:'Subgiant',      w:4,  hz:[2.0,5.0],   innerEdge:0.3,  outerEdge:40, starR:7 },
    { kind:'Giant',         w:2,  hz:[5.0,12.0],  innerEdge:0.5,  outerEdge:60, starR:9 },
    { kind:'Neutron',       w:1,  hz:[0.02,0.08], innerEdge:0.01, outerEdge:5,  starR:2 },
    { kind:'Black Hole',    w:1,  hz:[0.0,0.0],   innerEdge:0.3,  outerEdge:50, starR:2 }
  ];
  var tw = starTable.reduce(function(s,e){ return s+e.w; }, 0);
  var pick = rnd() * tw;
  var se = starTable[2];
  for (var i=0;i<starTable.length;i++){ pick-=starTable[i].w; if(pick<=0){se=starTable[i];break;} }

  var kind = se.kind;
  var hzIn = se.hz[0], hzOut = se.hz[1];
  var planetCount = 2 + Math.floor(rnd() * 9);
  var planets = [];
  var au = se.innerEdge * (1 + rnd() * 2);

  function zone(a) {
    if (a < se.innerEdge*1.5) return 'inner';
    if (a >= hzIn*0.7 && a <= hzOut*1.3) return 'habitable';
    if (a > hzOut*1.3 && a < se.outerEdge*0.4) return 'outer';
    return 'fringe';
  }

  function pickType(z) {
    var r = rnd();
    if (kind==='Neutron')    return ['Rocky','Installation','Habitat','Ice'][Math.floor(rnd()*4)];
    if (kind==='Black Hole') return ['Rocky','Desert','Installation'][Math.floor(rnd()*3)];
    if (z==='inner')     return r<0.50?'Rocky':r<0.75?'Desert':r<0.88?'Ocean':'Installation';
    if (z==='habitable') return r<0.30?'Ocean':r<0.55?'Rocky':r<0.70?'Desert':r<0.82?'Ecumenopolis':r<0.90?'Shield World':'Installation';
    if (z==='outer')     return r<0.45?'Gas':r<0.70?'Ice':r<0.85?'Rocky':'Habitat';
    return r<0.55?'Ice':r<0.80?'Gas':'Rocky';
  }

  var TR = { Rocky:0.9,Desert:0.85,Ocean:1.0,Ice:0.8,Gas:2.2,Ecumenopolis:1.1,'Shield World':1.0,Installation:0.6,Habitat:0.5 };
  var pfx = ['Aryn','Vel','Cor','Sith','Eld','Myr','Tar','Keth','Vor','Sev','Nox','Cal'];
  var sfx = ['is','os','ax','en','ar','ia','um','on','eth','el'];
  var used = {};
  function genName() {
    var n, tries=0;
    do { n=pfx[Math.floor(rnd()*pfx.length)]+sfx[Math.floor(rnd()*sfx.length)]; tries++; } while(used[n]&&tries<50);
    used[n]=true; return n;
  }

  for (var i=0;i<planetCount;i++) {
    var z = zone(au);
    var type = pickType(z);
    planets.push({
      name: genName(),
      semi_major_AU: +au.toFixed(3),
      type: type, zone: z,
      radius_hint: +((TR[type]||1)*(0.85+rnd()*0.3)).toFixed(2),
      ecc: +(rnd()*0.18).toFixed(3),
      angle_deg: +(rnd()*360).toFixed(1),
      notes: (i>0 && rnd()<0.12) ? 'Orbital resonance detected' : ''
    });
    au *= (1.45+rnd()*0.75)*(0.9+rnd()*0.2);
    if (au > se.outerEdge) break;
  }

  return {
    version: SYSGEN_VER, system_id: id, seeded: true,
    generated_at: new Date().toISOString(),
    star: { kind:kind, hz:se.hz, inner_edge:se.innerEdge, outer_edge:se.outerEdge, radius_hint:se.starR },
    planets: planets
  };
}

// ── Orbit SVG diagram ─────────────────────────────────────────
function buildOrbitSVG(planets, starColor, sm, starData) {
  var cx=110, cy=110, maxR=100;
  var allAU = planets.map(function(p){ return p.semi_major_AU||0.1; });
  var minAU = Math.max(0.01, (starData&&starData.inner_edge||0.05)*0.5);
  var maxAU = Math.max.apply(null, allAU.concat([1]))*1.15;
  var logMin=Math.log(minAU), logMax=Math.log(maxAU);

  function auToR(au) {
    var t=(Math.log(Math.max(au,0.001))-logMin)/(logMax-logMin);
    return 8+t*(maxR-8);
  }

  var hz = (starData&&starData.hz)||[0.8,1.6];
  var hzR1=auToR(hz[0]), hzR2=auToR(hz[1]);
  var hzVis = hz[0]>0 && hzR1<maxR && hzR2>8;
  var sR = Math.min(7, 3+(starData&&starData.radius_hint||5)*0.6);

  var defs = '<defs>'
    +'<filter id="gs" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    +'<filter id="gp" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    +'<radialGradient id="sg" cx="40%" cy="35%" r="60%"><stop offset="0%" stop-color="#fff" stop-opacity="0.9"/><stop offset="50%" stop-color="'+starColor+'" stop-opacity="0.9"/><stop offset="100%" stop-color="'+starColor+'" stop-opacity="0.5"/></radialGradient>'
    +'</defs>';

  var bg = '<circle cx="'+cx+'" cy="'+cy+'" r="108" fill="rgba(4,7,14,.85)" stroke="rgba(56,232,255,.06)" stroke-width="1"/>';
  var grid='';
  for(var r=20;r<=maxR;r+=20) grid+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="rgba(56,232,255,.05)" stroke-width="0.5"/>';

  var hzSvg='';
  if(hzVis){
    hzSvg='<circle cx="'+cx+'" cy="'+cy+'" r="'+hzR2.toFixed(1)+'" fill="rgba(80,255,120,.06)" stroke="rgba(80,255,120,.18)" stroke-width="0.8" stroke-dasharray="3 4"/>'
          +'<circle cx="'+cx+'" cy="'+cy+'" r="'+hzR1.toFixed(1)+'" fill="none" stroke="rgba(80,255,120,.12)" stroke-width="0.6" stroke-dasharray="2 5"/>';
  }

  var orbits='', dots='', labels='';
  planets.forEach(function(p){
    var a=auToR(p.semi_major_AU||0.1);
    var ecc=p.ecc||0, b=a*Math.sqrt(1-ecc*ecc), off=a*ecc;
    var rot=p.angle_deg||0;
    orbits+='<ellipse cx="'+(cx+off*0.3).toFixed(1)+'" cy="'+cy+'" rx="'+a.toFixed(1)+'" ry="'+b.toFixed(1)+'" fill="none" stroke="rgba(56,232,255,.16)" stroke-width="0.7" transform="rotate('+rot+' '+cx+' '+cy+')" />';

    var ang=((p.angle_deg||0)*Math.PI)/180;
    var px=cx+off*0.3+Math.cos(ang)*a;
    var py=cy+Math.sin(ang)*b;
    var pr=Math.max(2.2,Math.min(5.5,(p.radius_hint||1)*2.2));
    var pm=getPlanetMeta(p.type);
    if(p.zone==='habitable') dots+='<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="'+(pr+3).toFixed(1)+'" fill="none" stroke="rgba(80,255,120,.3)" stroke-width="0.8"/>';
    dots+='<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="'+pr.toFixed(1)+'" fill="'+pm.color+'" opacity=".92" filter="url(#gp)"><title>'+p.name+' \u00B7 '+p.type+' \u00B7 '+p.semi_major_AU+' AU</title></circle>';

    var ld=Math.hypot(px-cx,py-cy);
    if(ld>14&&ld<104){
      var lxp=cx+(px-cx)/ld*(ld+pr+5);
      var lyp=cy+(py-cy)/ld*(ld+pr+5);
      labels+='<text x="'+lxp.toFixed(1)+'" y="'+(lyp+3).toFixed(1)+'" font-family="\'Share Tech Mono\',monospace" font-size="7" fill="rgba(180,210,255,.55)" text-anchor="'+(lxp>cx?'start':'end')+'" letter-spacing="0.5">'+p.name+'</text>';
    }
  });

  var star='<circle cx="'+cx+'" cy="'+cy+'" r="'+(sR*3.5).toFixed(1)+'" fill="'+starColor+'" opacity=".08"/>'
           +'<circle cx="'+cx+'" cy="'+cy+'" r="'+(sR*1.8).toFixed(1)+'" fill="'+starColor+'" opacity=".15"/>'
           +'<circle cx="'+cx+'" cy="'+cy+'" r="'+sR.toFixed(1)+'" fill="url(#sg)" filter="url(#gs)"/>';

  var ticks='';
  [0.5,1,5,10,20].forEach(function(v){
    var tr=auToR(v);
    if(v>=minAU&&v<=maxAU&&tr>10&&tr<maxR-2)
      ticks+='<text x="'+(cx+tr+2).toFixed(1)+'" y="'+(cy+3).toFixed(1)+'" font-family="\'Share Tech Mono\',monospace" font-size="6" fill="rgba(56,232,255,.3)">'+v+'AU</text>';
  });

  var hzLabel = '';
  if(hzVis){ var mR=(hzR1+hzR2)/2; hzLabel='<text x="'+(cx+mR+2).toFixed(1)+'" y="'+(cy-3).toFixed(1)+'" font-family="\'Share Tech Mono\',monospace" font-size="6" fill="rgba(80,255,120,.45)">HZ</text>'; }

  return '<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">'+defs+bg+grid+hzSvg+orbits+labels+ticks+hzLabel+star+dots+'</svg>';
}

// ── Panel ─────────────────────────────────────────────────────
var panel      = document.getElementById('sidePanel');
var spTitle    = document.getElementById('sp-title');
var spSysId    = document.getElementById('sp-sys-id');
var spOwner    = document.getElementById('sp-owner');
var spStarOrb  = document.getElementById('sp-star-orb');
var spStarAbbr = document.getElementById('sp-star-abbr');

function openPanel()  { panel.classList.add('open'); }
function closePanel() { panel.classList.remove('open'); }

document.getElementById('sp-close').addEventListener('click', closePanel);
document.getElementById('sp-tabs').addEventListener('click', function(e) {
  var tab = e.target.closest('.tab');
  if (!tab) return;
  var name = tab.dataset.tab;
  document.querySelectorAll('#sp-tabs .tab').forEach(function(t){ t.classList.toggle('active', t===tab); });
  document.querySelectorAll('#sp-body .tab-pane').forEach(function(p){ p.classList.toggle('active', p.id==='pane-'+name); });
});

document.getElementById('sp-gen').addEventListener('click', function() {
  if (!selectedId) return;
  ensureDetails(selectedId, true).then(function(d){ renderPanel(selectedId, d); });
});
document.getElementById('sp-exp').addEventListener('click', function() {
  if (selectedId) exportSystemDetails(selectedId);
});
document.getElementById('sp-orrery').addEventListener('click', function() {
  if (selectedId) openOrrery(selectedId);
});

function renderPanel(id, details) {
  var sys     = systems.find(function(s){ return s.id===id; });
  var star    = (details && details.star)    || {};
  var planets = (details && details.planets) || [];
  var sm      = getStarMeta(star.kind);

  spTitle.textContent         = (sys && sys.name) || id;
  spSysId.textContent         = id;
  spOwner.textContent         = (sys && sys.owner) ? ('\u25C8 ' + sys.owner) : '';
  spStarAbbr.textContent      = sm.abbr;
  spStarOrb.style.background  = 'radial-gradient(circle at 35% 35%, ' + sm.glow + '44, ' + sm.bg + ')';
  spStarOrb.style.boxShadow   = '0 0 12px ' + sm.glow + '44, inset 0 0 8px ' + sm.glow + '22';
  spStarOrb.style.color       = sm.text;

  // Overview pane
  var pov = document.getElementById('pane-overview');
  var tags = (sys && Array.isArray(sys.tags) && sys.tags.length)
    ? sys.tags.map(function(t){ return '<span class="tag-chip">'+t+'</span>'; }).join('')
    : '';
  var innerAU = planets.length ? planets.reduce(function(a,b){ return (a.semi_major_AU||99)<(b.semi_major_AU||99)?a:b; }).semi_major_AU : '—';
  var outerAU = planets.length ? planets.reduce(function(a,b){ return (a.semi_major_AU||0)>(b.semi_major_AU||0)?a:b; }).semi_major_AU : '—';

  pov.innerHTML =
    (planets.length ? '<div class="orbit-diagram">'+buildOrbitSVG(planets, sm.glow, sm, details&&details.star)+'</div>' : '') +
    '<div class="stats-grid">' +
      '<div class="stat-cell"><div class="stat-key">Star Class</div><div class="stat-val" style="color:'+sm.text+';font-size:16px;">'+(star.kind||'&#8212;')+'</div><div class="stat-sub">'+sm.abbr+' TYPE</div></div>' +
      '<div class="stat-cell"><div class="stat-key">Bodies</div><div class="stat-val cyan">'+planets.length+'</div><div class="stat-sub">ORBITAL OBJECTS</div></div>' +
      '<div class="stat-cell"><div class="stat-key">Nearest</div><div class="stat-val gold" style="font-size:15px;">'+innerAU+'</div><div class="stat-sub">AU INNER ORBIT</div></div>' +
      '<div class="stat-cell"><div class="stat-key">Farthest</div><div class="stat-val" style="font-size:15px;">'+outerAU+'</div><div class="stat-sub">AU OUTER ORBIT</div></div>' +
    '</div>' +
    '<div class="meta-row"><span class="mk">ID</span><span class="mv hi">'+id+'</span></div>' +
    '<div class="meta-row"><span class="mk">Name</span><span class="mv">'+((sys&&sys.name)||'&#8212;')+'</span></div>' +
    ((sys&&sys.owner) ? '<div class="meta-row"><span class="mk">Owner</span><span class="mv go">'+sys.owner+'</span></div>' : '') +
    (tags ? '<div class="meta-row"><span class="mk">Tags</span><span class="mv">'+tags+'</span></div>' : '') +
    '<div class="meta-row"><span class="mk">Record</span><span class="mv" style="font-size:13px;color:var(--text-muted);">'+(details&&details.version||'&#8212;')+' &middot; '+(details&&details.generated_at?new Date(details.generated_at).toLocaleDateString():'unscanned')+'</span></div>';

  // Bodies pane
  var pbod = document.getElementById('pane-bodies');
  if (!planets.length) {
    pbod.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#9678;</div><div class="empty-state-text">// NO ORBITAL DATA<br>// PRESS &#x27F3; SCAN SYSTEM</div></div>';
  } else {
    var sorted = planets.slice().sort(function(a,b){ return (a.semi_major_AU||0)-(b.semi_major_AU||0); });
    pbod.innerHTML = '<div class="bodies-header"><span class="bodies-count">'+planets.length+' ORBITAL OBJECT'+(planets.length!==1?'S':'')+' DETECTED</span></div>'
      + sorted.map(function(p){
          var pm=getPlanetMeta(p.type);
          return '<div class="planet-card">'
            +'<div class="p-icon" style="background:'+pm.color+'22;color:'+pm.color+';">'+pm.icon+'</div>'
            +'<div class="p-info"><div class="p-name">'+p.name+'</div><div class="p-type-badge">'+(p.type||'UNKNOWN')+'</div>'+(p.notes?'<div class="p-notes-line">'+p.notes+'</div>':'')+'</div>'
            +'<div class="p-orbit-val">'+(p.semi_major_AU||'?')+'<br><span style="font-size:7px;color:var(--text-muted);">AU</span></div>'
            +'</div>';
        }).join('');
  }

  // Edit pane
  renderEditPane(id, details, sys);

  // Switch to overview tab and show panel
  document.querySelector('#sp-tabs .tab[data-tab="overview"]').click();
  openPanel();
}

function renderEditPane(id, details, sys) {
  if (!sys) sys = systems.find(function(s){ return s.id===id; });
  var star    = (details&&details.star)||{};
  var planets = (details&&details.planets)||[];
  var starKinds = ['Main Sequence','K-Dwarf','G-Dwarf','F-Dwarf','M-Dwarf','Subgiant','Giant','Neutron','Black Hole'];
  var opts = starKinds.map(function(k){ return '<option value="'+k+'"'+(star.kind===k?' selected':'')+'>'+k+'</option>'; }).join('');

  var pedit = document.getElementById('pane-edit');
  pedit.innerHTML =
    '<div class="edit-section">'
    +'<div class="edit-section-title">System Identity</div>'
    +'<div class="form-row"><span class="fl">ID</span><span style="font-family:\'Share Tech Mono\',monospace;font-size:13px;color:var(--cyan-dim);letter-spacing:1px;">'+id+'</span></div>'
    +'<div class="form-row"><label class="fl" for="sysName">Name</label><input id="sysName" class="sci-input" type="text" value="'+(sys&&sys.name||'').replace(/"/g,'&quot;')+'"/></div>'
    +'<div class="form-row"><label class="fl" for="starKind">Star</label><select id="starKind" class="sci-select">'+opts+'</select></div>'
    +'</div>'
    +'<div class="edit-section">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
    +'<div class="edit-section-title" style="flex:1;border:none;margin:0;padding:0;">Orbital Bodies</div>'
    +'<button id="btnAddPlanet" type="button" class="pbtn primary" style="margin-left:10px;">+ ADD</button>'
    +'</div>'
    +'<div id="planetList">'+planets.map(function(p,i){ return planetRow(p,i); }).join('')+'</div>'
    +'</div>'
    +'<div class="edit-actions">'
    +'<button id="btnSaveEdit" class="pbtn success" style="flex:1;padding:8px;">&#10003; SAVE CHANGES</button>'
    +'<button id="btnCancelEdit" class="pbtn danger" style="padding:8px 12px;">&#x2715;</button>'
    +'</div>';

  pedit.querySelector('#btnAddPlanet').addEventListener('click', function() {
    var listEl = pedit.querySelector('#planetList');
    var idx = listEl.querySelectorAll('.planetRow').length;
    var tmp = document.createElement('div');
    tmp.innerHTML = planetRow({ name:'P'+(idx+1), type:'Rocky', semi_major_AU:1.0, notes:'' }, idx);
    listEl.appendChild(tmp.firstElementChild);
  });

  pedit.querySelector('#planetList').addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('delPlanet')) {
      e.target.closest('.planetRow').remove();
    }
  });

  pedit.querySelector('#btnSaveEdit').addEventListener('click', function() {
    if (!requireEditor()) return;
    var newName = pedit.querySelector('#sysName').value.trim();
    var newKind = pedit.querySelector('#starKind').value;
    var rows    = Array.from(pedit.querySelectorAll('.planetRow'));
    var newPlanets = rows.map(function(row){
      return {
        name:          row.querySelector('.pName').value.trim()||'Body',
        type:          row.querySelector('.pType').value,
        semi_major_AU: parseFloat(row.querySelector('.pSMA').value)||null,
        notes:         row.querySelector('.pNotes').value.trim()
      };
    });
    var updated = Object.assign({}, getCached(id)||{ version:SYSGEN_VER, system_id:id }, { star:{ kind:newKind }, planets:newPlanets });
    putCached(id, updated);
    if (newName) { var s=systems.find(function(s){ return s.id===id; }); if(s) s.name=newName; }
    renderPanel(id, updated);
  });

  pedit.querySelector('#btnCancelEdit').addEventListener('click', function() {
    document.querySelector('#sp-tabs .tab[data-tab="overview"]').click();
  });
}

function planetRow(p, i) {
  var pm = getPlanetMeta(p.type);
  var o = function(v){ return '<option value="'+v+'"'+(p.type===v?' selected':'')+'>'+v+'</option>'; };
  return '<div class="planetRow planet-row">'
    +'<div class="planet-row-head">'
    +'<span class="p-idx" style="display:flex;align-items:center;gap:6px;"><span style="color:'+pm.color+';font-size:14px;">'+pm.icon+'</span>BODY '+(i+1)+'</span>'
    +'<button type="button" class="delPlanet pbtn danger" style="padding:3px 8px;">REMOVE</button>'
    +'</div>'
    +'<div class="planet-row-body">'
    +'<div class="form-row"><span class="fl">Name</span><input class="pName sci-input" type="text" value="'+(p.name||'').replace(/"/g,'&quot;')+'"/></div>'
    +'<div class="form-row"><span class="fl">Type</span><select class="pType sci-select">'+o('Rocky')+o('Ice')+o('Gas')+o('Ocean')+o('Desert')+o('Shield World')+o('Ecumenopolis')+o('Installation')+o('Habitat')+'</select></div>'
    +'<div class="form-row"><span class="fl">Orbit AU</span><input class="pSMA sci-input" type="number" step="0.01" min="0.01" value="'+(p.semi_major_AU||1)+'"/></div>'
    +'<div class="form-row"><span class="fl">Notes</span><input class="pNotes sci-input" type="text" value="'+(p.notes||'').replace(/"/g,'&quot;')+'"/></div>'
    +'</div></div>';
}

// ── Orrery ────────────────────────────────────────────────────
var orreryModal  = document.getElementById('orrery-modal');
var orreryCanvas = document.getElementById('orrery-canvas');
var orreryCtx    = orreryCanvas.getContext('2d');
var orreryRAF    = null;
var orreryData   = null;
var orrerySpeed  = 1;
var orreryT      = 0;
var orreryLastTS = null;
var YEAR_SECS    = 8;

document.getElementById('orrery-close').addEventListener('click', closeOrrery);
window.addEventListener('keydown', function(e){ if(e.key==='Escape') closeOrrery(); });

document.querySelectorAll('.speed-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    orrerySpeed = parseFloat(btn.dataset.speed);
    document.querySelectorAll('.speed-btn').forEach(function(b){ b.classList.toggle('active', b===btn); });
  });
});

function openOrrery(id) {
  var det = getCached(id); if (!det) return;
  var sys = systems.find(function(s){ return s.id===id; }) || { name: id };
  var star = det.star||{};
  var sm   = getStarMeta(star.kind);
  var planets = (det.planets||[]).slice().sort(function(a,b){ return (a.semi_major_AU||0)-(b.semi_major_AU||0); });
  orreryData = { sys:sys, planets:planets, star:star, sm:sm };
  orreryT = 0; orreryLastTS = null;
  document.getElementById('orrery-name').textContent = sys.name || id;
  document.getElementById('orrery-sub').textContent  = (star.kind||'—') + ' \u00B7 ' + planets.length + ' BODY' + (planets.length!==1?'S':'');
  buildOrreryLegend(planets, star.hz);
  orreryModal.classList.add('open');
  resizeOrreryCanvas();
  if (orreryRAF) cancelAnimationFrame(orreryRAF);
  orreryRAF = requestAnimationFrame(orreryTick);
}

function closeOrrery() {
  orreryModal.classList.remove('open');
  if (orreryRAF) { cancelAnimationFrame(orreryRAF); orreryRAF = null; }
}

function resizeOrreryCanvas() {
  var rect = orreryCanvas.parentElement.getBoundingClientRect();
  orreryCanvas.width  = rect.width;
  orreryCanvas.height = rect.height;
}
window.addEventListener('resize', function(){ if(orreryModal.classList.contains('open')) resizeOrreryCanvas(); });

function buildOrreryLegend(planets, hz) {
  var leg = document.getElementById('orrery-legend');
  var types = [];
  planets.forEach(function(p){ if(types.indexOf(p.type)<0) types.push(p.type); });
  var html = '';
  if (hz && hz[0]>0) html += '<div class="orrery-legend-item"><div class="orrery-legend-ring"></div>HABITABLE ZONE</div>';
  types.forEach(function(t){
    var pm = getPlanetMeta(t);
    html += '<div class="orrery-legend-item"><div class="orrery-legend-dot" style="background:'+pm.color+'"></div>'+t.toUpperCase()+'</div>';
  });
  leg.innerHTML = html;
}

function orreryTick(ts) {
  if (orreryLastTS !== null) {
    var dt = Math.min((ts - orreryLastTS)/1000, 0.1);
    orreryT += dt * orrerySpeed / YEAR_SECS;
  }
  orreryLastTS = ts;
  drawOrrery();
  orreryRAF = requestAnimationFrame(orreryTick);
}

function drawOrrery() {
  var W = orreryCanvas.width, H = orreryCanvas.height;
  var cx = W/2, cy = H/2;
  orreryCtx.clearRect(0,0,W,H);
  if (!orreryData) return;
  var planets=orreryData.planets, star=orreryData.star, sm=orreryData.sm;
  if (!planets.length) return;

  var allAU = planets.map(function(p){ return p.semi_major_AU||0.1; });
  var minAU = Math.max(0.01,(star.inner_edge||0.05)*0.5);
  var maxAU = Math.max.apply(null,allAU)*1.2;
  var margin = 60;
  var maxR   = Math.min(cx,cy)-margin;
  var logMin=Math.log(minAU), logMax=Math.log(maxAU);
  function auToR(au){ var t=(Math.log(Math.max(au,0.001))-logMin)/(logMax-logMin); return 12+t*(maxR-12); }

  // Radial grid
  for(var gr=maxR*0.25;gr<=maxR;gr+=maxR*0.25){
    orreryCtx.beginPath(); orreryCtx.arc(cx,cy,gr,0,Math.PI*2);
    orreryCtx.strokeStyle='rgba(56,232,255,0.04)'; orreryCtx.lineWidth=1; orreryCtx.stroke();
  }

  // Habitable zone
  var hz=star.hz||[0,0];
  if(hz[0]>0&&hz[1]>hz[0]){
    var r1=auToR(hz[0]),r2=auToR(hz[1]);
    var grad=orreryCtx.createRadialGradient(cx,cy,r1,cx,cy,r2);
    grad.addColorStop(0,'rgba(60,220,100,0)'); grad.addColorStop(0.3,'rgba(60,220,100,0.06)');
    grad.addColorStop(0.7,'rgba(60,220,100,0.06)'); grad.addColorStop(1,'rgba(60,220,100,0)');
    orreryCtx.beginPath(); orreryCtx.arc(cx,cy,r2,0,Math.PI*2); orreryCtx.arc(cx,cy,r1,0,Math.PI*2,true);
    orreryCtx.fillStyle=grad; orreryCtx.fill();
    orreryCtx.setLineDash([4,6]); orreryCtx.lineWidth=0.8; orreryCtx.strokeStyle='rgba(60,220,100,0.22)';
    orreryCtx.beginPath(); orreryCtx.arc(cx,cy,r1,0,Math.PI*2); orreryCtx.stroke();
    orreryCtx.beginPath(); orreryCtx.arc(cx,cy,r2,0,Math.PI*2); orreryCtx.stroke();
    orreryCtx.setLineDash([]);
  }

  // Orbit ellipses
  planets.forEach(function(p){
    var a=auToR(p.semi_major_AU||0.1), ecc=p.ecc||0, b=a*Math.sqrt(1-ecc*ecc), off=a*ecc*0.3;
    var rot=((p.angle_deg||0)*Math.PI)/180;
    orreryCtx.save(); orreryCtx.translate(cx,cy); orreryCtx.rotate(rot); orreryCtx.translate(off,0);
    orreryCtx.beginPath(); orreryCtx.ellipse(0,0,a,b,0,0,Math.PI*2);
    orreryCtx.strokeStyle='rgba(56,232,255,0.18)'; orreryCtx.lineWidth=0.8; orreryCtx.stroke();
    orreryCtx.restore();
  });

  // Star
  var starColor=sm.glow||'#38e8ff';
  var starR=Math.max(6,(star.radius_hint||5)*1.2);
  var sg1=orreryCtx.createRadialGradient(cx,cy,0,cx,cy,starR*5);
  sg1.addColorStop(0,hexRgba(starColor,0.35)); sg1.addColorStop(0.3,hexRgba(starColor,0.12)); sg1.addColorStop(1,'rgba(0,0,0,0)');
  orreryCtx.beginPath(); orreryCtx.arc(cx,cy,starR*5,0,Math.PI*2); orreryCtx.fillStyle=sg1; orreryCtx.fill();
  var sg2=orreryCtx.createRadialGradient(cx-starR*0.3,cy-starR*0.3,0,cx,cy,starR);
  sg2.addColorStop(0,'#ffffff'); sg2.addColorStop(0.4,starColor); sg2.addColorStop(1,hexRgba(starColor,0.6));
  orreryCtx.beginPath(); orreryCtx.arc(cx,cy,starR,0,Math.PI*2); orreryCtx.fillStyle=sg2; orreryCtx.fill();

  // Planets
  var planetPos=[];
  planets.forEach(function(p){
    var a=auToR(p.semi_major_AU||0.1), ecc=p.ecc||0, b=a*Math.sqrt(1-ecc*ecc), off=a*ecc*0.3;
    var rot=((p.angle_deg||0)*Math.PI)/180;
    var period=Math.sqrt(Math.pow(p.semi_major_AU||1,3));
    var angle=(orreryT/period)*Math.PI*2;
    var lxp=Math.cos(angle)*a-off, lyp=Math.sin(angle)*b;
    var px=cx+lxp*Math.cos(rot)-lyp*Math.sin(rot);
    var py=cy+lxp*Math.sin(rot)+lyp*Math.cos(rot);
    var pm=getPlanetMeta(p.type);
    var pr=Math.max(3,Math.min(9,(p.radius_hint||1)*3.2));

    if(p.zone==='habitable'){
      orreryCtx.beginPath(); orreryCtx.arc(px,py,pr+4,0,Math.PI*2);
      orreryCtx.strokeStyle='rgba(80,255,120,0.4)'; orreryCtx.lineWidth=1; orreryCtx.stroke();
    }
    var pg=orreryCtx.createRadialGradient(px,py,0,px,py,pr*2.5);
    pg.addColorStop(0,hexRgba(pm.color,0.5)); pg.addColorStop(1,'rgba(0,0,0,0)');
    orreryCtx.beginPath(); orreryCtx.arc(px,py,pr*2.5,0,Math.PI*2); orreryCtx.fillStyle=pg; orreryCtx.fill();

    var pb=orreryCtx.createRadialGradient(px-pr*0.3,py-pr*0.3,0,px,py,pr);
    pb.addColorStop(0,lighten(pm.color,60)); pb.addColorStop(0.5,pm.color); pb.addColorStop(1,darken(pm.color,50));
    orreryCtx.beginPath(); orreryCtx.arc(px,py,pr,0,Math.PI*2); orreryCtx.fillStyle=pb; orreryCtx.fill();

    orreryCtx.font="11px 'Share Tech Mono',monospace";
    orreryCtx.fillStyle='rgba(180,210,255,0.65)';
    orreryCtx.textAlign=px>cx?'left':'right';
    orreryCtx.fillText(p.name, px+(px>cx?pr+4:-(pr+4)), py+4);

    planetPos.push({ p:p, px:px, py:py, pr:pr });
  });
  orreryCanvas._planets = planetPos;
}

// Orrery hover
orreryCanvas.addEventListener('mousemove', function(e) {
  if (!orreryCanvas._planets) return;
  var rect=orreryCanvas.getBoundingClientRect();
  var mx=e.clientX-rect.left, my=e.clientY-rect.top;
  var hover=document.getElementById('orrery-hover');
  var hit=null;
  for(var i=0;i<orreryCanvas._planets.length;i++){
    var pp=orreryCanvas._planets[i];
    if(Math.hypot(mx-pp.px,my-pp.py)<pp.pr+8){ hit=pp.p; break; }
  }
  if(hit){
    document.getElementById('ohl-name').textContent=hit.name;
    document.getElementById('ohl-sub').textContent=hit.type+' \u00B7 '+hit.semi_major_AU+' AU';
    hover.style.display='block';
    var mr=orreryModal.getBoundingClientRect();
    hover.style.left=(e.clientX-mr.left+14)+'px';
    hover.style.top=(e.clientY-mr.top-14)+'px';
    orreryCanvas.style.cursor='crosshair';
  } else {
    hover.style.display='none'; orreryCanvas.style.cursor='default';
  }
});
orreryCanvas.addEventListener('mouseleave', function(){ document.getElementById('orrery-hover').style.display='none'; });

// Colour helpers
function hexRgba(hex, a) {
  var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+a+')';
}
function lighten(hex,amt){ return 'rgb('+[1,3,5].map(function(o){ return Math.min(255,parseInt(hex.slice(o,o+2),16)+amt); }).join(',')+')'; }
function darken(hex,amt){ return 'rgb('+[1,3,5].map(function(o){ return Math.max(0,parseInt(hex.slice(o,o+2),16)-amt); }).join(',')+')'; }
