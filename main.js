// === Vanilla WebGL star map with LANES ===
const canvas = document.getElementById('gl');
let gl = canvas.getContext('webgl2', { antialias: true });
if (!gl) gl = canvas.getContext('webgl', { antialias: true });
if (!gl) alert('WebGL not supported');

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
function mat4Mul(a,b){const o=new Float32Array(16);
  for(let r=0;r<4;r++)for(let c=0;c<4;c++)
    o[r*4+c]=a[r*4+0]*b[0*4+c]+a[r*4+1]*b[1*4+c]+a[r*4+2]*b[2*4+c]+a[r*4+3]*b[3*4+c];return o;}
function mat4Perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);
  return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,(2*far*near)*nf,0]);}
function mat4Translate(x,y,z){return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);}
function mat4RotateY(a){const c=Math.cos(a),s=Math.sin(a);
  return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);}
function mat4RotateX(a){const c=Math.cos(a),s=Math.sin(a);
  return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);}

// --- shader helpers ---
function compile(type, src){const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s;}
function makeProgram(vsSrc, fsSrc){
  const p=gl.createProgram(); gl.attachShader(p,compile(gl.VERTEX_SHADER,vsSrc));
  gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fsSrc)); gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw gl.getProgramInfoLog(p);
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

// --- camera/orbit ---
let yaw=0, pitch=0, dist=1800, dragging=false, lx=0, ly=0;
canvas.addEventListener('mousedown', e=>{dragging=true; lx=e.clientX; ly=e.clientY;});
addEventListener('mouseup', ()=>dragging=false);
addEventListener('mousemove', e=>{
  if(!dragging) return;
  const dx=e.clientX-lx, dy=e.clientY-ly; lx=e.clientX; ly=e.clientY;
  yaw+=dx*0.005; pitch+=dy*0.005; pitch=Math.max(-1.55, Math.min(1.55, pitch));
});
addEventListener('wheel', e=>{ dist*= (1 + Math.sign(e.deltaY)*0.12); dist=Math.max(300, Math.min(6000, dist)); });

// --- data buffers ---
let starsVBO=null, starCount=0;
let linesVBO=null, lineVertCount=0;

// NOTE: update this if your JSON path/filename differs
const jsonURL = './systems.json';

fetch(jsonURL).then(r=>r.json()).then(data=>{
  // dimensions (fall back to image if present, else use your numbers)
  const imgW = data?.image_size?.width  ?? 1090;
  const imgH = data?.image_size?.height ?? 1494;
  const SCALE = 2200, aspect = imgW/imgH;
  const worldW = SCALE, worldH = SCALE/aspect;

  const toWorld = (xn, yn) => {
    const x = (xn - 0.5) * worldW;
    const y = -(yn - 0.5) * worldH;
    const z = 0; // flat layer for now
    return [x,y,z];
  };

  // build star positions
  const stars = [];
  const idToWorld = new Map();
  (data.systems || []).forEach(sys=>{
    let xn = sys.coords?.x_norm, yn = sys.coords?.y_norm;
    if (xn==null || yn==null) {
      const px=sys.pixel?.x, py=sys.pixel?.y;
      if (px==null || py==null) return;
      xn = px/imgW; yn = py/imgH;
    }
    const [x,y,z] = toWorld(xn,yn);
    stars.push(x,y,z);
    idToWorld.set(sys.id, [x,y,z]);
  });
  starCount = stars.length/3;
  starsVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starsVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(stars), gl.STATIC_DRAW);

  // build lane segments (each lane adds two vertices)
  const lanes = data.lanes || [];
  const lineVerts = [];
  for (const [a,b] of lanes) {
    const pa = idToWorld.get(a), pb = idToWorld.get(b);
    if (!pa || !pb) continue;
    lineVerts.push(pa[0],pa[1],pa[2], pb[0],pb[1],pb[2]);
  }
  lineVertCount = lineVerts.length/3;
  if (lineVertCount>0) {
    linesVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, linesVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVerts), gl.STATIC_DRAW);
  }

  requestAnimationFrame(loop);
});

function loop(){
  gl.clearColor(0.043,0.055,0.075,1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const proj = mat4Perspective(55*Math.PI/180, canvas.width/canvas.height, 0.1, 50000);
  const rot  = mat4Mul(mat4RotateY(yaw), mat4RotateX(pitch));
  const view = mat4Translate(0,0,-dist);
  const mvp  = mat4Mul(rot, mat4Mul(view, proj));

  // draw lanes first (so points sit on top)
  if (linesVBO && lineVertCount>0) {
    gl.useProgram(progLines);
    gl.uniformMatrix4fv(uMVP_lines, false, mvp);
    gl.uniform3f(uColorLines, 1.0, 0.85, 0.35); // warm yellow
    gl.bindBuffer(gl.ARRAY_BUFFER, linesVBO);
    gl.enableVertexAttribArray(aPos_lines);
    gl.vertexAttribPointer(aPos_lines, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, lineVertCount);
  }

  // draw stars
  if (starsVBO && starCount>0) {
    gl.useProgram(progPoints);
    gl.uniformMatrix4fv(uMVP_points, false, mvp);
    gl.uniform1f(uSize, 6.0);
    gl.uniform3f(uColorPts, 1.0, 0.92, 0.6); // star color
    gl.bindBuffer(gl.ARRAY_BUFFER, starsVBO);
    gl.enableVertexAttribArray(aPos_points);
    gl.vertexAttribPointer(aPos_points, 3, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.POINTS, 0, starCount);
  }

  requestAnimationFrame(loop);
}
