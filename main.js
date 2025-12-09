import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";

// Boot the scene (this is the same code you already have in index.html)
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e13);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 50000);
camera.position.set(0, 0, 1500);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const key = new THREE.DirectionalLight(0xffffff, 0.6); key.position.set(1,1,1);
const fill = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(key, fill);

const url = "./systems.json";
const ownerName = "Arandorë Eldainë";

fetch(url).then(r => r.json()).then(data => {
  const imgW = data?.image_size?.width  ?? 1090;
  const imgH = data?.image_size?.height ?? 1494;

  const SCALE = 2200;
  const aspect = imgW / imgH;
  const worldW = SCALE;
  const worldH = SCALE / aspect;

  const matCore  = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
  const sphere = new THREE.SphereGeometry(6, 16, 16);

  const group = new THREE.Group();
  data.systems.forEach(sys => {
    let xn = sys.coords?.x_norm;
    let yn = sys.coords?.y_norm;
    if (xn == null || yn == null) {
      const px = sys.pixel?.x ?? 0;
      const py = sys.pixel?.y ?? 0;
      xn = px / imgW;
      yn = py / imgH;
    }
    const x = (xn - 0.5) * worldW;
    const y = -(yn - 0.5) * worldH;
    const z = 0;

    const dot = new THREE.Mesh(sphere, matCore);
    dot.position.set(x, y, z);
    dot.userData = { id: sys.id, name: sys.name, owner: sys.owner || ownerName };
    group.add(dot);
  });
  scene.add(group);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const tip = document.createElement('div');
  tip.style.cssText = "position:fixed;padding:6px 8px;background:#111c;border:1px solid #444;border-radius:8px;pointer-events:none;display:none;color:#fff;font:12px/1.3 system-ui";
  document.body.appendChild(tip);

  window.addEventListener('mousemove', (e) => {
    mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(group.children, false)[0];
    if(hit){
      const d = hit.object.userData;
      tip.innerHTML = `<strong>${d.name}</strong><br/>Owner: ${d.owner}<br/><small>${d.id}</small>`;
      tip.style.left = (e.clientX + 12) + "px";
      tip.style.top  = (e.clientY + 12) + "px";
      tip.style.display = 'block';
    } else {
      tip.style.display = 'none';
    }
  });
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

(function loop(){
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
})();
