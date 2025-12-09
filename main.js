const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl');
if (!gl) alert('WebGL not supported');

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize); resize();

/* Shaders (points) */
const vs = `
attribute vec3 position;
uniform mat4 uMVP;
void main() {
  gl_Position = uMVP * vec4(position, 1.0);
  gl_PointSize = 6.0; /* size of star dot */
}`;
const fs = `
precision mediump float;
void main() {
  /* soft round point */
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = dot(uv, uv);
  float alpha = smoothstep(1.0, 0.8, 1.0 - d);
  gl_FragColor = vec4(1.0, 0.92, 0.6, alpha); /* warm yellow */
}`;
function compile(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s);
  return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw gl.getProgramInfoLog(prog);
gl.useProgram(prog);

const locPos = gl.getAttribLocation(prog, 'position');
const locMVP = gl.getUniformLocation(prog, 'uMVP');

/* Minimal mat4 helpers */
function mat4Identity(){return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];}
function mat4Mul(a,b){
  const o = new Array(16);
  for (let r=0;r<4;r++) for (let c=0;c<4;c++){
    o[r*4+c]=a[r*4+0]*b[0*4+c]+a[r*4+1]*b[1*4+c]+a[r*4+2]*b[2*4+c]+a[r*4+3]*b[3*4+c];
  } return o;
}
function mat4Perspective(fovy, aspect, near, far){
  const f = 1/Math.tan(fovy/2), nf = 1/(near-far);
  return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,(2*far*near)*nf,0];
}
function mat4Translate(x,y,z){
  return [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
}
function mat4RotateY(a){
  const c=Math.cos(a), s=Math.sin(a);
  return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1];
}
function mat4RotateX(a){
  const c=Math.cos(a), s=Math.sin(a);
  return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1];
}

/* Load systems */
const url = './systems.json';
const ownerName = 'Arandorë Eldainë';
let positions = null;    // Float32Array of XYZ
let count = 0;

fetch(url).then(r=>r.json()).then(data=>{
  const imgW = data?.image_size?.width  ?? 1090;
  const imgH = data?.image_size?.height ?? 1494;
  const SCALE = 2200, aspect = imgW/imgH;
  const worldW = SCALE, worldH = SCALE/aspect;

  const systems = data.systems || [];
  count = systems.length;
  positions = new Float32Array(count * 3);

  for (let i=0;i<systems.length;i++){
    const sys = systems[i];
    let xn = sys.coords?.x_norm, yn = sys.coords?.y_norm;
    if (xn == null || yn == null) {
      const px = sys.pixel?.x, py = sys.pixel?.y;
      if (px == null || py == null) { xn = 0.5; yn = 0.5; }
      else { xn = px / imgW; yn = py / imgH; }
    }
    const x = (xn - 0.5) * worldW;
    const y = -(yn - 0.5) * worldH;
    const z = 0; // flat for now (we’ll layer Core/Mid/Outer later)
    positions[i*3+0]=x; positions[i*3+1]=y; positions[i*3+2]=z;
  }

  // Upload positions to GPU
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(locPos);
  gl.vertexAttribPointer(locPos, 3, gl.FLOAT, false, 0, 0);

  requestAnimationFrame(loop);
});

/* Simple orbit camera */
let yaw = 0, pitch = 0, dist = 1800;
let dragging = false, lastX=0, lastY=0;
canvas.addEventListener('mousedown', e=>{ dragging = true; lastX=e.clientX; lastY=e.clientY; });
window.addEventListener('mouseup', ()=> dragging=false);
window.addEventListener('mousemove', e=>{
  if(!dragging) return;
  const dx = e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
  yaw += dx * 0.005;
  pitch += dy * 0.005;
  pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch));
});
window.addEventListener('wheel', e=>{
  dist *= (1 + Math.sign(e.deltaY)*0.1);
  dist = Math.max(300, Math.min(6000, dist));
});

/* Render loop */
function loop(){
  gl.clearColor(0.043, 0.055, 0.075, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  if (positions) {
    const aspect = canvas.width / canvas.height;
    const proj = mat4Perspective(55*Math.PI/180, aspect, 0.1, 50000);
    const rot = mat4Mul(mat4RotateY(yaw), mat4RotateX(pitch));
    const view = mat4Translate(0,0,-dist);
    const mv = mat4Mul(rot, view);
    const mvp = mat4Mul(mv, proj); // NOTE: we’re using column-major order matching our helpers

    // WebGL expects column-major; our math matches that layout
    gl.uniformMatrix4fv(locMVP, false, new Float32Array(mvp));
    gl.drawArrays(gl.POINTS, 0, count);
  }
  requestAnimationFrame(loop);
}
