// Visualizador independiente del blockout de Aura (no sustituye el modelo del combate).
// Geometria procedural inspirada en tools/bl_aura_blockout.py y en el turnaround aprobado.
import * as THREE from 'three';
import { createAuraDetail } from './aura-detail.js';
import { installAuraPersonality } from './aura-personality.js';

const canvas = document.querySelector('#aura-canvas');
const stage = document.querySelector('#preview-stage');
const info = document.querySelector('#preview-status');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 1.6, 6.4);
const ambient = new THREE.HemisphereLight(0xf9ebdf, 0x303047, 2.0);
scene.add(ambient);
const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
keyLight.position.set(-3, 8, 5);
scene.add(keyLight);
const rim = new THREE.DirectionalLight(0xff8526, 1.15);
rim.position.set(3, 4, -5);
scene.add(rim);

const toon = new THREE.DataTexture(new Uint8Array([
  88,88,88,255, 160,160,160,255, 255,255,255,255,
]), 3, 1, THREE.RGBAFormat);
toon.needsUpdate = true;
toon.minFilter = toon.magFilter = THREE.NearestFilter;
const colors = {
  ivory: '#e7ddd5', hair: '#e8e1f2', charcoal: '#202027',
  purple: '#514956', armor: '#393640', orange: '#ff7a1a',
  black: '#080810', skin: '#bf907f',
  purpleLight: '#74677c', darkMetal: '#302c3a', hairShade: '#c4b6d2'
};
const mats = Object.fromEntries(Object.entries(colors).map(([name, color]) => [
  name, new THREE.MeshToonMaterial({color, gradientMap: toon})
]));
const aura = new THREE.Group();
scene.add(aura);

function mesh(geometry, material, position, rotation) {
  const obj = new THREE.Mesh(geometry, mats[material]);
  obj.position.set(...position);
  if (rotation) obj.rotation.set(...rotation);
  aura.add(obj);
  // El contorno usa casco invertido; solo en piezas grandes para ahorrar draw calls.
  if (['ivory','purple','armor','hair'].includes(material)) {
    const outline = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color:'#0c0d14', side:THREE.BackSide}));
    outline.scale.setScalar(1.035);
    obj.add(outline);
  }
  return obj;
}
function box(name, position, dimensions, material, bevel=false) {
  const o=mesh(new THREE.BoxGeometry(...dimensions), material, position);
  o.name=name;
  return o;
}
function ellipsoid(name, position, radii, material, detail=1) {
  const o=mesh(new THREE.IcosahedronGeometry(1,detail),material,position);
  o.name=name; o.scale.set(...radii);
  return o;
}
function link(name,a,b,r1,r2,material,sides=7) {
  const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),dif=vb.clone().sub(va);
  const o=mesh(new THREE.CylinderGeometry(r2,r1,dif.length(),sides),material,va.clone().add(vb).multiplyScalar(.5).toArray());
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dif.normalize());
  o.name=name; return o;
}
function spike(name, pos, radius, height, angle, material) {
  const o=mesh(new THREE.ConeGeometry(radius,height,5),material,pos);
  o.rotation.set(angle[0],angle[1],angle[2]); o.name=name;
}
// Body proportions: 2.76 units tall. This is unrigged visual proxy, not the Blender GLB.
box('Inner torso',[0,1.76,0],[.38,.48,.24],'charcoal');
box('Ivory cropped jacket',[0,1.90,.035],[.46,.29,.28],'ivory');
box('Jacket lower trim',[0,1.79,.035],[.46,.075,.30],'armor');
box('Tall scarf collar',[0,2.15,.025],[.49,.22,.38],'charcoal');
box('Orange scarf line',[0,2.18,.231],[.38,.029,.025],'orange');
box('Waist',[0,1.50,0],[.36,.28,.26],'purple');
box('Belt',[0,1.62,.04],[.44,.085,.31],'charcoal');
box('Belt clasp',[0,1.62,.218],[.09,.065,.025],'armor');
box('Hip flap',[-.31,1.32,.015],[.18,.40,.25],'armor');
for (const side of [-1,1]) {
  const n=side===-1?'L':'R', x=side*.24;
  link(n+' thigh',[x,1.48,0],[x*1.05,1.02,0],.177,.15,'purple');
  ellipsoid(n+' pants knee',[x*1.05,.99,0],[.16,.19,.145],'purple');
  link(n+' baggy calf',[x*1.05,.97,0],[x*1.16,.45,0],.19,.115,'purple');
  box(n+' boot shaft',[x*1.16,.34,.01],[.25,.39,.29],'armor');
  box(n+' shoe',[x*1.16,.13,.12],[.31,.20,.48],'charcoal');
  box(n+' sole',[x*1.16,.05,.12],[.33,.07,.51],'ivory');
  box(n+' boot orange',[x*1.16,.34,.165],[.04,.18,.025],'orange');
  box(n+' shoulder',[x*1.40,2.03,0],[.27,.19,.36],'armor');
  link(n+' upper arm',[x*1.5,1.99,0],[x*1.70,1.68,.018],.116,.104,'ivory');
  ellipsoid(n+' elbow',[x*1.7,1.66,.018],[.11,.11,.11],'armor');
  link(n+' forearm',[x*1.7,1.63,.02],[x*1.83,1.33,.05],.11,.085,'ivory');
  box(n+' glove',[x*1.86,1.22,.08],[.15,.20,.16],'charcoal');
  box(n+' wrist orange',[x*1.83,1.35,.14],[.12,.03,.02],'orange');
}
link('Neck',[0,2.22,0],[0,2.34,0],.11,.105,'charcoal',8);
ellipsoid('Head',[0,2.49,0],[.185,.26,.205],'ivory',2);
ellipsoid('Faceted mask',[0,2.49,.15],[.175,.235,.11],'ivory',1);
for (const side of [-1,1]) {
  const eye=box('Black eye slit',[side*.084,2.50,.251],[.105,.034,.022],'black');
  eye.rotation.z=side*.20;
}
ellipsoid('Hair crown',[0,2.66,-.055],[.205,.11,.19],'hair',1);
for (let i=0;i<9;i++) {
  const a=2*Math.PI*i/9;
  spike('Hair spike '+i,[Math.cos(a)*.17,2.72+(i%3)*.02,Math.sin(a)*.12-.045],
    .10,.23+(i%3)*.05,[Math.sin(a)*.36,0,-Math.cos(a)*.38],'hair');
}

// Switchable preview: legacy geometry remains to compare silhouette changes.
// Detailed mesh is still a procedural art study (NOT a rigged glTF asset).
const detailed = createAuraDetail(THREE, mats);
const personality = installAuraPersonality(THREE, detailed);
scene.add(detailed.root);
aura.visible = false; // The new detailed revision is the default review view.
let detailMode = true;
let daggerShown = false;
const poseButton = document.querySelector('#preview-pose');
const motionButton = document.querySelector('#preview-motion');
poseButton.addEventListener('click',()=>{
  personality.setPose(personality.pose === 'guard' ? 'idle' : 'guard');
  poseButton.textContent = personality.pose === 'guard' ? 'Pose relajada' : 'Pose de combate';
});
motionButton.addEventListener('click',()=>{
  personality.setPlaying(!personality.playing);
  motionButton.textContent = personality.playing ? 'Pausar movimiento' : 'Reanudar movimiento';
});
const modeButton = document.querySelector('#preview-mode');
const weaponButton = document.querySelector('#preview-weapon');
function updatePreviewMode() {
  detailed.root.visible = detailMode;
  aura.visible = !detailMode;
  modeButton.textContent = detailMode ? 'Ver blockout V1' : 'Ver detalle V2';
  weaponButton.disabled = !detailMode;
  poseButton.disabled = !detailMode;
  motionButton.disabled = !detailMode;
  detailed.weapon.visible = detailMode && daggerShown;
  weaponButton.setAttribute('aria-pressed',String(detailMode && daggerShown));
  info.textContent = detailMode
    ? 'Aura V3 · respiración, actitud y movimiento secundario · prototipo sin rigging'
    : 'Blockout V1 · comparación de geometría inicial';
}
modeButton.addEventListener('click',()=>{detailMode=!detailMode;updatePreviewMode();});
weaponButton.addEventListener('click',()=>{daggerShown=!daggerShown;updatePreviewMode();});
updatePreviewMode();

// Display stand and neutral figure; accessories and weapons are intentionally separate.
const disk=new THREE.Mesh(new THREE.CylinderGeometry(.80,.84,.06,60),new THREE.MeshStandardMaterial({color:0x24202f,roughness:.88}));
disk.position.y=-.05; scene.add(disk);
const circle=new THREE.Mesh(new THREE.TorusGeometry(.76,.008,3,64),new THREE.MeshBasicMaterial({color:0xff7a1a}));
circle.rotation.x=Math.PI/2; circle.position.y=-.015; scene.add(circle);

const state = { yaw: -0.45, pitch: .06, zoom: 6.4, dragging: false, oldX:0, oldY:0 };
function positionCamera() {
  const target = new THREE.Vector3(0,1.36,0);
  camera.position.set(
    Math.sin(state.yaw)*Math.cos(state.pitch)*state.zoom,
    target.y+Math.sin(state.pitch)*state.zoom,
    Math.cos(state.yaw)*Math.cos(state.pitch)*state.zoom
  );
  camera.lookAt(target);
}
function reset() { state.yaw=-.45; state.pitch=.06; state.zoom=6.4; positionCamera(); }
document.querySelector('#preview-reset').addEventListener('click',reset);
document.querySelector('#preview-front').addEventListener('click',()=>{state.yaw=0;state.pitch=0;positionCamera();});
document.querySelector('#preview-side').addEventListener('click',()=>{state.yaw=Math.PI/2;state.pitch=0;positionCamera();});
document.querySelector('#preview-back').addEventListener('click',()=>{state.yaw=Math.PI;state.pitch=0;positionCamera();});
document.querySelector('#preview-zoom-in').addEventListener('click',()=>{state.zoom=Math.max(3.2,state.zoom-.6);positionCamera();});
document.querySelector('#preview-zoom-out').addEventListener('click',()=>{state.zoom=Math.min(11,state.zoom+.6);positionCamera();});
canvas.addEventListener('pointerdown',e=>{state.dragging=true;state.oldX=e.clientX;state.oldY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
  if(!state.dragging)return;
  state.yaw-=((e.clientX-state.oldX)*.009);
  state.pitch=Math.max(-.5,Math.min(.7,state.pitch+(e.clientY-state.oldY)*.006));
  state.oldX=e.clientX;state.oldY=e.clientY;positionCamera();
});
canvas.addEventListener('pointerup',()=>{state.dragging=false;});
canvas.addEventListener('pointercancel',()=>{state.dragging=false;});
canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.max(3.2,Math.min(11,state.zoom+e.deltaY*.006));positionCamera();},{passive:false});
function resize() {
  const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
reset();resize();
// updatePreviewMode() communicates the currently selected model.
const clock = new THREE.Clock();
function animate() {
  personality.update(clock.getDelta());
  renderer.render(scene,camera);
  requestAnimationFrame(animate);
}
animate();
