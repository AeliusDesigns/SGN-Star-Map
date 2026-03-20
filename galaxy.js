/* ══════════════════════════════════════════════════════════════
   SGN GALAXY MAP — WebGL Star Field + Territory Borders
   Uses the same WebGL1 rendering approach as main.js
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Constants ── */
  const GALAXY_SPREAD_X = 300;
  const GALAXY_SPREAD_Z = 140;
  const GALAXY_THICKNESS = 12;
  const BG_STAR_COUNT = 5000;
  const TERRITORY_RES = 128;
  const TERRITORY_RADIUS = 8;
  const TAG_OPTIONS = ['capital','homeworld','fortress','outpost','frontier','contested','dangerous','trade','ruins','anomaly'];

  const STAR_TYPES = [
    { id:'M', name:'M-Dwarf',   color:[1.0,0.38,0.28], weight:0.45, sizeRange:[3.5,5.0] },
    { id:'K', name:'K-Dwarf',   color:[1.0,0.65,0.25], weight:0.25, sizeRange:[4.5,6.5] },
    { id:'G', name:'G-Dwarf',   color:[1.0,0.92,0.55], weight:0.15, sizeRange:[5.5,8.0] },
    { id:'F', name:'F-Type',    color:[0.95,0.97,1.0], weight:0.07, sizeRange:[6.0,9.0] },
    { id:'A', name:'A-Type',    color:[0.7,0.8,1.0],   weight:0.04, sizeRange:[7.0,10.0] },
    { id:'B', name:'Giant',     color:[0.85,0.58,1.0],  weight:0.025, sizeRange:[9.0,14.0] },
    { id:'N', name:'Neutron',   color:[0.40,0.95,1.0],  weight:0.01, sizeRange:[3.0,4.0] },
    { id:'O', name:'O-Type',    color:[0.5,0.6,1.0],    weight:0.005, sizeRange:[10.0,16.0] },
  ];

  /* ── State ── */
  let gl, canvas;
  let systems = [], polities = [];
  let editorUnlocked = false;
  let selectedSystemIds = new Set();
  let panelSystemId = null;
  let hiddenPolities = new Set();
  let dirty = false;

  /* WebGL */
  let progBG, progBGStars, progPoints, progTerritory, progLines, progHalo;
  let bgVBO, bgStarsVBO, starsVBO, territoryQuadVBO, linesVBO, haloVBO;
  let starCount = 0, lineVertCount = 0;
  let territoryTexture = null;
  let lanes = []; // raw lane data from JSON
  let idToWorld = new Map();
  let hoveredSystemId = null;
  let selectedSystemId = null;

  /* Camera — spherical orbit */
  let yaw = 0, pitch = 0.6, camDist = 250;
  let panX = 0, panY = 0;
  let dragging = false, panning = false, dragMoved = false;
  let lx = 0, ly = 0;
  let mouseX = 0, mouseY = 0;
  let isDragSelecting = false, selStartX = 0, selStartY = 0;

  const t0 = performance.now();

  /* ── Seeded RNG ── */
  function mulberry32(a) { return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return((t^t>>>14)>>>0)/4294967296; }; }
  function hashStr(s) { let h=0; for(let i=0;i<s.length;i++) h=(Math.imul(31,h)+s.charCodeAt(i))|0; return h; }
  function pickStarType(seed) { const r=mulberry32(seed)(); let c=0; for(const t of STAR_TYPES){ c+=t.weight; if(r<c) return t; } return STAR_TYPES[0]; }

  /* ── Matrix helpers (same as main.js) ── */
  function mat4Mul(a,b){ const o=new Float32Array(16); for(let r=0;r<4;r++) for(let c=0;c<4;c++) o[r*4+c]=a[r*4+0]*b[0*4+c]+a[r*4+1]*b[1*4+c]+a[r*4+2]*b[2*4+c]+a[r*4+3]*b[3*4+c]; return o; }
  function mat4Perspective(fovy,aspect,near,far){ const f=1/Math.tan(fovy/2),nf=1/(near-far); return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,(2*far*near)*nf,0]); }
  function mat4Translate(x,y,z){ return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]); }
  function mat4RotateY(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); }
  function mat4RotateX(a){ const c=Math.cos(a),s=Math.sin(a); return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); }
  function mat4Invert(m){ const a=m,out=new Float32Array(16); const a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15]; const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32; let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06; if(!det) return null; det=1/det; out[0]=(a11*b11-a12*b10+a13*b09)*det; out[1]=(-a01*b11+a02*b10-a03*b09)*det; out[2]=(a31*b05-a32*b04+a33*b03)*det; out[3]=(-a21*b05+a22*b04-a23*b03)*det; out[4]=(-a10*b11+a12*b08-a13*b07)*det; out[5]=(a00*b11-a02*b08+a03*b07)*det; out[6]=(-a30*b05+a32*b02-a33*b01)*det; out[7]=(a20*b05-a22*b02+a23*b01)*det; out[8]=(a10*b10-a11*b08+a13*b06)*det; out[9]=(-a00*b10+a01*b08-a03*b06)*det; out[10]=(a30*b04-a31*b02+a33*b00)*det; out[11]=(-a20*b04+a21*b02-a23*b00)*det; out[12]=(-a10*b09+a11*b07-a12*b06)*det; out[13]=(a00*b09-a01*b07+a02*b06)*det; out[14]=(-a30*b03+a31*b01-a32*b00)*det; out[15]=(a20*b03-a21*b01+a22*b00)*det; return out; }
  function vec4MulMat(m,v){ const x=v[0],y=v[1],z=v[2],w=v[3]; return new Float32Array([m[0]*x+m[4]*y+m[8]*z+m[12]*w, m[1]*x+m[5]*y+m[9]*z+m[13]*w, m[2]*x+m[6]*y+m[10]*z+m[14]*w, m[3]*x+m[7]*y+m[11]*z+m[15]*w]); }

  function buildMVP(){
    const proj=mat4Perspective(55*Math.PI/180, canvas.width/canvas.height, 0.1, 50000);
    const rot=mat4Mul(mat4RotateY(yaw), mat4RotateX(pitch));
    const view=mat4Translate(-panX, -panY, -camDist);
    return mat4Mul(rot, mat4Mul(view, proj));
  }

  /* ── Shader compilation (WebGL1, matching main.js) ── */
  function compile(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){ console.error(gl.getShaderInfoLog(s)); return null; } return s; }
  function makeProgram(vs,fs){ const p=gl.createProgram(); gl.attachShader(p,compile(gl.VERTEX_SHADER,vs)); gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs)); gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p)); return p; }

  /* ── SHADERS (WebGL1, matching main.js exactly) ── */

  /* Nebula backdrop — same as main.js FS_BG */
  const VS_BG = `
attribute vec2 position;
varying vec2 vUV;
void main(){ vUV=position*0.5+0.5; gl_Position=vec4(position,0.0,1.0); }`;

  const FS_BG = `
precision highp float;
varying vec2 vUV;
uniform float uTime;
uniform vec2 uRes;
uniform vec3 uPan;
uniform float uZoom;
uniform vec2 uRot;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; mat2 rot=mat2(0.8,-0.6,0.6,0.8); for(int i=0;i<6;i++){ v+=a*noise(p); p=rot*p*2.0; a*=0.5; } return v; }
void main(){
  vec2 uv=vUV;
  vec2 aspect=vec2(uRes.x/uRes.y,1.0);
  vec2 off=uPan.xy*0.0002+uRot*0.3;
  vec2 p=(uv-0.5)*aspect*2.5+off;
  float n1=fbm(p*0.7+uTime*0.003);
  float n2=fbm(p*1.4+vec2(5.0,3.0)+uTime*0.005);
  float n3=fbm(p*2.8+vec2(10.0,7.0));
  float n4=fbm(p*0.4+vec2(-3.0,8.0)+uTime*0.002);
  vec3 col=vec3(0.012,0.018,0.045);
  col+=vec3(0.006,0.025,0.05)*smoothstep(0.35,0.75,n1);
  col+=vec3(0.01,0.03,0.04)*smoothstep(0.45,0.85,n2)*0.4;
  col+=vec3(0.025,0.006,0.04)*smoothstep(0.55,0.9,n3)*0.25;
  col+=vec3(0.004,0.01,0.03)*smoothstep(0.25,0.65,n4)*0.3;
  float fog=1.0-0.35*length((uv-0.5)*1.3);
  col*=fog;
  gl_FragColor=vec4(col,1.0);
}`;

  /* 3D Background stars — same as main.js VS_BGSTARS/FS_BGSTARS */
  const VS_BGSTARS = `
attribute vec3 position;
attribute vec3 aColor;
attribute float aSize;
uniform mat4 uMVP;
uniform float uTime;
varying vec3 vColor;
varying float vTwinkle;
void main(){
  gl_Position=uMVP*vec4(position,1.0);
  float dist=gl_Position.w;
  gl_PointSize=aSize*(900.0/dist);
  gl_PointSize=clamp(gl_PointSize,1.5,18.0);
  vColor=aColor;
  float id=dot(position.xy,vec2(127.1,311.7));
  vTwinkle=0.6+0.4*sin(uTime*(1.0+fract(sin(id)*43758.5)*3.0)+id);
}`;

  const FS_BGSTARS = `
precision highp float;
varying vec3 vColor;
varying float vTwinkle;
void main(){
  vec2 uv=gl_PointCoord*2.0-1.0;
  float r=length(uv);
  float core=exp(-r*r*16.0);
  float inner=exp(-r*r*4.0)*0.5;
  float outer=exp(-r*r*1.5)*0.25;
  float spike=0.0;
  spike+=exp(-pow(abs(uv.x),0.8)*60.0)*exp(-r*2.0)*0.2;
  spike+=exp(-pow(abs(uv.y),0.8)*60.0)*exp(-r*2.0)*0.2;
  float alpha=clamp((core+inner+outer+spike)*vTwinkle,0.0,1.0);
  vec3 white=vec3(1.0,0.98,0.94);
  vec3 col=mix(vColor,white,core*0.8)*(1.0+core*1.5);
  col+=vColor*outer*2.0;
  gl_FragColor=vec4(col,alpha);
}`;

  /* Galaxy star points — same as main.js FS_POINTS */
  const VS_POINTS = `
attribute vec3 position;
attribute vec3 aColor;
attribute float aSize;
uniform mat4 uMVP;
varying vec3 vColor;
void main(){
  gl_Position=uMVP*vec4(position,1.0);
  gl_PointSize=aSize;
  vColor=aColor;
}`;

  const FS_POINTS = `
precision highp float;
varying vec3 vColor;
void main(){
  vec2 uv=gl_PointCoord*2.0-1.0;
  float r=length(uv);
  float core=exp(-r*r*22.0);
  float inner=exp(-r*r*5.0)*0.5;
  float outer=exp(-r*r*1.5)*0.18;
  float spike=0.0;
  spike+=exp(-pow(abs(uv.x),0.8)*80.0)*exp(-r*2.0)*0.25;
  spike+=exp(-pow(abs(uv.y),0.8)*80.0)*exp(-r*2.0)*0.25;
  float alpha=clamp(core+inner+outer+spike,0.0,1.0);
  vec3 white=vec3(1.0,0.98,0.94);
  vec3 col=mix(vColor,white,core*0.8)*(1.0+core*2.0);
  col+=vColor*outer*2.0;
  gl_FragColor=vec4(col,alpha);
}`;

  /* Territory overlay — textured quad on XZ plane */
  const VS_TERR = `
attribute vec3 position;
attribute vec2 aUV;
uniform mat4 uMVP;
varying vec2 vUV;
void main(){ gl_Position=uMVP*vec4(position,1.0); vUV=aUV; }`;

  const FS_TERR = `
precision highp float;
uniform sampler2D uTex;
uniform float uTime;
varying vec2 vUV;
void main(){
  vec4 t=texture2D(uTex,vUV);
  if(t.a<0.01) discard;
  vec2 tx=1.0/vec2(128.0);
  float aL=texture2D(uTex,vUV+vec2(-tx.x*2.0,0.0)).a;
  float aR=texture2D(uTex,vUV+vec2(tx.x*2.0,0.0)).a;
  float aU=texture2D(uTex,vUV+vec2(0.0,tx.y*2.0)).a;
  float aD=texture2D(uTex,vUV+vec2(0.0,-tx.y*2.0)).a;
  float edge=clamp(1.0-min(min(aL,aR),min(aU,aD)),0.0,1.0);
  float fill=t.a*0.10;
  float edgeGlow=edge*t.a*0.45;
  float alpha=fill+edgeGlow;
  if(t.a<0.45){ float hatch=sin((vUV.x+vUV.y)*200.0+uTime*2.0)*0.5+0.5; alpha*=0.5+hatch*0.5; }
  gl_FragColor=vec4(t.rgb,alpha);
}`;

  /* Lane lines — same as main.js */
  const VS_LINES = `
attribute vec3 position;
uniform mat4 uMVP;
void main(){ gl_Position=uMVP*vec4(position,1.0); }`;

  const FS_LINES = `
precision mediump float;
uniform vec4 uColor;
void main(){ gl_FragColor=uColor; }`;

  /* Halo / targeting reticle — same as main.js */
  const VS_HALO = `
attribute vec3 position;
uniform mat4 uMVP;
uniform float uPixelSize;
void main(){
  gl_Position=uMVP*vec4(position,1.0);
  gl_PointSize=uPixelSize;
}`;

  const FS_HALO = `
precision highp float;
uniform float uTime;
uniform vec3 uColGlow;
uniform vec3 uColCore;
uniform float uMode;
void main(){
  vec2 uv=gl_PointCoord*2.0-1.0;
  float r=length(uv);
  float ang=atan(uv.y,uv.x);
  float PI=3.14159265;
  float alpha=0.0;
  vec3 col=mix(uColGlow,uColCore,0.3);

  float glow=exp(-r*r*3.5)*0.3;
  alpha+=glow;

  float outerR=0.78;
  float outerW=0.05;
  float outerBand=smoothstep(outerR-outerW,outerR-outerW*0.5,r)*(1.0-smoothstep(outerR+outerW*0.5,outerR+outerW,r));
  float rotAng=ang+uTime*0.35;
  float seg=mod(rotAng+PI,PI/3.0)/(PI/3.0);
  float arcMask=smoothstep(0.06,0.14,seg)*(1.0-smoothstep(0.86,0.94,seg));
  alpha+=outerBand*arcMask*1.0;
  float outerGlow=exp(-pow(abs(r-outerR),2.0)*120.0)*0.5;
  alpha+=outerGlow*arcMask;
  col+=uColCore*outerGlow*arcMask*0.3;

  float innerR=0.48;
  float innerW=0.035;
  float innerBand=smoothstep(innerR-innerW,innerR-innerW*0.3,r)*(1.0-smoothstep(innerR+innerW*0.3,innerR+innerW,r));
  alpha+=innerBand*1.0;
  float innerGlow=exp(-pow(abs(r-innerR),2.0)*80.0)*0.4;
  alpha+=innerGlow;

  float sweep=mod(ang+uTime*1.2,PI*2.0);
  float sweepArc=exp(-pow(sweep-0.5,2.0)*8.0);
  float sweepR=smoothstep(innerR-0.08,innerR,r)*(1.0-smoothstep(outerR,outerR+0.08,r));
  alpha+=sweepArc*sweepR*0.5;
  col+=uColCore*sweepArc*sweepR*0.4;

  for(int i=0;i<4;i++){
    float tickAng=float(i)*PI*0.5;
    float da=abs(mod(ang-tickAng+PI,PI*2.0)-PI);
    float tick=exp(-da*da*800.0);
    float tickR=smoothstep(outerR+outerW*0.5,outerR+outerW,r)*(1.0-smoothstep(outerR+outerW+0.08,outerR+outerW+0.12,r));
    alpha+=tick*tickR*1.2;
    col+=uColCore*tick*tickR*0.3;
  }

  if(uMode>0.5){
    for(int i=0;i<4;i++){
      float dAng=float(i)*PI*0.5+PI*0.25;
      float da=abs(mod(ang-dAng+PI,PI*2.0)-PI);
      float bracket=exp(-da*da*400.0);
      float bracketR=smoothstep(outerR+outerW,outerR+outerW+0.01,r)*(1.0-smoothstep(outerR+outerW+0.06,outerR+outerW+0.09,r));
      alpha+=bracket*bracketR*1.0;
      col+=uColCore*bracket*bracketR*0.2;
    }
    float fill=smoothstep(innerR+innerW,innerR+innerW+0.02,r)*(1.0-smoothstep(outerR-outerW-0.02,outerR-outerW,r));
    float pulse=0.12+0.08*sin(uTime*2.5);
    alpha+=fill*pulse;
    alpha*=0.9+0.1*sin(uTime*2.0);
  }

  float pip=exp(-r*r*60.0)*0.5;
  alpha+=pip;
  col+=vec3(1.0)*pip*0.3;

  gl_FragColor=vec4(col,clamp(alpha,0.0,1.0));
}`;

  /* ── Supermassive Black Hole shader ── */
  /* Rendered as a large GL_POINT. The fragment shader fakes:
     - Dark shadow (event horizon)
     - Photon ring / Einstein ring (bright thin ring from lensed light)
     - Accretion disc (hot material orbiting, doppler-shifted)
     - Gravitational lensing distortion of nearby stars (glow warping)
     All purely analytical in the fragment shader — no raymarching. */

  const VS_BLACKHOLE = `
attribute vec3 position;
uniform mat4 uMVP;
uniform float uPixelSize;
void main(){
  gl_Position = uMVP * vec4(position, 1.0);
  gl_PointSize = uPixelSize;
}`;

  const FS_BLACKHOLE = `
precision highp float;
uniform float uTime;
uniform float uPixelSize;

void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r = length(uv);
  float ang = atan(uv.y, uv.x);
  float PI = 3.14159265;

  /* ── Radii (normalized to point size) ── */
  float shadowR = 0.12;       /* event horizon */
  float photonR = 0.16;       /* photon sphere */
  float iscoR   = 0.24;       /* innermost stable orbit */
  float discOuter = 0.55;     /* accretion disc outer edge */

  /* ── Event horizon: pure black ── */
  float shadow = 1.0 - smoothstep(shadowR - 0.01, shadowR + 0.01, r);

  /* ── Photon ring: thin bright ring of lensed light ── */
  float photonRing = exp(-pow((r - photonR) / 0.012, 2.0)) * 1.8;
  /* Slight flicker from turbulent lensing */
  photonRing *= 0.9 + 0.1 * sin(ang * 6.0 + uTime * 3.0);

  /* ── Accretion disc: hot material with doppler shift ── */
  /* Disc is viewed at an angle, so it appears as an elliptical band.
     We fake this with a vertically compressed coordinate. */
  vec2 discUV = vec2(uv.x, uv.y * 2.2); /* tilt compression */
  float discR = length(discUV);
  float discAng = atan(discUV.y, discUV.x);

  /* Disc band: between ISCO and outer edge */
  float discMask = smoothstep(iscoR - 0.02, iscoR + 0.02, discR)
                 * (1.0 - smoothstep(discOuter - 0.04, discOuter + 0.02, discR));

  /* Temperature gradient: hotter near center (bluer white), cooler outside (orange) */
  float tempT = smoothstep(iscoR, discOuter, discR);
  vec3 hotColor  = vec3(0.85, 0.9, 1.0);    /* blue-white near ISCO */
  vec3 warmColor = vec3(1.0, 0.65, 0.25);    /* orange at outer disc */
  vec3 coolColor = vec3(0.6, 0.2, 0.05);     /* dim red at very edge */
  vec3 discColor = mix(hotColor, warmColor, smoothstep(0.0, 0.6, tempT));
  discColor = mix(discColor, coolColor, smoothstep(0.6, 1.0, tempT));

  /* Orbital structure: spiral arms in the disc */
  float spiral = sin(discAng * 3.0 - discR * 25.0 + uTime * 1.2) * 0.5 + 0.5;
  float turbulence = sin(discAng * 7.0 + discR * 40.0 - uTime * 2.5) * 0.3 + 0.7;
  float discBright = discMask * (0.5 + spiral * 0.3) * turbulence;

  /* Doppler beaming: approaching side brighter, receding dimmer */
  float doppler = 0.7 + 0.3 * sin(discAng - uTime * 0.8);
  discBright *= doppler;

  /* Disc should be BEHIND the shadow */
  discBright *= (1.0 - shadow);

  /* ── Gravitational lensing glow: light bent around the hole ── */
  /* Creates a soft bright halo just outside the photon ring */
  float lensGlow = exp(-pow((r - photonR * 1.5) / 0.08, 2.0)) * 0.35;
  lensGlow += exp(-pow((r - photonR * 2.5) / 0.15, 2.0)) * 0.12;
  /* The lensing also creates a secondary image (Einstein ring) at ~2x photon radius */
  float einsteinRing = exp(-pow((r - photonR * 2.0) / 0.018, 2.0)) * 0.5;
  einsteinRing *= 0.85 + 0.15 * sin(ang * 4.0 - uTime * 1.5);

  /* ── Compose ── */
  vec3 col = vec3(0.0);

  /* Accretion disc */
  col += discColor * discBright * 0.9;

  /* Photon ring (white-blue) */
  col += vec3(0.8, 0.88, 1.0) * photonRing * (1.0 - shadow);

  /* Einstein ring (subtle warm from lensed disc light) */
  col += vec3(0.9, 0.75, 0.5) * einsteinRing * (1.0 - shadow);

  /* Lensing glow (very subtle blue) */
  col += vec3(0.3, 0.45, 0.7) * lensGlow * (1.0 - shadow);

  /* Very faint outer gravitational influence halo */
  float outerHalo = exp(-r * r * 2.0) * 0.06;
  col += vec3(0.2, 0.3, 0.5) * outerHalo;

  /* Event horizon kills everything inside */
  col *= (1.0 - shadow);

  /* Alpha: visible where there's any light, plus the black shadow region */
  float alpha = clamp(shadow * 0.95 + discBright + photonRing + einsteinRing * 0.8 + lensGlow + outerHalo, 0.0, 1.0);

  /* Fade out at edges of point */
  alpha *= 1.0 - smoothstep(0.7, 1.0, r);

  if(alpha < 0.003) discard;

  gl_FragColor = vec4(col, alpha);
}`;

  /* Black hole positions (normalized coords from density analysis) */
  const BLACK_HOLES = [
    { xn: 0.33, yn: 0.485, label: 'Sagittarius A* analog' },
    { xn: 0.675, yn: 0.44,  label: 'Sagittarius A* analog' },
  ];
  let blackHoleWorldPos = [];
  let blackHoleVBO = null;

  /* ── World position from normalized coords ── */
  /* Uses smooth spatial noise for Y so nearby systems have coherent heights.
     This prevents lanes from zigzagging wildly between connected systems. */
  function smoothNoise2D(x, y) {
    /* Simple value noise with smooth interpolation */
    function hash2(ix, iy) {
      let h = ix * 374761393 + iy * 668265263;
      h = (h ^ (h >> 13)) * 1274126177;
      return ((h ^ (h >> 16)) >>> 0) / 4294967296;
    }
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    /* Smoothstep interpolation */
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const v00 = hash2(ix, iy), v10 = hash2(ix + 1, iy);
    const v01 = hash2(ix, iy + 1), v11 = hash2(ix + 1, iy + 1);
    const a = v00 + (v10 - v00) * sx;
    const b = v01 + (v11 - v01) * sx;
    return a + (b - a) * sy;
  }

  function systemToWorld(sys){
    const x = (sys.coords.x_norm - 0.5) * GALAXY_SPREAD_X;
    const z = (sys.coords.y_norm - 0.5) * GALAXY_SPREAD_Z;

    /* Distance from center for disc taper (thicker core, thinner rim) */
    const dc = Math.sqrt(((sys.coords.x_norm - 0.5) * 2) ** 2 + ((sys.coords.y_norm - 0.5) * 2) ** 2);
    const thick = Math.max(0, 1.0 - dc * 0.7);

    /* Smooth spatial noise: sample at a scale where nearby systems correlate.
       Two octaves for subtle variation without the random zigzag. */
    const nx = sys.coords.x_norm * 8;  /* ~8 cells across the galaxy */
    const nz = sys.coords.y_norm * 8;
    const n1 = smoothNoise2D(nx, nz);
    const n2 = smoothNoise2D(nx * 2.3 + 5.7, nz * 2.3 + 3.1) * 0.4;
    const noiseVal = (n1 + n2) / 1.4;  /* normalized 0-1 */

    /* Small per-system jitter so co-located stars aren't perfectly flat */
    const rng = mulberry32(hashStr(sys.id) + 77777);
    const jitter = (rng() * 2 - 1) * 0.6;

    const y = ((noiseVal * 2 - 1) * GALAXY_THICKNESS * 0.35 + jitter) * thick;
    return [x, y, z];
  }

  /* ── Init WebGL ── */
  function initGL(){
    canvas=document.getElementById('gl');
    gl=canvas.getContext('webgl',{antialias:true});
    if(!gl){ gl=canvas.getContext('experimental-webgl'); }
    if(!gl){ alert('WebGL not supported'); return false; }
    return true;
  }

  function resize(){
    canvas.width=Math.floor(innerWidth);
    canvas.height=Math.floor(innerHeight);
    canvas.style.width=innerWidth+'px';
    canvas.style.height=innerHeight+'px';
    gl.viewport(0,0,canvas.width,canvas.height);
  }

  /* ── Build background star geometry (same approach as main.js) ── */
  function buildBGStars(){
    const data=new Float32Array(BG_STAR_COUNT*7);
    for(let i=0;i<BG_STAR_COUNT;i++){
      const off=i*7;
      const theta=Math.random()*Math.PI*2;
      const phi=Math.acos(2*Math.random()-1);
      const r=2000+Math.random()*13000;
      data[off]=r*Math.sin(phi)*Math.cos(theta);
      data[off+1]=r*Math.sin(phi)*Math.sin(theta);
      data[off+2]=r*Math.cos(phi);
      const temp=Math.random();
      if(temp<0.6){ data[off+3]=0.7+Math.random()*0.3; data[off+4]=0.75+Math.random()*0.25; data[off+5]=0.85+Math.random()*0.15; }
      else if(temp<0.85){ data[off+3]=0.9+Math.random()*0.1; data[off+4]=0.8+Math.random()*0.15; data[off+5]=0.6+Math.random()*0.2; }
      else { data[off+3]=0.4+Math.random()*0.3; data[off+4]=0.6+Math.random()*0.3; data[off+5]=0.8+Math.random()*0.2; }
      data[off+6]=Math.random()<0.9 ? 2+Math.random()*4 : 5+Math.random()*8;
    }
    bgStarsVBO=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,bgStarsVBO);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  }

  /* ── Build galaxy star VBO ── */
  function rebuildStarsVBO(){
    const dpr=window.devicePixelRatio||1;
    const verts=[];
    for(const sys of systems){
      const p=sys._worldPos; if(!p) continue;
      const st=STAR_TYPES.find(t=>t.id===sys.starType)||STAR_TYPES[0];
      const rng=mulberry32(hashStr(sys.id)+9999);
      const sz=st.sizeRange[0]+rng()*(st.sizeRange[1]-st.sizeRange[0]);
      verts.push(p[0],p[1],p[2], st.color[0],st.color[1],st.color[2], sz*dpr);
    }
    starCount=verts.length/7;
    if(!starsVBO) starsVBO=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,starsVBO);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
  }

  /* ── Build lane lines VBO ── */
  function rebuildLinesVBO(){
    const verts=[];
    for(const lane of lanes){
      const sysA=idToWorld.get(lane.from), sysB=idToWorld.get(lane.to);
      if(!sysA||!sysB) continue;
      verts.push(sysA[0],sysA[1],sysA[2], sysB[0],sysB[1],sysB[2]);
    }
    lineVertCount=verts.length/3;
    if(!linesVBO) linesVBO=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,linesVBO);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
  }

  /* ── Territory texture ── */
  function hexToRgb(hex){ const h=hex.replace('#',''); return [parseInt(h.substring(0,2),16),parseInt(h.substring(2,4),16),parseInt(h.substring(4,6),16)]; }

  function buildTerritoryTexture(){
    const res=TERRITORY_RES;
    const data=new Uint8Array(res*res*4);
    for(let gy=0;gy<res;gy++){
      for(let gx=0;gx<res;gx++){
        const wx=(gx/res-0.5)*GALAXY_SPREAD_X;
        const wz=(gy/res-0.5)*GALAXY_SPREAD_Z;
        const influence={};
        let maxInf=0, maxPol=null, secInf=0, secPol=null;
        for(const sys of systems){
          if(!sys.owner||sys.owner==='unassigned') continue;
          if(hiddenPolities.has(sys.owner)) continue;
          const dx=sys._worldPos[0]-wx, dz=sys._worldPos[2]-wz;
          const dist=Math.sqrt(dx*dx+dz*dz);
          if(dist<TERRITORY_RADIUS){
            const inf=Math.max(0,1-dist/TERRITORY_RADIUS); const sq=inf*inf;
            if(!influence[sys.owner]) influence[sys.owner]=0;
            influence[sys.owner]+=sq;
          }
        }
        for(const [pid,inf] of Object.entries(influence)){
          if(inf>maxInf){ secPol=maxPol; secInf=maxInf; maxPol=pid; maxInf=inf; }
          else if(inf>secInf){ secPol=pid; secInf=inf; }
        }
        const idx=(gy*res+gx)*4;
        if(maxPol&&maxInf>0.05){
          const pol=polities.find(p=>p.id===maxPol);
          if(pol){
            const contested=secPol&&secInf>maxInf*0.5;
            if(contested){
              const pol2=polities.find(p=>p.id===secPol);
              if(pol2){ const c=hexToRgb(pol.color),c2=hexToRgb(pol2.color); data[idx]=Math.round((c[0]+c2[0])/2); data[idx+1]=Math.round((c[1]+c2[1])/2); data[idx+2]=Math.round((c[2]+c2[2])/2); data[idx+3]=Math.round(Math.min(maxInf,1)*100); }
            } else {
              const c=hexToRgb(pol.color); data[idx]=c[0]; data[idx+1]=c[1]; data[idx+2]=c[2]; data[idx+3]=Math.round(Math.min(maxInf,1)*200+55);
            }
          }
        }
      }
    }
    /* Gaussian blur */
    const kernel=[1,4,6,4,1], kSum=16, kR=2;
    const temp=new Uint8Array(data.length);
    for(let y=0;y<res;y++) for(let x=0;x<res;x++){
      let r=0,g=0,b=0,a=0;
      for(let k=-kR;k<=kR;k++){ const sx=Math.max(0,Math.min(res-1,x+k)); const i=(y*res+sx)*4; const w=kernel[k+kR]; r+=data[i]*w; g+=data[i+1]*w; b+=data[i+2]*w; a+=data[i+3]*w; }
      const i=(y*res+x)*4; temp[i]=r/kSum; temp[i+1]=g/kSum; temp[i+2]=b/kSum; temp[i+3]=a/kSum;
    }
    const out=new Uint8Array(data.length);
    for(let y=0;y<res;y++) for(let x=0;x<res;x++){
      let r=0,g=0,b=0,a=0;
      for(let k=-kR;k<=kR;k++){ const sy=Math.max(0,Math.min(res-1,y+k)); const i=(sy*res+x)*4; const w=kernel[k+kR]; r+=temp[i]*w; g+=temp[i+1]*w; b+=temp[i+2]*w; a+=temp[i+3]*w; }
      const i=(y*res+x)*4; out[i]=r/kSum; out[i+1]=g/kSum; out[i+2]=b/kSum; out[i+3]=a/kSum;
    }
    if(!territoryTexture) territoryTexture=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,territoryTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,res,res,0,gl.RGBA,gl.UNSIGNED_BYTE,out);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  }

  function buildTerritoryQuad(){
    const hx=GALAXY_SPREAD_X/2+20, hz=GALAXY_SPREAD_Z/2+20, y=-0.5;
    const v=new Float32Array([ -hx,y,-hz,0,0, hx,y,-hz,1,0, hx,y,hz,1,1, -hx,y,-hz,0,0, hx,y,hz,1,1, -hx,y,hz,0,1 ]);
    territoryQuadVBO=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,territoryQuadVBO);
    gl.bufferData(gl.ARRAY_BUFFER,v,gl.STATIC_DRAW);
  }

  let territoryTimer=null;
  function rebuildTerritoryThrottled(){
    clearTimeout(territoryTimer);
    territoryTimer=setTimeout(()=>buildTerritoryTexture(),200);
  }

  /* ── Projection helpers ── */
  function projectToScreen(x,y,z,mvp){
    const cx=x*mvp[0]+y*mvp[4]+z*mvp[8]+mvp[12], cy=x*mvp[1]+y*mvp[5]+z*mvp[9]+mvp[13], cw=x*mvp[3]+y*mvp[7]+z*mvp[11]+mvp[15];
    if(!cw) return null;
    return [ Math.round((cx/cw*0.5+0.5)*canvas.width), Math.round((-cy/cw*0.5+0.5)*canvas.height) ];
  }

  function findSystemAtScreen(sx,sy,maxDist){
    maxDist=maxDist||32;
    const mx=sx*(canvas.width/canvas.clientWidth), my=sy*(canvas.height/canvas.clientHeight);
    const r2=maxDist*maxDist; let best=null,bestD=r2;
    const mvp=buildMVP();
    for(const sys of systems){
      const sp=projectToScreen(sys._worldPos[0],sys._worldPos[1],sys._worldPos[2],mvp); if(!sp) continue;
      const d2=(sp[0]-mx)**2+(sp[1]-my)**2;
      if(d2<bestD){ bestD=d2; best=sys; }
    }
    return best;
  }

  function findSystemsInRect(x1,y1,x2,y2){
    const mvp=buildMVP();
    const left=Math.min(x1,x2)*(canvas.width/canvas.clientWidth), right=Math.max(x1,x2)*(canvas.width/canvas.clientWidth);
    const top=Math.min(y1,y2)*(canvas.height/canvas.clientHeight), bottom=Math.max(y1,y2)*(canvas.height/canvas.clientHeight);
    const found=[];
    for(const sys of systems){
      const sp=projectToScreen(sys._worldPos[0],sys._worldPos[1],sys._worldPos[2],mvp); if(!sp) continue;
      if(sp[0]>=left&&sp[0]<=right&&sp[1]>=top&&sp[1]<=bottom) found.push(sys);
    }
    return found;
  }

  /* ── Toast ── */
  let toastTimer=null;
  function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2500); }

  /* ── Save / Load ── */
  function saveToLS(){
    const data={ polities, systems:systems.map(s=>({id:s.id,name:s.name,owner:s.owner,starType:s.starType,tags:s.tags||[],coords:s.coords,pixel:s.pixel,source:s.source})), hiddenPolities:[...hiddenPolities] };
    try{ localStorage.setItem('sgn-galaxy-data',JSON.stringify(data)); }catch(e){}
  }

  function loadFromLS(){
    try{
      const raw=localStorage.getItem('sgn-galaxy-data'); if(!raw) return false;
      const data=JSON.parse(raw);
      if(data.polities) polities=data.polities;
      if(data.hiddenPolities) hiddenPolities=new Set(data.hiddenPolities);
      if(data.systems&&data.systems.length===systems.length){
        const map={}; for(const s of data.systems) map[s.id]=s;
        for(const sys of systems){ const sv=map[sys.id]; if(sv){ sys.name=sv.name||sys.name; sys.owner=sv.owner||'unassigned'; sys.starType=sv.starType||sys.starType; sys.tags=sv.tags||[]; } }
      }
      return true;
    }catch(e){ return false; }
  }

  function markDirty(){ dirty=true; saveToLS(); }

  /* ── Editor Auth ── */
  let _editorPW=null;
  (async function(){ try{ const r=await fetch('./editor.json',{cache:'no-store'}); if(r.ok){ const d=await r.json(); if(typeof d.pw==='string'&&d.pw.length) _editorPW=d.pw; } }catch{} })();

  function requireEditor(){
    if(editorUnlocked) return true;
    if(_editorPW===null){ alert('Editor not available.'); return false; }
    const pw=prompt('Enter editor password:');
    if(pw===_editorPW){ editorUnlocked=true; sessionStorage.setItem('galaxy_editor_ok','1'); updateEditorLock(); return true; }
    alert('Incorrect password.'); return false;
  }

  if(sessionStorage.getItem('galaxy_editor_ok')==='1') editorUnlocked=true;

  function updateEditorLock(){
    const el=document.getElementById('editor-lock');
    if(editorUnlocked){ el.className='unlocked'; el.innerHTML='&#x1F513; EDITOR'; }
    else { el.className='locked'; el.innerHTML='&#x1F512; LOCKED'; }
    updateLegend(); refreshBulkPolityOptions();
  }

  document.getElementById('editor-lock').addEventListener('click',()=>{
    if(editorUnlocked){ editorUnlocked=false; sessionStorage.removeItem('galaxy_editor_ok'); updateEditorLock(); return; }
    requireEditor();
  });

  /* ── Side Panel ── */
  function openSystemPanel(sysId){
    const sys=systems.find(s=>s.id===sysId); if(!sys) return;
    panelSystemId=sysId;
    const st=STAR_TYPES.find(t=>t.id===sys.starType)||STAR_TYPES[0];
    const pol=polities.find(p=>p.id===sys.owner);
    const tags=sys.tags||[];
    const body=document.getElementById('sp-body');
    document.getElementById('panel-title').textContent=sys.name||sys.id;
    body.innerHTML=`
      <div class="meta-row"><span class="mk">ID</span><span class="mv hi">${sys.id}</span></div>
      <div class="field-group"><label class="fl">Name</label><input type="text" class="sci-input" id="edit-name" value="${sys.name||''}" ${editorUnlocked?'':'disabled'}></div>
      <div class="field-group"><label class="fl">Star Type</label><select class="sci-select" id="edit-star" ${editorUnlocked?'':'disabled'}>${STAR_TYPES.map(t=>`<option value="${t.id}" ${t.id===sys.starType?'selected':''}>${t.name}</option>`).join('')}</select></div>
      <div class="field-group"><label class="fl">Polity</label><select class="sci-select" id="edit-polity" ${editorUnlocked?'':'disabled'}><option value="unassigned" ${(!sys.owner||sys.owner==='unassigned')?'selected':''}>Unassigned</option>${polities.map(p=>`<option value="${p.id}" ${sys.owner===p.id?'selected':''}>${p.name}</option>`).join('')}</select></div>
      <div class="field-group"><label class="fl">Tags</label>
        <div class="tag-container" id="tag-container">${tags.map(tag=>`<span class="tag-chip ${tag}">${tag}${editorUnlocked?` <span class="tag-remove" data-tag="${tag}">&#x2715;</span>`:''}</span>`).join('')}</div>
        ${editorUnlocked?`<select class="sci-select" id="add-tag-select" style="margin-top:8px;font-size:12px;"><option value="">Add tag...</option>${TAG_OPTIONS.filter(t=>!tags.includes(t)).map(t=>`<option value="${t}">${t}</option>`).join('')}</select>`:''}
      </div>
      <div class="meta-row"><span class="mk">Coords</span><span class="mv" style="font-size:12px;color:var(--text-muted);">X: ${sys.coords.x_norm.toFixed(4)} Y: ${sys.coords.y_norm.toFixed(4)}</span></div>
    `;
    if(editorUnlocked){
      body.querySelector('#edit-name').addEventListener('change',e=>{ sys.name=e.target.value; document.getElementById('panel-title').textContent=sys.name; markDirty(); });
      body.querySelector('#edit-star').addEventListener('change',e=>{ sys.starType=e.target.value; rebuildStarsVBO(); markDirty(); });
      body.querySelector('#edit-polity').addEventListener('change',e=>{ sys.owner=e.target.value; rebuildTerritoryThrottled(); updateLegend(); markDirty(); });
      const addTag=body.querySelector('#add-tag-select');
      if(addTag) addTag.addEventListener('change',e=>{ if(e.target.value){ if(!sys.tags) sys.tags=[]; if(!sys.tags.includes(e.target.value)){ sys.tags.push(e.target.value); openSystemPanel(sysId); markDirty(); } } });
      body.querySelectorAll('.tag-remove').forEach(btn=>btn.addEventListener('click',()=>{ sys.tags=(sys.tags||[]).filter(t=>t!==btn.dataset.tag); openSystemPanel(sysId); markDirty(); }));
    }
    document.getElementById('sidePanel').style.transform='translateX(0)';
  }

  function closePanel(){ panelSystemId=null; document.getElementById('sidePanel').style.transform='translateX(100%)'; }
  document.getElementById('panel-close').onclick=closePanel;

  /* ── Legend ── */
  function updateLegend(){
    const list=document.getElementById('legend-list');
    const counts={};
    for(const sys of systems) if(sys.owner&&sys.owner!=='unassigned') counts[sys.owner]=(counts[sys.owner]||0)+1;
    const unassigned=systems.filter(s=>!s.owner||s.owner==='unassigned').length;
    list.innerHTML=polities.map(p=>{
      const hidden=hiddenPolities.has(p.id);
      return `<div class="legend-item ${hidden?'hidden-polity':''}" data-polity="${p.id}"><div class="legend-swatch" style="background:${p.color};"></div><span class="legend-name">${p.name}</span><span class="legend-count">${counts[p.id]||0}</span>${editorUnlocked?`<span class="legend-delete" data-polity="${p.id}">&#x2715;</span>`:''}</div>`;
    }).join('')+`<div class="legend-item" style="opacity:0.4;margin-top:6px;"><div class="legend-swatch" style="background:#333;"></div><span class="legend-name">Unassigned</span><span class="legend-count">${unassigned}</span></div>`;

    list.querySelectorAll('.legend-item[data-polity]').forEach(item=>{
      item.addEventListener('click',e=>{
        if(e.target.classList.contains('legend-delete')) return;
        const pid=item.dataset.polity;
        if(hiddenPolities.has(pid)) hiddenPolities.delete(pid); else hiddenPolities.add(pid);
        item.classList.toggle('hidden-polity');
        rebuildTerritoryThrottled();
      });
    });

    list.querySelectorAll('.legend-delete').forEach(btn=>btn.addEventListener('click',e=>{
      e.stopPropagation();
      const pid=btn.dataset.polity;
      if(confirm(`Delete polity "${polities.find(p=>p.id===pid)?.name}"?`)){
        for(const sys of systems) if(sys.owner===pid) sys.owner='unassigned';
        polities=polities.filter(p=>p.id!==pid);
        updateLegend(); refreshBulkPolityOptions(); rebuildTerritoryThrottled(); markDirty();
      }
    }));

    document.getElementById('sb-polities').textContent=`${polities.length} POLITIES`;
  }

  /* ── Polity Modal ── */
  document.getElementById('add-polity-btn').addEventListener('click',()=>{
    if(!editorUnlocked){ if(!requireEditor()) return; }
    document.getElementById('polity-name-input').value='';
    document.getElementById('polity-color-input').value='#38e8ff';
    document.getElementById('polity-desc-input').value='';
    document.getElementById('polity-modal').classList.add('open');
  });
  document.getElementById('modal-cancel').addEventListener('click',()=>document.getElementById('polity-modal').classList.remove('open'));
  document.getElementById('modal-confirm').addEventListener('click',()=>{
    const name=document.getElementById('polity-name-input').value.trim();
    const color=document.getElementById('polity-color-input').value;
    const desc=document.getElementById('polity-desc-input').value.trim();
    if(!name){ showToast('Name required'); return; }
    polities.push({id:'POL-'+Date.now().toString(36).toUpperCase(), name, color, description:desc});
    document.getElementById('polity-modal').classList.remove('open');
    updateLegend(); refreshBulkPolityOptions(); showToast(`Created: ${name}`); markDirty();
  });

  /* ── Bulk Selection ── */
  function updateBulkBar(){
    const bar=document.getElementById('bulk-bar');
    const n=selectedSystemIds.size;
    if(n>1&&editorUnlocked){ bar.classList.add('visible'); document.getElementById('bulk-count').textContent=`${n} SELECTED`; }
    else bar.classList.remove('visible');
  }
  function refreshBulkPolityOptions(){
    const sel=document.getElementById('bulk-polity-select');
    sel.innerHTML='<option value="">Assign polity...</option>'+polities.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')+'<option value="unassigned">Unassigned</option>';
  }
  document.getElementById('bulk-assign-btn').addEventListener('click',()=>{
    const pid=document.getElementById('bulk-polity-select').value; if(!pid) return;
    for(const id of selectedSystemIds){ const sys=systems.find(s=>s.id===id); if(sys) sys.owner=pid; }
    rebuildTerritoryThrottled(); updateLegend(); showToast(`Assigned ${selectedSystemIds.size} systems`); markDirty();
  });
  document.getElementById('bulk-clear-btn').addEventListener('click',()=>{ selectedSystemIds.clear(); updateBulkBar(); });

  /* ── Save to Repo ── */
  document.getElementById('sb-save-repo').addEventListener('click',async()=>{
    if(!requireEditor()) return;
    const btn=document.getElementById('sb-save-repo');
    const orig=btn.textContent; btn.textContent='SAVING...'; btn.disabled=true;
    try{
      const galaxyData={meta:{total_systems:systems.length,total_polities:polities.length}, polities, systems:systems.map(s=>({id:s.id,name:s.name,owner:s.owner,starType:s.starType,tags:s.tags||[],coords:s.coords,pixel:s.pixel,source:s.source}))};
      await SGNGitHub.commitFile('galaxy_data.json',JSON.stringify(galaxyData,null,2),'Galaxy Map: update data');
      showToast('Committed to GitHub');
    }catch(err){ showToast('Save failed: '+err.message); }
    finally{ btn.textContent=orig; btn.disabled=false; }
  });

  /* ── Input ── */
  function initInput(){
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('mousedown',e=>{
      lx=e.clientX; ly=e.clientY; dragMoved=false;
      if(e.button===2){ panning=true; }
      else if(e.button===0){
        if(e.shiftKey&&!e.ctrlKey){
          /* Rotate */
          dragging=true;
        } else if(e.ctrlKey||e.metaKey){
          /* Drag select */
          isDragSelecting=true; selStartX=e.clientX; selStartY=e.clientY;
        } else if(editorUnlocked){
          isDragSelecting=true; selStartX=e.clientX; selStartY=e.clientY;
        } else {
          dragging=true;
        }
      }
    });
    addEventListener('mousemove',e=>{
      const dx=e.clientX-lx, dy=e.clientY-ly;
      lx=e.clientX; ly=e.clientY;
      mouseX=e.clientX; mouseY=e.clientY;
      if(Math.abs(dx)>1||Math.abs(dy)>1) dragMoved=true;

      if(dragging){
        yaw+=dx*0.005;
        pitch+=dy*0.005;
        pitch=Math.max(-1.55,Math.min(1.55,pitch));
      } else if(panning){
        const s=camDist/1000;
        panX-=dx*s; panY+=dy*s;
      } else if(isDragSelecting&&dragMoved){
        const rect=document.getElementById('select-rect');
        rect.style.display='block';
        rect.style.left=Math.min(selStartX,e.clientX)+'px';
        rect.style.top=Math.min(selStartY,e.clientY)+'px';
        rect.style.width=Math.abs(e.clientX-selStartX)+'px';
        rect.style.height=Math.abs(e.clientY-selStartY)+'px';
      }
    });
    addEventListener('mouseup',e=>{
      if(isDragSelecting&&dragMoved){
        const found=findSystemsInRect(selStartX,selStartY,e.clientX,e.clientY);
        selectedSystemIds.clear();
        for(const sys of found) selectedSystemIds.add(sys.id);
        updateBulkBar();
      } else if(!dragMoved&&e.button===0){
        const sys=findSystemAtScreen(e.clientX,e.clientY);
        if(sys){ selectedSystemIds.clear(); selectedSystemIds.add(sys.id); selectedSystemId=sys.id; openSystemPanel(sys.id); }
        else { selectedSystemIds.clear(); selectedSystemId=null; closePanel(); }
        updateBulkBar();
      }
      dragging=false; panning=false; isDragSelecting=false;
      document.getElementById('select-rect').style.display='none';
    });
    addEventListener('wheel',e=>{
      if(e.target.closest('#sidePanel')||e.target.closest('#legend-panel')) return;
      camDist*=(1+Math.sign(e.deltaY)*0.12);
      camDist=Math.max(30,Math.min(800,camDist));
    });
  }

  /* ── Tooltip ── */
  function updateTooltip(){
    const sys=findSystemAtScreen(mouseX,mouseY,20);
    hoveredSystemId=sys?sys.id:null;
    const tip=document.getElementById('tooltip');
    if(sys){
      document.getElementById('tip-name').textContent=sys.name||sys.id;
      document.getElementById('tip-id').textContent=sys.id;
      const pol=polities.find(p=>p.id===sys.owner);
      document.getElementById('tip-owner').textContent=pol?`◈ ${pol.name}`:'';
      const tags=sys.tags||[];
      document.getElementById('tip-tags').innerHTML=tags.map(t=>{
        const cls=['contested','capital','homeworld','frontier','outpost','fortress'].includes(t.toLowerCase())?` ${t.toLowerCase()}`:'';
        return `<span class="tag-chip${cls}">${t}</span>`;
      }).join('');
      tip.style.left=mouseX+'px'; tip.style.top=mouseY+'px'; tip.style.display='block';
    } else { tip.style.display='none'; }
  }

  /* ── Draw Halo (same as main.js drawHalo) ── */
  function drawHalo(id, pix, ht, glow, core, mode) {
    const p = idToWorld.get(id); if (!p) return;
    gl.useProgram(progHalo);
    gl.uniformMatrix4fv(gl.getUniformLocation(progHalo, 'uMVP'), false, buildMVP());
    gl.uniform1f(gl.getUniformLocation(progHalo, 'uPixelSize'), pix);
    gl.uniform1f(gl.getUniformLocation(progHalo, 'uTime'), ht);
    gl.uniform3f(gl.getUniformLocation(progHalo, 'uColGlow'), glow[0], glow[1], glow[2]);
    gl.uniform3f(gl.getUniformLocation(progHalo, 'uColCore'), core[0], core[1], core[2]);
    gl.uniform1f(gl.getUniformLocation(progHalo, 'uMode'), mode || 0.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, haloVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p), gl.DYNAMIC_DRAW);
    const aPos_h = gl.getAttribLocation(progHalo, 'position');
    gl.enableVertexAttribArray(aPos_h);
    gl.vertexAttribPointer(aPos_h, 3, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disableVertexAttribArray(aPos_h);
  }

  /* ── Draw Black Hole ── */
  let progBlackHole = null;
  function drawBlackHole(pos, pixSize, time) {
    if (!progBlackHole) return;
    gl.useProgram(progBlackHole);
    gl.uniformMatrix4fv(gl.getUniformLocation(progBlackHole, 'uMVP'), false, buildMVP());
    gl.uniform1f(gl.getUniformLocation(progBlackHole, 'uPixelSize'), pixSize);
    gl.uniform1f(gl.getUniformLocation(progBlackHole, 'uTime'), time);
    gl.bindBuffer(gl.ARRAY_BUFFER, blackHoleVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.DYNAMIC_DRAW);
    const aPos = gl.getAttribLocation(progBlackHole, 'position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.disableVertexAttribArray(aPos);
  }

  /* ── Render Loop ── */
  function render(){
    const W=canvas.width, H=canvas.height;
    gl.viewport(0,0,W,H);
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);

    const wallTime=(performance.now()-t0)*0.001;
    const mvp=buildMVP();

    /* 1. Nebula background */
    gl.useProgram(progBG);
    gl.uniform1f(gl.getUniformLocation(progBG,'uTime'),wallTime);
    gl.uniform2f(gl.getUniformLocation(progBG,'uRes'),W,H);
    gl.uniform3f(gl.getUniformLocation(progBG,'uPan'),panX,panY,0);
    gl.uniform1f(gl.getUniformLocation(progBG,'uZoom'),camDist/250);
    gl.uniform2f(gl.getUniformLocation(progBG,'uRot'),yaw,pitch);
    const aPosB=gl.getAttribLocation(progBG,'position');
    gl.bindBuffer(gl.ARRAY_BUFFER,bgVBO);
    gl.enableVertexAttribArray(aPosB);
    gl.vertexAttribPointer(aPosB,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.disableVertexAttribArray(aPosB);

    gl.enable(gl.BLEND);

    /* 2. 3D background stars */
    gl.useProgram(progBGStars);
    gl.uniformMatrix4fv(gl.getUniformLocation(progBGStars,'uMVP'),false,mvp);
    gl.uniform1f(gl.getUniformLocation(progBGStars,'uTime'),wallTime);
    const stride=7*4;
    gl.bindBuffer(gl.ARRAY_BUFFER,bgStarsVBO);
    const aP=gl.getAttribLocation(progBGStars,'position'), aC=gl.getAttribLocation(progBGStars,'aColor'), aS=gl.getAttribLocation(progBGStars,'aSize');
    gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP,3,gl.FLOAT,false,stride,0);
    gl.enableVertexAttribArray(aC); gl.vertexAttribPointer(aC,3,gl.FLOAT,false,stride,12);
    gl.enableVertexAttribArray(aS); gl.vertexAttribPointer(aS,1,gl.FLOAT,false,stride,24);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    gl.drawArrays(gl.POINTS,0,BG_STAR_COUNT);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.disableVertexAttribArray(aP); gl.disableVertexAttribArray(aC); gl.disableVertexAttribArray(aS);

    /* 3. Territory borders */
    if(territoryTexture&&polities.length>0){
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(progTerritory);
      gl.uniformMatrix4fv(gl.getUniformLocation(progTerritory,'uMVP'),false,mvp);
      gl.uniform1f(gl.getUniformLocation(progTerritory,'uTime'),wallTime);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,territoryTexture);
      gl.uniform1i(gl.getUniformLocation(progTerritory,'uTex'),0);
      gl.bindBuffer(gl.ARRAY_BUFFER,territoryQuadVBO);
      const tP=gl.getAttribLocation(progTerritory,'position'), tU=gl.getAttribLocation(progTerritory,'aUV');
      gl.enableVertexAttribArray(tP); gl.vertexAttribPointer(tP,3,gl.FLOAT,false,20,0);
      gl.enableVertexAttribArray(tU); gl.vertexAttribPointer(tU,2,gl.FLOAT,false,20,12);
      gl.drawArrays(gl.TRIANGLES,0,6);
      gl.disableVertexAttribArray(tP); gl.disableVertexAttribArray(tU);
    }

    /* 4. Lanes — multi-pass glow (same as main.js) */
    if(linesVBO&&lineVertCount>0){
      gl.useProgram(progLines);
      gl.uniformMatrix4fv(gl.getUniformLocation(progLines,'uMVP'),false,mvp);
      const aPos_l=gl.getAttribLocation(progLines,'position');
      gl.bindBuffer(gl.ARRAY_BUFFER,linesVBO);
      gl.enableVertexAttribArray(aPos_l);
      gl.vertexAttribPointer(aPos_l,3,gl.FLOAT,false,0,0);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE);

      /* outer glow (dim, wide) */
      gl.uniform4f(gl.getUniformLocation(progLines,'uColor'),0.10,0.50,0.65,0.12);
      gl.lineWidth(3.0);
      gl.drawArrays(gl.LINES,0,lineVertCount);

      /* mid glow */
      gl.uniform4f(gl.getUniformLocation(progLines,'uColor'),0.15,0.60,0.75,0.30);
      gl.lineWidth(2.0);
      gl.drawArrays(gl.LINES,0,lineVertCount);

      /* core line (bright) */
      gl.uniform4f(gl.getUniformLocation(progLines,'uColor'),0.25,0.80,0.95,0.65);
      gl.lineWidth(1.0);
      gl.drawArrays(gl.LINES,0,lineVertCount);

      gl.disableVertexAttribArray(aPos_l);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    }

    /* 5. Galaxy stars */
    if(starsVBO&&starCount>0){
      gl.useProgram(progPoints);
      gl.uniformMatrix4fv(gl.getUniformLocation(progPoints,'uMVP'),false,mvp);
      gl.bindBuffer(gl.ARRAY_BUFFER,starsVBO);
      const sP=gl.getAttribLocation(progPoints,'position'), sC=gl.getAttribLocation(progPoints,'aColor'), sS=gl.getAttribLocation(progPoints,'aSize');
      gl.enableVertexAttribArray(sP); gl.vertexAttribPointer(sP,3,gl.FLOAT,false,stride,0);
      gl.enableVertexAttribArray(sC); gl.vertexAttribPointer(sC,3,gl.FLOAT,false,stride,12);
      gl.enableVertexAttribArray(sS); gl.vertexAttribPointer(sS,1,gl.FLOAT,false,stride,24);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
      gl.drawArrays(gl.POINTS,0,starCount);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.disableVertexAttribArray(sP); gl.disableVertexAttribArray(sC); gl.disableVertexAttribArray(sS);
    }

    /* 6. Supermassive black holes */
    for(const bhPos of blackHoleWorldPos){
      drawBlackHole(bhPos, 120.0, wallTime);
    }

    /* 7. Hover & Selection halos (same as main.js) */
    const t=wallTime;
    if(hoveredSystemId){
      drawHalo(hoveredSystemId, 70.0, t, [0.20,0.60,0.70], [0.35,0.95,1.0], 0.0);
      drawHalo(hoveredSystemId, 48.0, t, [0.35,0.95,1.0], [1.0,0.95,0.50], 0.0);
    }
    if(selectedSystemId){
      drawHalo(selectedSystemId, 80.0, t, [0.50,0.40,0.15], [1.0,0.85,0.35], 1.0);
      drawHalo(selectedSystemId, 56.0, t, [1.0,0.85,0.35],  [1.0,0.98,0.70], 1.0);
    }

    updateTooltip();
    requestAnimationFrame(render);
  }

  /* ── Keyboard ── */
  addEventListener('keydown',e=>{
    if(e.key==='Escape'){ selectedSystemIds.clear(); selectedSystemId=null; updateBulkBar(); closePanel(); document.getElementById('polity-modal').classList.remove('open'); }
  });

  /* ── Load data & boot ── */
  async function init(){
    /* Load JSON */
    try{
      const resp=await fetch('star_map.json');
      const data=await resp.json();
      systems=data.systems;
      lanes=data.lanes||[];
      for(const sys of systems){
        if(!sys.starType) sys.starType=pickStarType(hashStr(sys.id)).id;
        if(!sys.tags) sys.tags=[];
        if(!sys.owner) sys.owner='unassigned';
        sys._worldPos=systemToWorld(sys);
        idToWorld.set(sys.id, sys._worldPos);
      }
    }catch(e){ console.error('Failed to load star_map.json:',e); return; }

    /* Try loading saved edits from localStorage */
    loadFromLS();

    /* Also try galaxy_data.json from repo */
    try{
      const r=await fetch('./galaxy_data.json',{cache:'no-store'});
      if(r.ok){
        const gd=await r.json();
        if(gd.polities&&gd.polities.length) polities=gd.polities;
        if(gd.systems){
          const map={}; for(const s of gd.systems) map[s.id]=s;
          for(const sys of systems){ const sv=map[sys.id]; if(sv){ sys.name=sv.name||sys.name; sys.owner=sv.owner||sys.owner; sys.starType=sv.starType||sys.starType; sys.tags=sv.tags||sys.tags; } }
        }
      }
    }catch{}

    /* Recompute world positions in case star types changed */
    for(const sys of systems){ sys._worldPos=systemToWorld(sys); idToWorld.set(sys.id, sys._worldPos); }

    document.getElementById('sb-sys').textContent=`${systems.length} SYSTEMS · ${lanes.length} LANES`;

    /* Init WebGL */
    if(!initGL()) return;
    resize();
    addEventListener('resize',resize);

    /* Compile programs */
    progBG=makeProgram(VS_BG,FS_BG);
    progBGStars=makeProgram(VS_BGSTARS,FS_BGSTARS);
    progPoints=makeProgram(VS_POINTS,FS_POINTS);
    progTerritory=makeProgram(VS_TERR,FS_TERR);
    progLines=makeProgram(VS_LINES,FS_LINES);
    progHalo=makeProgram(VS_HALO,FS_HALO);
    progBlackHole=makeProgram(VS_BLACKHOLE,FS_BLACKHOLE);

    /* Build geometry */
    bgVBO=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,bgVBO);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    haloVBO=gl.createBuffer();
    blackHoleVBO=gl.createBuffer();

    /* Compute black hole world positions (at galactic plane Y=0) */
    blackHoleWorldPos=BLACK_HOLES.map(bh=>[
      (bh.xn-0.5)*GALAXY_SPREAD_X,
      0,
      (bh.yn-0.5)*GALAXY_SPREAD_Z
    ]);

    buildBGStars();
    rebuildStarsVBO();
    rebuildLinesVBO();
    buildTerritoryQuad();
    buildTerritoryTexture();

    /* UI */
    updateLegend();
    refreshBulkPolityOptions();
    updateEditorLock();
    initInput();

    /* Start render */
    requestAnimationFrame(render);
  }

  init();
})();
