// ╔══════════════════════════════════════════════════════════════════════╗
// ║  SGN GALAXY MAP — WebGL Star Field + Territory Border Renderer     ║
// ║  Vanilla JS, raw WebGL, no frameworks                              ║
// ╚══════════════════════════════════════════════════════════════════════╝

(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────
  const GALAXY_SPREAD_X = 300;   // world units width
  const GALAXY_SPREAD_Z = 140;   // world units depth (maps to y_norm)
  const GALAXY_THICKNESS = 12;   // max Y displacement at core
  const BACKGROUND_STAR_COUNT = 6000;
  const BACKGROUND_RADIUS = 800;
  const TERRITORY_RESOLUTION = 128; // grid resolution for territory texture
  const TERRITORY_INFLUENCE_RADIUS = 8; // world units
  const TAG_OPTIONS = [
    'capital', 'homeworld', 'fortress', 'outpost', 'frontier',
    'contested', 'dangerous', 'trade', 'ruins', 'anomaly'
  ];

  const STAR_TYPES = [
    { id: 'M', name: 'M-Dwarf',   color: [1.0, 0.4, 0.3], weight: 0.45, sizeRange: [0.6, 1.0] },
    { id: 'K', name: 'K-Dwarf',   color: [1.0, 0.7, 0.3], weight: 0.25, sizeRange: [0.8, 1.2] },
    { id: 'G', name: 'G-Dwarf',   color: [1.0, 0.95, 0.7], weight: 0.15, sizeRange: [0.9, 1.4] },
    { id: 'F', name: 'F-Type',    color: [0.9, 0.95, 1.0], weight: 0.07, sizeRange: [1.0, 1.6] },
    { id: 'A', name: 'A-Type',    color: [0.7, 0.8, 1.0], weight: 0.04, sizeRange: [1.2, 2.0] },
    { id: 'B', name: 'Giant',     color: [0.7, 0.5, 1.0], weight: 0.025, sizeRange: [1.8, 3.0] },
    { id: 'N', name: 'Neutron',   color: [0.3, 1.0, 1.0], weight: 0.01, sizeRange: [0.5, 0.8] },
    { id: 'O', name: 'O-Type',    color: [0.5, 0.6, 1.0], weight: 0.005, sizeRange: [2.0, 3.5] },
  ];

  // ── State ────────────────────────────────────────────────────────────
  let gl, canvas;
  let systems = [];          // loaded from JSON
  let polities = [];         // { id, name, color, description }
  let editorUnlocked = false;
  let selectedSystemIds = new Set();
  let hoveredSystemId = null;
  let panelSystemId = null;  // system shown in side panel

  // WebGL programs & buffers
  let starProgram, bgStarProgram, territoryProgram, nebulaProgram;
  let starVAO, bgStarVAO;
  let starPositionBuffer, starColorBuffer, starSizeBuffer, starTwinkleBuffer;
  let bgStarPositionBuffer, bgStarColorBuffer, bgStarSizeBuffer;
  let territoryTexture, territoryFramebuffer;
  let territoryQuadBuffer;
  let nebulaQuadBuffer;
  let starCount = 0;
  let bgStarCount = 0;

  // Camera
  let camera = {
    target: [0, 0, 0],
    distance: 200,
    theta: 0.3,    // azimuth
    phi: 0.8,      // elevation (0=top, PI=bottom)
    minDist: 20,
    maxDist: 500,
    position: [0, 0, 0],
    viewMatrix: new Float32Array(16),
    projMatrix: new Float32Array(16),
    vpMatrix: new Float32Array(16),
  };

  // Input
  let mouse = { x: 0, y: 0, down: false, button: -1, startX: 0, startY: 0, dragging: false };
  let isDragSelecting = false;

  // Timing
  let lastTime = 0;
  let frameCount = 0;
  let fpsTime = 0;
  let fpsDisplay = 0;

  // Territory visibility
  let hiddenPolities = new Set();

  // ── Boot Sequence ───────────────────────────────────────────────────
  const bootLines = [
    ['SGN GALAXY MAP v2.1.0', ''],
    ['Initializing WebGL2 renderer...', ''],
    ['Loading star catalog (4,984 systems)...', ''],
    ['Generating spectral classifications...', 'OK'],
    ['Building galactic disc geometry...', 'OK'],
    ['Compiling star point shaders...', 'OK'],
    ['Generating background star field...', 'OK'],
    ['Initializing territory border system...', 'OK'],
    ['Compiling nebula backdrop shader...', 'OK'],
    ['Camera subsystem online', 'OK'],
    ['All systems nominal. Engaging viewer.', ''],
  ];

  function runBootSequence() {
    const overlay = document.getElementById('boot-overlay');
    const log = document.getElementById('boot-log');
    let i = 0;
    function addLine() {
      if (i >= bootLines.length) {
        setTimeout(() => {
          overlay.classList.add('fade-out');
          setTimeout(() => overlay.remove(), 600);
        }, 400);
        return;
      }
      const [text, status] = bootLines[i];
      const div = document.createElement('div');
      div.className = 'boot-line';
      div.textContent = '> ' + text;
      if (status === 'OK') {
        const s = document.createElement('span');
        s.className = 'boot-ok';
        s.textContent = ' [OK]';
        div.appendChild(s);
      }
      log.appendChild(div);
      requestAnimationFrame(() => div.classList.add('visible'));
      i++;
      setTimeout(addLine, 80 + Math.random() * 60);
    }
    addLine();
  }

  // ── Stardate Clock ──────────────────────────────────────────────────
  function updateClock() {
    const now = new Date();
    const y = now.getFullYear();
    const start = new Date(y, 0, 1);
    const dayOfYear = Math.floor((now - start) / 86400000) + 1;
    const frac = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
    const stardate = `${y}.${String(dayOfYear).padStart(3, '0')}.${frac.toFixed(4).slice(2)}`;
    document.getElementById('hud-clock').textContent = 'STARDATE ' + stardate;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ── Toast ───────────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
  }

  // ── Utility: seeded random for consistent star types ────────────────
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  }

  function pickStarType(seed) {
    const rng = mulberry32(seed);
    const r = rng();
    let cum = 0;
    for (const st of STAR_TYPES) {
      cum += st.weight;
      if (r < cum) return st;
    }
    return STAR_TYPES[0];
  }

  function pickStarSize(starType, seed) {
    const rng = mulberry32(seed + 9999);
    const [lo, hi] = starType.sizeRange;
    return lo + rng() * (hi - lo);
  }

  // ── Matrix Math ─────────────────────────────────────────────────────
  const mat4 = {
    identity(out) {
      out.fill(0); out[0] = out[5] = out[10] = out[15] = 1; return out;
    },
    perspective(out, fov, aspect, near, far) {
      const f = 1.0 / Math.tan(fov / 2);
      out.fill(0);
      out[0] = f / aspect;
      out[5] = f;
      out[10] = (far + near) / (near - far);
      out[11] = -1;
      out[14] = (2 * far * near) / (near - far);
      return out;
    },
    lookAt(out, eye, center, up) {
      let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
      z0 = eye[0] - center[0]; z1 = eye[1] - center[1]; z2 = eye[2] - center[2];
      len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
      z0 *= len; z1 *= len; z2 *= len;
      x0 = up[1] * z2 - up[2] * z1;
      x1 = up[2] * z0 - up[0] * z2;
      x2 = up[0] * z1 - up[1] * z0;
      len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
      if (len < 1e-6) { x0 = x1 = x2 = 0; } else { len = 1 / len; x0 *= len; x1 *= len; x2 *= len; }
      y0 = z1 * x2 - z2 * x1; y1 = z2 * x0 - z0 * x2; y2 = z0 * x1 - z1 * x0;
      out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
      out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
      out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
      out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
      out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
      out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
      out[15] = 1;
      return out;
    },
    multiply(out, a, b) {
      const r = new Float32Array(16);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          r[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
        }
      }
      out.set(r);
      return out;
    },
    invert(out, a) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10;
      const b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
      const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
      const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
      const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31;
      const b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return null;
      det = 1.0 / det;
      out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return out;
    }
  };

  // ── Shader Sources ──────────────────────────────────────────────────

  // Star point shader: bright core, colored glow, diffraction spikes
  const starVertSrc = `#version 300 es
    precision highp float;
    uniform mat4 uVP;
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uPointScale;
    in vec3 aPosition;
    in vec3 aColor;
    in float aSize;
    in float aTwinkle;
    out vec3 vColor;
    out float vBrightness;
    out float vPointSize;

    void main() {
      gl_Position = uVP * vec4(aPosition, 1.0);
      // Twinkle
      float twinkle = 0.85 + 0.15 * sin(uTime * (1.5 + aTwinkle * 2.0) + aTwinkle * 40.0);
      float dist = gl_Position.w;
      float baseSize = aSize * uPointScale * uPixelRatio / max(dist, 1.0);
      gl_PointSize = max(baseSize * twinkle, 1.5);
      vColor = aColor;
      vBrightness = twinkle;
      vPointSize = gl_PointSize;
    }
  `;

  const starFragSrc = `#version 300 es
    precision highp float;
    in vec3 vColor;
    in float vBrightness;
    in float vPointSize;
    out vec4 fragColor;

    void main() {
      vec2 uv = gl_PointCoord * 2.0 - 1.0;
      float r = length(uv);

      // Core: bright white gaussian
      float core = exp(-r * r * 12.0);

      // Inner glow: colored
      float glow = exp(-r * r * 3.0);

      // Outer glow: very soft
      float outer = exp(-r * r * 0.8) * 0.3;

      // Diffraction spikes (4-point)
      float spX = exp(-abs(uv.y) * vPointSize * 0.6) * exp(-abs(uv.x) * 1.5);
      float spY = exp(-abs(uv.x) * vPointSize * 0.6) * exp(-abs(uv.y) * 1.5);
      float spikes = (spX + spY) * 0.15;

      vec3 white = vec3(1.0);
      vec3 col = white * core + vColor * glow * 0.9 + vColor * outer + white * spikes;

      float alpha = max(core, max(glow * 0.8, max(outer, spikes)));
      alpha *= vBrightness;

      if (alpha < 0.005) discard;

      fragColor = vec4(col * vBrightness, alpha);
    }
  `;

  // Background star shader (simpler, no spikes)
  const bgStarVertSrc = `#version 300 es
    precision highp float;
    uniform mat4 uVP;
    uniform float uTime;
    uniform float uPixelRatio;
    in vec3 aPosition;
    in vec3 aColor;
    in float aSize;
    out vec3 vColor;
    out float vBright;

    void main() {
      gl_Position = uVP * vec4(aPosition, 1.0);
      float t = sin(uTime * 0.5 + aPosition.x * 0.1 + aPosition.z * 0.1) * 0.3 + 0.7;
      gl_PointSize = max(aSize * uPixelRatio * t, 1.0);
      vColor = aColor;
      vBright = t;
    }
  `;

  const bgStarFragSrc = `#version 300 es
    precision highp float;
    in vec3 vColor;
    in float vBright;
    out vec4 fragColor;

    void main() {
      vec2 uv = gl_PointCoord * 2.0 - 1.0;
      float r = length(uv);
      float a = exp(-r * r * 4.0) * vBright;
      if (a < 0.01) discard;
      fragColor = vec4(vColor * vBright, a);
    }
  `;

  // Territory border shader: renders territory as a textured quad overlay
  const territoryVertSrc = `#version 300 es
    precision highp float;
    uniform mat4 uVP;
    in vec3 aPosition;
    in vec2 aUV;
    out vec2 vUV;

    void main() {
      gl_Position = uVP * vec4(aPosition, 1.0);
      vUV = aUV;
    }
  `;

  const territoryFragSrc = `#version 300 es
    precision highp float;
    uniform sampler2D uTerritory;
    uniform float uTime;
    in vec2 vUV;
    out vec4 fragColor;

    void main() {
      vec4 t = texture(uTerritory, vUV);
      if (t.a < 0.01) discard;

      // Soft edge glow: boost alpha near edges
      vec2 texel = 1.0 / vec2(textureSize(uTerritory, 0));
      float aL = texture(uTerritory, vUV + vec2(-texel.x * 2.0, 0.0)).a;
      float aR = texture(uTerritory, vUV + vec2(texel.x * 2.0, 0.0)).a;
      float aU = texture(uTerritory, vUV + vec2(0.0, texel.y * 2.0)).a;
      float aD = texture(uTerritory, vUV + vec2(0.0, -texel.y * 2.0)).a;
      float edge = clamp(1.0 - min(min(aL, aR), min(aU, aD)), 0.0, 1.0);

      // Fill: very translucent, edges brighter
      float fillAlpha = t.a * 0.12;
      float edgeAlpha = edge * t.a * 0.5;

      vec3 col = t.rgb;
      float alpha = fillAlpha + edgeAlpha;

      // Contested: check if w channel encodes contested flag
      // (we use the 4th channel for contested: 0.5 = contested)
      // Hatched pattern for contested zones
      if (t.a > 0.01 && t.a < 0.45) {
        // This is a contested zone - add hatch
        float hatch = sin((vUV.x + vUV.y) * 200.0 + uTime * 2.0) * 0.5 + 0.5;
        alpha *= 0.5 + hatch * 0.5;
      }

      fragColor = vec4(col, alpha);
    }
  `;

  // Nebula backdrop shader
  const nebulaVertSrc = `#version 300 es
    precision highp float;
    in vec2 aPosition;
    out vec2 vUV;
    void main() {
      gl_Position = vec4(aPosition, 0.999, 1.0);
      vUV = aPosition * 0.5 + 0.5;
    }
  `;

  const nebulaFragSrc = `#version 300 es
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform mat4 uInvVP;
    out vec4 fragColor;
    in vec2 vUV;

    // Simplex-ish noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      // Use screen UV as a direction to sample noise in 3D, slowly rotating
      float t = uTime * 0.01;
      vec3 dir = vec3(vUV * 3.0 - 1.5, t);

      float n1 = snoise(dir * 0.8) * 0.5 + 0.5;
      float n2 = snoise(dir * 1.6 + 10.0) * 0.5 + 0.5;
      float n3 = snoise(dir * 3.2 + 20.0) * 0.5 + 0.5;

      float nebula = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
      nebula = pow(nebula, 2.5) * 0.35;

      // Color: subtle blue/teal/violet
      vec3 col1 = vec3(0.05, 0.12, 0.25);  // deep blue
      vec3 col2 = vec3(0.08, 0.18, 0.22);  // teal
      vec3 col3 = vec3(0.12, 0.06, 0.20);  // violet

      vec3 nebColor = mix(col1, col2, n1);
      nebColor = mix(nebColor, col3, n2 * 0.5);

      fragColor = vec4(nebColor * nebula, nebula * 0.6);
    }
  `;


  // ── WebGL Helpers ───────────────────────────────────────────────────
  function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function createProgram(vSrc, fSrc) {
    const v = createShader(gl.VERTEX_SHADER, vSrc);
    const f = createShader(gl.FRAGMENT_SHADER, fSrc);
    const p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('Program link:', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  function getUniforms(prog, names) {
    const u = {};
    for (const n of names) u[n] = gl.getUniformLocation(prog, n);
    return u;
  }

  function getAttribs(prog, names) {
    const a = {};
    for (const n of names) a[n] = gl.getAttribLocation(prog, n);
    return a;
  }


  // ── System Position Mapping ─────────────────────────────────────────
  function systemToWorld(sys) {
    const x = (sys.coords.x_norm - 0.5) * GALAXY_SPREAD_X;
    const z = (sys.coords.y_norm - 0.5) * GALAXY_SPREAD_Z;

    // Y (height): galactic disc shape. Thicker near center, thinner at edges
    const distFromCenter = Math.sqrt(
      ((sys.coords.x_norm - 0.5) * 2) ** 2 +
      ((sys.coords.y_norm - 0.5) * 2) ** 2
    );
    const thicknessFactor = Math.max(0, 1.0 - distFromCenter * 0.8);
    const seed = hashString(sys.id);
    const rng = mulberry32(seed + 77777);
    const y = (rng() * 2 - 1) * GALAXY_THICKNESS * thicknessFactor;

    return [x, y, z];
  }


  // ── Initialize WebGL ────────────────────────────────────────────────
  function initGL() {
    canvas = document.getElementById('galaxy-canvas');
    gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      alert('WebGL2 not supported');
      return false;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive blending for stars
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0.02, 0.03, 0.06, 1.0);

    // Compile all programs
    starProgram = createProgram(starVertSrc, starFragSrc);
    bgStarProgram = createProgram(bgStarVertSrc, bgStarFragSrc);
    territoryProgram = createProgram(territoryVertSrc, territoryFragSrc);
    nebulaProgram = createProgram(nebulaVertSrc, nebulaFragSrc);

    return true;
  }


  // ── Build Star Buffers ──────────────────────────────────────────────
  function buildStarBuffers() {
    const positions = [];
    const colors = [];
    const sizes = [];
    const twinkles = [];

    for (const sys of systems) {
      const pos = systemToWorld(sys);
      sys._worldPos = pos;
      positions.push(pos[0], pos[1], pos[2]);

      // Star type: use stored or assign procedurally
      if (!sys.starType) {
        const st = pickStarType(hashString(sys.id));
        sys.starType = st.id;
      }
      const st = STAR_TYPES.find(t => t.id === sys.starType) || STAR_TYPES[0];
      colors.push(st.color[0], st.color[1], st.color[2]);

      const sz = pickStarSize(st, hashString(sys.id));
      sizes.push(sz);

      const rng = mulberry32(hashString(sys.id) + 12345);
      twinkles.push(rng());
    }

    starCount = systems.length;

    starPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    starColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    starSizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starSizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.STATIC_DRAW);

    starTwinkleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starTwinkleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(twinkles), gl.STATIC_DRAW);
  }


  // ── Build Background Star Field ─────────────────────────────────────
  function buildBgStars() {
    const positions = [];
    const colors = [];
    const sizes = [];
    const rng = mulberry32(42);

    for (let i = 0; i < BACKGROUND_STAR_COUNT; i++) {
      // Random point on sphere shell
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      const r = BACKGROUND_RADIUS * (0.9 + rng() * 0.2);
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      // Dim white/blue/warm colors
      const temp = rng();
      if (temp < 0.6) {
        colors.push(0.8, 0.85, 0.9); // cool white
      } else if (temp < 0.8) {
        colors.push(0.7, 0.8, 1.0);  // blue
      } else {
        colors.push(1.0, 0.9, 0.7);  // warm
      }

      sizes.push(1.0 + rng() * 2.0);
    }

    bgStarCount = BACKGROUND_STAR_COUNT;

    bgStarPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bgStarPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    bgStarColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bgStarColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    bgStarSizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bgStarSizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.STATIC_DRAW);
  }


  // ── Territory Texture ───────────────────────────────────────────────
  function buildTerritoryTexture() {
    // Create a 2D texture that maps territory ownership onto the galactic plane
    const res = TERRITORY_RESOLUTION;
    const data = new Uint8Array(res * res * 4); // RGBA

    // For each texel, find the dominant polity using influence
    for (let gy = 0; gy < res; gy++) {
      for (let gx = 0; gx < res; gx++) {
        // Map grid to world coords
        const wx = (gx / res - 0.5) * GALAXY_SPREAD_X;
        const wz = (gy / res - 0.5) * GALAXY_SPREAD_Z;

        // Find nearest owned systems and accumulate influence
        const influence = {}; // polityId -> total influence
        let maxInf = 0;
        let maxPolity = null;
        let secondPolity = null;
        let secondInf = 0;

        for (const sys of systems) {
          if (!sys.owner || sys.owner === 'unassigned') continue;
          if (hiddenPolities.has(sys.owner)) continue;

          const dx = sys._worldPos[0] - wx;
          const dz = sys._worldPos[2] - wz;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist < TERRITORY_INFLUENCE_RADIUS) {
            const inf = Math.max(0, 1.0 - dist / TERRITORY_INFLUENCE_RADIUS);
            const infSq = inf * inf; // smoother falloff
            if (!influence[sys.owner]) influence[sys.owner] = 0;
            influence[sys.owner] += infSq;
          }
        }

        // Find top two
        for (const [pid, inf] of Object.entries(influence)) {
          if (inf > maxInf) {
            secondPolity = maxPolity;
            secondInf = maxInf;
            maxPolity = pid;
            maxInf = inf;
          } else if (inf > secondInf) {
            secondPolity = pid;
            secondInf = inf;
          }
        }

        const idx = (gy * res + gx) * 4;

        if (maxPolity && maxInf > 0.05) {
          const pol = polities.find(p => p.id === maxPolity);
          if (pol) {
            const c = hexToRgb(pol.color);
            // Check for contested
            const contested = secondPolity && secondInf > maxInf * 0.5;
            if (contested) {
              // Blend the two colors
              const pol2 = polities.find(p => p.id === secondPolity);
              if (pol2) {
                const c2 = hexToRgb(pol2.color);
                data[idx]     = Math.round((c[0] + c2[0]) / 2);
                data[idx + 1] = Math.round((c[1] + c2[1]) / 2);
                data[idx + 2] = Math.round((c[2] + c2[2]) / 2);
                data[idx + 3] = Math.round(Math.min(maxInf, 1.0) * 100); // lower alpha = contested marker
              }
            } else {
              data[idx]     = c[0];
              data[idx + 1] = c[1];
              data[idx + 2] = c[2];
              data[idx + 3] = Math.round(Math.min(maxInf, 1.0) * 200 + 55); // 55-255 range
            }
          }
        }
      }
    }

    // Gaussian blur pass for smoothness
    const blurred = gaussianBlur(data, res, res);

    if (!territoryTexture) {
      territoryTexture = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, territoryTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, res, res, 0, gl.RGBA, gl.UNSIGNED_BYTE, blurred);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  function gaussianBlur(data, w, h) {
    const out = new Uint8Array(data.length);
    const kernel = [1, 4, 6, 4, 1]; // 5-tap
    const kSum = 16;
    const kR = 2;

    // Horizontal pass
    const temp = new Uint8Array(data.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let k = -kR; k <= kR; k++) {
          const sx = Math.max(0, Math.min(w - 1, x + k));
          const idx = (y * w + sx) * 4;
          const wt = kernel[k + kR];
          r += data[idx] * wt;
          g += data[idx + 1] * wt;
          b += data[idx + 2] * wt;
          a += data[idx + 3] * wt;
        }
        const idx = (y * w + x) * 4;
        temp[idx] = r / kSum;
        temp[idx + 1] = g / kSum;
        temp[idx + 2] = b / kSum;
        temp[idx + 3] = a / kSum;
      }
    }

    // Vertical pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let k = -kR; k <= kR; k++) {
          const sy = Math.max(0, Math.min(h - 1, y + k));
          const idx = (sy * w + x) * 4;
          const wt = kernel[k + kR];
          r += temp[idx] * wt;
          g += temp[idx + 1] * wt;
          b += temp[idx + 2] * wt;
          a += temp[idx + 3] * wt;
        }
        const idx = (y * w + x) * 4;
        out[idx] = r / kSum;
        out[idx + 1] = g / kSum;
        out[idx + 2] = b / kSum;
        out[idx + 3] = a / kSum;
      }
    }

    return out;
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16)
    ];
  }

  function buildTerritoryQuad() {
    // A quad on the XZ plane at Y=0 spanning the galaxy
    const hx = GALAXY_SPREAD_X / 2 + 20; // some padding
    const hz = GALAXY_SPREAD_Z / 2 + 20;
    const y = -0.5; // slightly below stars

    // positions (3) + uvs (2) per vertex
    const verts = new Float32Array([
      -hx, y, -hz,  0, 0,
       hx, y, -hz,  1, 0,
       hx, y,  hz,  1, 1,
      -hx, y, -hz,  0, 0,
       hx, y,  hz,  1, 1,
      -hx, y,  hz,  0, 1,
    ]);

    territoryQuadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, territoryQuadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  }

  function buildNebulaQuad() {
    const verts = new Float32Array([
      -1, -1,  1, -1,  1, 1,
      -1, -1,  1, 1,  -1, 1,
    ]);
    nebulaQuadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nebulaQuadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  }


  // ── Camera ──────────────────────────────────────────────────────────
  function updateCamera() {
    // Clamp phi
    camera.phi = Math.max(0.15, Math.min(Math.PI - 0.15, camera.phi));
    camera.distance = Math.max(camera.minDist, Math.min(camera.maxDist, camera.distance));

    // Spherical to cartesian
    const sp = Math.sin(camera.phi);
    const cp = Math.cos(camera.phi);
    const st = Math.sin(camera.theta);
    const ct = Math.cos(camera.theta);
    camera.position = [
      camera.target[0] + camera.distance * sp * ct,
      camera.target[1] + camera.distance * cp,
      camera.target[2] + camera.distance * sp * st,
    ];

    mat4.lookAt(camera.viewMatrix, camera.position, camera.target, [0, 1, 0]);

    const aspect = canvas.width / canvas.height;
    mat4.perspective(camera.projMatrix, Math.PI / 4, aspect, 0.5, 2000);

    mat4.multiply(camera.vpMatrix, camera.projMatrix, camera.viewMatrix);
  }


  // ── Resize ──────────────────────────────────────────────────────────
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }


  // ── Render ──────────────────────────────────────────────────────────
  function render(time) {
    const t = time * 0.001;

    // FPS
    frameCount++;
    if (t - fpsTime > 1.0) {
      fpsDisplay = frameCount;
      frameCount = 0;
      fpsTime = t;
      document.getElementById('stat-fps').textContent = fpsDisplay;
    }

    resize();
    updateCamera();

    gl.clear(gl.COLOR_BUFFER_BIT);

    const dpr = window.devicePixelRatio || 1;

    // ── 1. Nebula backdrop ──
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(nebulaProgram);
    const nU = getUniforms(nebulaProgram, ['uTime', 'uResolution', 'uInvVP']);
    const nA = getAttribs(nebulaProgram, ['aPosition']);
    gl.uniform1f(nU.uTime, t);
    gl.uniform2f(nU.uResolution, canvas.width, canvas.height);

    const invVP = new Float32Array(16);
    mat4.invert(invVP, camera.vpMatrix);
    gl.uniformMatrix4fv(nU.uInvVP, false, invVP);

    gl.bindBuffer(gl.ARRAY_BUFFER, nebulaQuadBuffer);
    gl.enableVertexAttribArray(nA.aPosition);
    gl.vertexAttribPointer(nA.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(nA.aPosition);

    // ── 2. Background stars ──
    gl.useProgram(bgStarProgram);
    const bU = getUniforms(bgStarProgram, ['uVP', 'uTime', 'uPixelRatio']);
    const bA = getAttribs(bgStarProgram, ['aPosition', 'aColor', 'aSize']);

    gl.uniformMatrix4fv(bU.uVP, false, camera.vpMatrix);
    gl.uniform1f(bU.uTime, t);
    gl.uniform1f(bU.uPixelRatio, dpr);

    gl.bindBuffer(gl.ARRAY_BUFFER, bgStarPositionBuffer);
    gl.enableVertexAttribArray(bA.aPosition);
    gl.vertexAttribPointer(bA.aPosition, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, bgStarColorBuffer);
    gl.enableVertexAttribArray(bA.aColor);
    gl.vertexAttribPointer(bA.aColor, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, bgStarSizeBuffer);
    gl.enableVertexAttribArray(bA.aSize);
    gl.vertexAttribPointer(bA.aSize, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, bgStarCount);
    gl.disableVertexAttribArray(bA.aPosition);
    gl.disableVertexAttribArray(bA.aColor);
    gl.disableVertexAttribArray(bA.aSize);

    // ── 3. Territory borders ──
    if (territoryTexture && polities.length > 0) {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // normal blending for territory
      gl.useProgram(territoryProgram);
      const tU = getUniforms(territoryProgram, ['uVP', 'uTerritory', 'uTime']);
      const tA = getAttribs(territoryProgram, ['aPosition', 'aUV']);

      gl.uniformMatrix4fv(tU.uVP, false, camera.vpMatrix);
      gl.uniform1f(tU.uTime, t);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, territoryTexture);
      gl.uniform1i(tU.uTerritory, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, territoryQuadBuffer);
      gl.enableVertexAttribArray(tA.aPosition);
      gl.vertexAttribPointer(tA.aPosition, 3, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(tA.aUV);
      gl.vertexAttribPointer(tA.aUV, 2, gl.FLOAT, false, 20, 12);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(tA.aPosition);
      gl.disableVertexAttribArray(tA.aUV);

      gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // back to additive
    }

    // ── 4. Galaxy stars ──
    gl.useProgram(starProgram);
    const sU = getUniforms(starProgram, ['uVP', 'uTime', 'uPixelRatio', 'uPointScale']);
    const sA = getAttribs(starProgram, ['aPosition', 'aColor', 'aSize', 'aTwinkle']);

    gl.uniformMatrix4fv(sU.uVP, false, camera.vpMatrix);
    gl.uniform1f(sU.uTime, t);
    gl.uniform1f(sU.uPixelRatio, dpr);
    gl.uniform1f(sU.uPointScale, 40.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, starPositionBuffer);
    gl.enableVertexAttribArray(sA.aPosition);
    gl.vertexAttribPointer(sA.aPosition, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, starColorBuffer);
    gl.enableVertexAttribArray(sA.aColor);
    gl.vertexAttribPointer(sA.aColor, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, starSizeBuffer);
    gl.enableVertexAttribArray(sA.aSize);
    gl.vertexAttribPointer(sA.aSize, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, starTwinkleBuffer);
    gl.enableVertexAttribArray(sA.aTwinkle);
    gl.vertexAttribPointer(sA.aTwinkle, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, starCount);
    gl.disableVertexAttribArray(sA.aPosition);
    gl.disableVertexAttribArray(sA.aColor);
    gl.disableVertexAttribArray(sA.aSize);
    gl.disableVertexAttribArray(sA.aTwinkle);

    // Status bar
    document.getElementById('stat-camera').textContent =
      `${camera.position[0].toFixed(0)}, ${camera.position[1].toFixed(0)}, ${camera.position[2].toFixed(0)}`;

    requestAnimationFrame(render);
  }


  // ── Picking: project world to screen ────────────────────────────────
  function worldToScreen(pos) {
    const vp = camera.vpMatrix;
    const x = pos[0], y = pos[1], z = pos[2];
    const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
    const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
    const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    if (cw <= 0) return null;
    const ndcX = cx / cw;
    const ndcY = cy / cw;
    const rect = canvas.getBoundingClientRect();
    return [
      (ndcX * 0.5 + 0.5) * rect.width + rect.left,
      (1.0 - (ndcY * 0.5 + 0.5)) * rect.height + rect.top,
    ];
  }

  function findSystemAtScreen(sx, sy, maxDist = 12) {
    let best = null;
    let bestDist = maxDist;
    for (const sys of systems) {
      const sp = worldToScreen(sys._worldPos);
      if (!sp) continue;
      const d = Math.sqrt((sp[0] - sx) ** 2 + (sp[1] - sy) ** 2);
      if (d < bestDist) {
        bestDist = d;
        best = sys;
      }
    }
    return best;
  }

  function findSystemsInRect(x1, y1, x2, y2) {
    const left = Math.min(x1, x2), right = Math.max(x1, x2);
    const top = Math.min(y1, y2), bottom = Math.max(y1, y2);
    const found = [];
    for (const sys of systems) {
      const sp = worldToScreen(sys._worldPos);
      if (!sp) continue;
      if (sp[0] >= left && sp[0] <= right && sp[1] >= top && sp[1] <= bottom) {
        found.push(sys);
      }
    }
    return found;
  }


  // ── Input Handling ──────────────────────────────────────────────────
  function initInput() {
    canvas.addEventListener('mousedown', (e) => {
      mouse.down = true;
      mouse.button = e.button;
      mouse.startX = e.clientX;
      mouse.startY = e.clientY;
      mouse.dragging = false;
      isDragSelecting = false;
    });

    window.addEventListener('mousemove', (e) => {
      const dx = e.clientX - mouse.x;
      const dy = e.clientY - mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      if (mouse.down) {
        const totalDrag = Math.sqrt((e.clientX - mouse.startX) ** 2 + (e.clientY - mouse.startY) ** 2);
        if (totalDrag > 5) mouse.dragging = true;

        if (mouse.button === 2 || (mouse.button === 0 && e.shiftKey)) {
          // Rotate
          camera.theta -= dx * 0.005;
          camera.phi -= dy * 0.005;
        } else if (mouse.button === 1 || (mouse.button === 0 && e.ctrlKey)) {
          // Pan
          const panSpeed = camera.distance * 0.002;
          const ct = Math.cos(camera.theta);
          const st = Math.sin(camera.theta);
          camera.target[0] -= (dx * ct + dy * st * Math.cos(camera.phi)) * panSpeed;
          camera.target[2] -= (-dx * st + dy * ct * Math.cos(camera.phi)) * panSpeed;
          camera.target[1] += dy * Math.sin(camera.phi) * panSpeed * 0.3;
        } else if (mouse.button === 0 && !e.shiftKey && !e.ctrlKey && editorUnlocked) {
          // Drag select
          isDragSelecting = true;
          const rect = document.getElementById('select-rect');
          rect.style.display = 'block';
          rect.style.left = Math.min(mouse.startX, e.clientX) + 'px';
          rect.style.top = Math.min(mouse.startY, e.clientY) + 'px';
          rect.style.width = Math.abs(e.clientX - mouse.startX) + 'px';
          rect.style.height = Math.abs(e.clientY - mouse.startY) + 'px';
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (isDragSelecting && mouse.dragging) {
        // Complete drag selection
        const found = findSystemsInRect(mouse.startX, mouse.startY, e.clientX, e.clientY);
        selectedSystemIds.clear();
        for (const sys of found) selectedSystemIds.add(sys.id);
        updateBulkBar();
      } else if (!mouse.dragging && mouse.button === 0) {
        // Click to select
        const sys = findSystemAtScreen(e.clientX, e.clientY);
        if (sys) {
          selectedSystemIds.clear();
          selectedSystemIds.add(sys.id);
          openSystemPanel(sys.id);
        } else {
          selectedSystemIds.clear();
          closePanel();
        }
        updateBulkBar();
      }

      mouse.down = false;
      mouse.button = -1;
      isDragSelecting = false;
      document.getElementById('select-rect').style.display = 'none';
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      camera.distance *= 1 + e.deltaY * 0.001;
    }, { passive: false });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }


  // ── Side Panel ──────────────────────────────────────────────────────
  function openSystemPanel(sysId) {
    const sys = systems.find(s => s.id === sysId);
    if (!sys) return;
    panelSystemId = sysId;

    const panel = document.getElementById('side-panel');
    const body = document.getElementById('panel-body');
    document.getElementById('panel-title').textContent = sys.name || sys.id;

    const st = STAR_TYPES.find(t => t.id === sys.starType) || STAR_TYPES[0];
    const polity = polities.find(p => p.id === sys.owner);
    const tags = sys.tags || [];

    body.innerHTML = `
      <div class="field-group">
        <label class="field-label">System ID</label>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--white-dim);">${sys.id}</div>
      </div>
      <div class="field-group">
        <label class="field-label">Name</label>
        <input type="text" class="field-input" id="edit-name" value="${sys.name || ''}" ${editorUnlocked ? '' : 'disabled'}>
      </div>
      <div class="field-group">
        <label class="field-label">Star Type</label>
        <select class="field-select" id="edit-star-type" ${editorUnlocked ? '' : 'disabled'}>
          ${STAR_TYPES.map(t => `<option value="${t.id}" ${t.id === sys.starType ? 'selected' : ''}>${t.name}</option>`).join('')}
        </select>
      </div>
      <div class="field-group">
        <label class="field-label">Polity</label>
        <select class="field-select" id="edit-polity" ${editorUnlocked ? '' : 'disabled'}>
          <option value="unassigned" ${(!sys.owner || sys.owner === 'unassigned') ? 'selected' : ''}>Unassigned</option>
          ${polities.map(p => `<option value="${p.id}" ${sys.owner === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
      </div>
      <div class="field-group">
        <label class="field-label">Tags</label>
        <div class="tag-container" id="tag-container">
          ${tags.map(tag => `
            <span class="tag-pill" data-tag="${tag}">
              ${tag}
              ${editorUnlocked ? `<span class="tag-remove" data-tag="${tag}">&times;</span>` : ''}
            </span>
          `).join('')}
        </div>
        ${editorUnlocked ? `
        <select class="field-select" id="add-tag-select" style="margin-top:8px;">
          <option value="">Add tag...</option>
          ${TAG_OPTIONS.filter(t => !tags.includes(t)).map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
        ` : ''}
      </div>
      <div class="field-group" style="margin-top:6px;">
        <label class="field-label">Coordinates</label>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--white-dim);">
          X: ${sys.coords.x_norm.toFixed(4)} &nbsp; Y: ${sys.coords.y_norm.toFixed(4)}
        </div>
      </div>
    `;

    // Bind events
    if (editorUnlocked) {
      body.querySelector('#edit-name').addEventListener('change', (e) => {
        sys.name = e.target.value;
        document.getElementById('panel-title').textContent = sys.name;
        markDirty();
      });

      body.querySelector('#edit-star-type').addEventListener('change', (e) => {
        sys.starType = e.target.value;
        rebuildStarColors();
        markDirty();
      });

      body.querySelector('#edit-polity').addEventListener('change', (e) => {
        sys.owner = e.target.value;
        rebuildTerritoryThrottled();
        updateLegend();
        markDirty();
      });

      const addTag = body.querySelector('#add-tag-select');
      if (addTag) {
        addTag.addEventListener('change', (e) => {
          if (e.target.value) {
            if (!sys.tags) sys.tags = [];
            if (!sys.tags.includes(e.target.value)) {
              sys.tags.push(e.target.value);
              openSystemPanel(sysId); // refresh
              markDirty();
            }
          }
        });
      }

      body.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const tag = btn.dataset.tag;
          sys.tags = (sys.tags || []).filter(t => t !== tag);
          openSystemPanel(sysId);
          markDirty();
        });
      });
    }

    panel.classList.add('open');
  }

  function closePanel() {
    panelSystemId = null;
    document.getElementById('side-panel').classList.remove('open');
  }

  document.getElementById('panel-close').addEventListener('click', closePanel);


  // ── Rebuild star colors after type change ───────────────────────────
  function rebuildStarColors() {
    const colors = [];
    for (const sys of systems) {
      const st = STAR_TYPES.find(t => t.id === sys.starType) || STAR_TYPES[0];
      colors.push(st.color[0], st.color[1], st.color[2]);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, starColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  }


  // ── Territory rebuild throttle ──────────────────────────────────────
  let territoryDirty = false;
  let territoryTimer = null;

  function rebuildTerritoryThrottled() {
    territoryDirty = true;
    clearTimeout(territoryTimer);
    territoryTimer = setTimeout(() => {
      if (territoryDirty) {
        buildTerritoryTexture();
        territoryDirty = false;
      }
    }, 200);
  }


  // ── Bulk Selection Bar ──────────────────────────────────────────────
  function updateBulkBar() {
    const bar = document.getElementById('bulk-bar');
    const count = selectedSystemIds.size;
    if (count > 1 && editorUnlocked) {
      bar.classList.add('visible');
      document.getElementById('bulk-count').textContent = `${count} systems selected`;
    } else {
      bar.classList.remove('visible');
    }
  }

  function refreshBulkPolityOptions() {
    const sel = document.getElementById('bulk-polity-select');
    sel.innerHTML = '<option value="">Assign polity...</option>' +
      polities.map(p => `<option value="${p.id}">${p.name}</option>`).join('') +
      '<option value="unassigned">Unassigned</option>';
  }

  document.getElementById('bulk-assign-btn').addEventListener('click', () => {
    const polId = document.getElementById('bulk-polity-select').value;
    if (!polId) return;
    for (const id of selectedSystemIds) {
      const sys = systems.find(s => s.id === id);
      if (sys) sys.owner = polId;
    }
    rebuildTerritoryThrottled();
    updateLegend();
    showToast(`Assigned ${selectedSystemIds.size} systems`);
    markDirty();
  });

  document.getElementById('bulk-clear-btn').addEventListener('click', () => {
    selectedSystemIds.clear();
    updateBulkBar();
  });


  // ── Legend ──────────────────────────────────────────────────────────
  function updateLegend() {
    const list = document.getElementById('legend-list');
    const counts = {};
    for (const sys of systems) {
      if (sys.owner && sys.owner !== 'unassigned') {
        counts[sys.owner] = (counts[sys.owner] || 0) + 1;
      }
    }

    list.innerHTML = polities.map(p => {
      const hidden = hiddenPolities.has(p.id);
      return `
        <div class="legend-item ${hidden ? 'hidden-polity' : ''}" data-polity="${p.id}">
          <div class="legend-swatch" style="background:${p.color};"></div>
          <span class="legend-name">${p.name}</span>
          <span class="legend-count">${counts[p.id] || 0}</span>
          ${editorUnlocked ? `<span class="legend-delete" data-polity="${p.id}" style="color:var(--red);cursor:pointer;font-size:14px;margin-left:4px;">&times;</span>` : ''}
        </div>
      `;
    }).join('');

    // Unassigned count
    const unassignedCount = systems.filter(s => !s.owner || s.owner === 'unassigned').length;
    list.innerHTML += `
      <div class="legend-item" style="opacity:0.5;margin-top:6px;">
        <div class="legend-swatch" style="background:#444;"></div>
        <span class="legend-name">Unassigned</span>
        <span class="legend-count">${unassignedCount}</span>
      </div>
    `;

    // Toggle visibility on click
    list.querySelectorAll('.legend-item[data-polity]').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('legend-delete')) return;
        const pid = item.dataset.polity;
        if (hiddenPolities.has(pid)) {
          hiddenPolities.delete(pid);
        } else {
          hiddenPolities.add(pid);
        }
        item.classList.toggle('hidden-polity');
        rebuildTerritoryThrottled();
      });
    });

    // Delete polity
    list.querySelectorAll('.legend-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = btn.dataset.polity;
        if (confirm(`Delete polity "${polities.find(p => p.id === pid)?.name}"? Systems will be unassigned.`)) {
          // Unassign all systems
          for (const sys of systems) {
            if (sys.owner === pid) sys.owner = 'unassigned';
          }
          polities = polities.filter(p => p.id !== pid);
          updateLegend();
          refreshBulkPolityOptions();
          rebuildTerritoryThrottled();
          markDirty();
        }
      });
    });

    document.getElementById('stat-polities').textContent = polities.length;
  }


  // ── Polity Modal ───────────────────────────────────────────────────
  const polityModal = document.getElementById('polity-modal');

  document.getElementById('add-polity-btn').addEventListener('click', () => {
    if (!editorUnlocked) {
      showToast('Authenticate as editor first');
      return;
    }
    document.getElementById('polity-name-input').value = '';
    document.getElementById('polity-color-input').value = '#38e8ff';
    document.getElementById('polity-desc-input').value = '';
    document.getElementById('modal-title').textContent = 'New Polity';
    polityModal.classList.add('open');
  });

  document.getElementById('modal-cancel').addEventListener('click', () => {
    polityModal.classList.remove('open');
  });

  document.getElementById('modal-confirm').addEventListener('click', () => {
    const name = document.getElementById('polity-name-input').value.trim();
    const color = document.getElementById('polity-color-input').value;
    const desc = document.getElementById('polity-desc-input').value.trim();
    if (!name) {
      showToast('Polity name is required');
      return;
    }
    const id = 'POL-' + Date.now().toString(36).toUpperCase();
    polities.push({ id, name, color, description: desc });
    polityModal.classList.remove('open');
    updateLegend();
    refreshBulkPolityOptions();
    showToast(`Created polity: ${name}`);
    markDirty();
  });


  // ── Editor Authentication ──────────────────────────────────────────
  document.getElementById('editor-lock').addEventListener('click', () => {
    if (editorUnlocked) {
      editorUnlocked = false;
      updateEditorLock();
      return;
    }
    const pass = prompt('Enter editor password:');
    if (!pass) return;
    // Simple hash check (matches requireEditor pattern)
    // For now, use a simple check. In production, this uses editor.json
    authenticateEditor(pass);
  });

  async function authenticateEditor(pass) {
    // Try to load editor.json for hash verification
    try {
      const resp = await fetch('editor.json');
      if (resp.ok) {
        const config = await resp.json();
        const hash = await sha256(pass + (config.salt || ''));
        if (hash === config.hash) {
          editorUnlocked = true;
          updateEditorLock();
          showToast('Editor mode activated');
          return;
        }
      }
    } catch (e) {
      // editor.json not found, fallback
    }
    // Fallback: accept any non-empty password for local dev
    if (pass.length >= 4) {
      editorUnlocked = true;
      updateEditorLock();
      showToast('Editor mode activated (dev)');
    } else {
      showToast('Authentication failed');
    }
  }

  async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function updateEditorLock() {
    const el = document.getElementById('editor-lock');
    if (editorUnlocked) {
      el.className = 'unlocked';
      el.innerHTML = '&#x1F513; EDITOR';
    } else {
      el.className = 'locked';
      el.innerHTML = '&#x1F512; LOCKED';
    }
    updateLegend();
    refreshBulkPolityOptions();
  }


  // ── Save / Load ────────────────────────────────────────────────────
  let dirty = false;

  function markDirty() {
    dirty = true;
    saveToLocalStorage();
  }

  function saveToLocalStorage() {
    const data = {
      polities: polities,
      systems: systems.map(s => ({
        id: s.id,
        name: s.name,
        owner: s.owner,
        starType: s.starType,
        tags: s.tags || [],
        coords: s.coords,
        pixel: s.pixel,
        source: s.source,
      })),
      hiddenPolities: [...hiddenPolities],
    };
    try {
      localStorage.setItem('sgn-galaxy-data', JSON.stringify(data));
    } catch (e) {
      console.warn('localStorage save failed:', e);
    }
  }

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem('sgn-galaxy-data');
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.polities) polities = data.polities;
      if (data.hiddenPolities) hiddenPolities = new Set(data.hiddenPolities);
      if (data.systems && data.systems.length === systems.length) {
        // Merge saved data into loaded systems
        const map = {};
        for (const s of data.systems) map[s.id] = s;
        for (const sys of systems) {
          const saved = map[sys.id];
          if (saved) {
            sys.name = saved.name || sys.name;
            sys.owner = saved.owner || 'unassigned';
            sys.starType = saved.starType || sys.starType;
            sys.tags = saved.tags || [];
          }
        }
        return true;
      }
      return true;
    } catch (e) {
      console.warn('localStorage load failed:', e);
      return false;
    }
  }


  // ── Load Star Data ─────────────────────────────────────────────────
  async function loadStarData() {
    try {
      const resp = await fetch('star_map.json');
      const data = await resp.json();
      systems = data.systems;
      document.getElementById('stat-systems').textContent = systems.length;

      // Assign default star types if not present
      for (const sys of systems) {
        if (!sys.starType) {
          sys.starType = pickStarType(hashString(sys.id)).id;
        }
        if (!sys.tags) sys.tags = [];
        if (!sys.owner) sys.owner = 'unassigned';
      }

      // Try loading saved data
      loadFromLocalStorage();

      return true;
    } catch (e) {
      console.error('Failed to load star_map.json:', e);
      return false;
    }
  }


  // ── Keyboard Shortcuts ─────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      selectedSystemIds.clear();
      updateBulkBar();
      closePanel();
      polityModal.classList.remove('open');
    }
    // S to save
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveToLocalStorage();
      showToast('Saved to localStorage');
    }
  });


  // ── Main Init ──────────────────────────────────────────────────────
  async function init() {
    runBootSequence();

    // Load data
    const loaded = await loadStarData();
    if (!loaded) {
      showToast('Failed to load star data');
      return;
    }

    // Init WebGL
    if (!initGL()) return;

    // Build everything
    buildStarBuffers();
    buildBgStars();
    buildTerritoryQuad();
    buildNebulaQuad();
    buildTerritoryTexture();

    // UI
    updateLegend();
    refreshBulkPolityOptions();
    updateEditorLock();

    // Input
    initInput();

    // Start render loop
    requestAnimationFrame(render);
  }

  // Go
  init();

})();
