// NEÓN — AURA V3 personality rig (PROCEDURAL PREVIEW ONLY).
// Adds presentation joints by grouping existing meshes around approximate pivots.
// This is not a deforming skeleton, animation library or gameplay animation.
export function installAuraPersonality(THREE, detail) {
  const root = detail.root;
  const parts = [...root.children].filter(o => o.isMesh);
  const sections = {
    head: new THREE.Group(), hair: new THREE.Group(), chest: new THREE.Group(),
    leftArm: new THREE.Group(), rightArm: new THREE.Group(),
    leftLeg: new THREE.Group(), rightLeg: new THREE.Group()
  };
  const pivotPositions = {
    head: [0,2.31,0], chest:[0,1.71,0],
    leftArm:[-.36,2.035,0],rightArm:[.36,2.035,0],
    leftLeg:[-.23,1.47,0],rightLeg:[.23,1.47,0]
  };
  for (const [name,group] of Object.entries(sections)) {
    group.name = 'AURA_V3_' + name.toUpperCase();
    if(name !== 'hair') {
      group.position.set(...pivotPositions[name]);
      root.add(group);
    }
  }
  // Compute world bounding-box centers rather than mesh.position: some garments
  // use extruded geometry with absolute vertex positions and origin (0,0,0).
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const obj of parts) {
    box.setFromObject(obj);
    const c=box.getCenter(new THREE.Vector3());
    let part=null;
    if(c.y>2.345) part=sections.head;
    else if(c.y>1.15 && c.y<2.11 && Math.abs(c.x)>.36) part=c.x<0?sections.leftArm:sections.rightArm;
    else if(c.y<1.47 && Math.abs(c.x)>.075) part=c.x<0?sections.leftLeg:sections.rightLeg;
    else if(c.y>1.62 && c.y<2.31) part=sections.chest;
    if (part) part.attach(obj);
  }
  // Secondary hair pivots are children of the head and preserve world positions.
  sections.hair.position.set(0,.34,-.035);
  sections.head.add(sections.hair);
  root.updateMatrixWorld(true);
  const hairMeshes=sections.head.children.filter(o=>o.isMesh && /^(hair|hairShade)_/.test(o.name));
  for(const obj of hairMeshes) sections.hair.attach(obj);

  const makeMaterial = (color) => new THREE.MeshToonMaterial({
    color,gradientMap:detail.root.children.find(o=>o.isMesh&&o.material?.gradientMap)?.material.gradientMap
  });
  const scarfMat=makeMaterial('#23212c');
  const trimMat=makeMaterial('#ff7a1a');
  const eyeMat=new THREE.MeshBasicMaterial({color:0xff8d28,transparent:true,opacity:.2,depthWrite:false});
  // Two flowing scarf tails: intentionally stylized, not physically simulated.
  function taperStrip(parent,pts,material,name) {
    const shape=new THREE.Shape();
    pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
    shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.013,bevelEnabled:false});
    const mesh=new THREE.Mesh(geo,material);mesh.name=name;
    parent.add(mesh);return mesh;
  }
  const scarf = new THREE.Group();
  scarf.position.set(-.17,2.13,-.185);
  root.add(scarf);
  taperStrip(scarf,[[0,0],[-.12,-.03],[-.25,-.17],[-.43,-.26],[-.26,-.23],[-.1,-.13]],scarfMat,'scarf_tail');
  taperStrip(scarf,[[-.11,-.09],[-.24,-.18],[-.38,-.23],[-.23,-.20]],trimMat,'scarf_tail_trim');
  const scarf2 = new THREE.Group();scarf2.position.set(.15,2.14,-.19);root.add(scarf2);
  taperStrip(scarf2,[[0,0],[.11,-.02],[.22,-.13],[.32,-.24],[.16,-.19],[.05,-.1]],scarfMat,'secondary_tail');
  // Eyes: very restrained orange glint only when guard pose is selected.
  const glints=[];
  for(const sign of [-1,1]) {
    const glow=new THREE.Mesh(new THREE.BoxGeometry(.065,.011,.007),eyeMat.clone());
    glow.position.set(sign*.089,2.505,.308);
    sections.head.add(glow);
    glints.push(glow);
  }
  let time=0;
  let pose='idle';
  let playing=true;
  function update(dt) {
    if (!playing || !root.visible) return;
    time+=Math.min(dt,.05);
    const t=time, breath=Math.sin(t*1.65), sway=Math.sin(t*.79);
    const ready=pose==='guard';
    const settle=ready?1:0;
    // Asymmetric fighter pose; constantly changing weight and breathing.
    root.position.y=.016*breath - settle*.06;
    root.rotation.z=.015*sway - settle*.052;
    root.rotation.y=.026*Math.sin(t*.53)+settle*.14;
    sections.chest.scale.set(1+.008*breath,1+.016*breath,1+.008*breath);
    sections.chest.rotation.z=.018*sway-settle*.07;
    sections.head.rotation.z=.042*Math.sin(t*.88)-settle*.09;
    sections.head.rotation.y=.035*Math.sin(t*.63)+settle*.08;
    sections.hair.rotation.z=.032*Math.sin(t*1.70+.65);
    sections.hair.rotation.x=.025*Math.sin(t*1.42);
    sections.leftArm.rotation.z=.045*breath+settle*.52;
    sections.rightArm.rotation.z=-.037*breath-settle*.82;
    sections.leftArm.rotation.x=.021*sway+settle*.20;
    sections.rightArm.rotation.x=-.025*sway-settle*.18;
    sections.leftLeg.rotation.z=.014*sway+settle*.055;
    sections.rightLeg.rotation.z=-.012*sway-settle*.08;
    scarf.rotation.z=.11*Math.sin(t*1.2+.2)+settle*.11;
    scarf2.rotation.z=-.08*Math.sin(t*1.4+.8);
    scarf.rotation.x=.06*Math.sin(t*.9);
    const intensity=ready?(0.54+Math.sin(t*2.1)*.12):0.13;
    for(const glint of glints)glint.material.opacity=intensity;
  }
  function setPose(next) {pose=next==='guard'?'guard':'idle';}
  function setPlaying(next) {playing=Boolean(next);}
  function resetAnimation() {
    time=0;pose='idle';playing=true;
    for(const part of Object.values(sections)) {
      part.rotation.set(0,0,0);part.scale.set(1,1,1);
    }
    root.rotation.set(0,0,0);root.position.set(0,0,0);
  }
  return {update,setPose,setPlaying,resetAnimation,get pose(){return pose;},get playing(){return playing;}};
}
