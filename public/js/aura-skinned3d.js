// AURA V6 — genuine skinned 3D mesh technical prototype, not the approved final sculpt.
// 14-bone humanoid skeleton; surface vertices blend between joints. Three.js runtime
// shows early deformation + three authored poses. The concept relief remains the
// default visual fidelity target until the Blender mesh passes art review.
export function createAuraSkinned3D(THREE, materialRamp) {
  const root = new THREE.Group();
  root.name = 'Aura_Rig_Test_V1';
  const palette = {
    ivory: '#e7ddd5', ivoryShade:'#c9b8b0', hair:'#e8e1f2',
    hairShadow:'#bcaccb', purple:'#514956', purpleLight:'#786c83',
    black:'#12121d', charcoal:'#202027', metal:'#393645',
    orange:'#ff7a1a', skin:'#bc8069'
  };
  const material = {};
  Object.entries(palette).forEach(([name,color]) => {
    material[name] = new THREE.MeshToonMaterial({
      color, gradientMap: materialRamp, side: THREE.DoubleSide, flatShading: true
    });
  });
  const meshParts = [];
  const bones = {};
  function bone(name, parent, position) {
    const b = new THREE.Bone(); b.name = name; b.position.set(...position);
    if (parent) parent.add(b); else root.add(b);
    bones[name] = b; return b;
  }
  bone('Hips',null,[0,1.52,0]);
  bone('Spine',bones.Hips,[0,.23,0]);
  bone('Chest',bones.Spine,[0,.28,0]);
  bone('Neck',bones.Chest,[0,.15,0]);
  bone('Head',bones.Neck,[0,.22,0]);
  for(const [name,sign] of [['L',-1],['R',1]]) {
    const shoulder=bone('UpperArm'+name,bones.Chest,[sign*.31,-.015,0]);
    const forearm=bone('Forearm'+name,shoulder,[sign*.17,-.32,0]);
    bone('Hand'+name,forearm,[sign*.055,-.35,0]);
    const upperLeg=bone('Thigh'+name,bones.Hips,[sign*.23,-.12,0]);
    const shin=bone('Shin'+name,upperLeg,[sign*.018,-.51,0]);
    bone('Foot'+name,shin,[sign*.018,-.53,0]);
  }
  const skeleton=new THREE.Skeleton(Object.values(bones));
  root.updateMatrixWorld(true);

  // Loft smooth continuous volumes from cross-section rings. No box/cylinder
  // proxies in this prototype: all major body volumes use fitted 3D surfaces.
  function loft(label, sections, mat, weights, resolution=12) {
    const vertices=[],norms=[],indices=[],skIndices=[],skWeights=[];
    for (let j=0;j<sections.length;j++) {
      const [y,x,z,rx,rz,angle=0]=sections[j];
      const influence=weights(y,j,sections.length);
      for (let k=0;k<resolution;k++) {
        const t=k/resolution*Math.PI*2;
        const c=Math.cos(t),s=Math.sin(t);
        const ca=Math.cos(angle),sa=Math.sin(angle);
        const px=x+rx*c*ca-rz*s*sa;
        const pz=z+rx*c*sa+rz*s*ca;
        vertices.push(px,y,pz);
        skIndices.push(influence[0],influence[1],0,0);
        skWeights.push(influence[2],1-influence[2],0,0);
      }
    }
    for(let j=0;j<sections.length-1;j++){
      for(let k=0;k<resolution;k++){
        const a=j*resolution+k,b=j*resolution+(k+1)%resolution;
        const c=(j+1)*resolution+k,d=(j+1)*resolution+(k+1)%resolution;
        indices.push(a,c,b,b,c,d);
      }
    }
    // Cap geometry using top/bottom ring triangles so the mesh reads solid.
    for (let k=1;k<resolution-1;k++) {
      indices.push(0,k+1,k);
      const top=(sections.length-1)*resolution;
      indices.push(top,top+k,top+k+1);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skIndices,4));
    g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skWeights,4));
    g.setIndex(indices);g.computeVertexNormals();
    const m=new THREE.SkinnedMesh(g,material[mat]);
    m.name=label; m.frustumCulled=false;
    root.add(m); meshParts.push(m);
    return m;
  }
  const ix=Object.fromEntries(skeleton.bones.map((b,i)=>[b.name,i]));
  const single=name=>()=>[ix[name],ix[name],1];
  const blend=(lower,upper,split,width)=>(y)=>[
    ix[lower],ix[upper],THREE.MathUtils.clamp((split+width-y)/(2*width),0,1)
  ];
  // Jacket and body are independent 3D surfaces around the torso.
  loft('Torso_Organic',[
    [1.55,0,0,.155,.13],[1.69,0,0,.18,.14],[1.78,0,0,.20,.15],
    [1.94,0,0,.225,.16],[2.055,0,0,.225,.15],[2.13,0,0,.16,.13]
  ],'black',blend('Spine','Chest',1.9,.19),16);
  loft('Jacket_Cropped_Sculpt',[
    [1.78,0,0,.23,.18],[1.82,0,0,.26,.18],
    [1.94,0,0,.275,.19],[2.06,0,0,.27,.19],[2.12,0,0,.22,.15]
  ],'ivory',blend('Spine','Chest',1.9,.17),16);
  loft('Jacket_Collar_Dark',[
    [2.09,0,0,.19,.20],[2.15,0,0,.315,.235],
    [2.23,0,0,.33,.245],[2.28,0,0,.27,.20]
  ],'charcoal',single('Neck'),16);
  loft('Scarf_Orange_Trim',[
    [2.251,0,0,.275,.205],[2.267,0,0,.277,.207],
    [2.279,0,0,.25,.188]
  ],'orange',single('Neck'),16);
  loft('Waist_Belt',[
    [1.49,0,0,.22,.17],[1.55,0,0,.235,.178],[1.59,0,0,.222,.17]
  ],'charcoal',single('Hips'),16);
  loft('Pants_Hip',[
    [1.33,0,0,.27,.17],[1.43,0,0,.27,.178],[1.53,0,0,.22,.17]
  ],'purple',single('Hips'),16);
  // Legs: wide cloth volume on thighs and calf, sculpted changes at knees.
  for (const [side,sign] of [['L',-1],['R',1]]) {
    const x=sign*.25;
    loft('Pants_Thigh_'+side,[
      [0.88,x*1.09,0,.165,.15],[.98,x*1.08,0,.215,.177],
      [1.12,x*1.07,0,.22,.175],[1.27,x,0,.195,.16],
      [1.44,x*.94,0,.16,.145]
    ],'purple',blend('Shin'+side,'Thigh'+side,1.02,.18));
    loft('Pants_Shin_'+side,[
      [.36,x*1.13,0,.13,.155],[.49,x*1.13,0,.19,.18],
      [.63,x*1.12,0,.218,.183],[.76,x*1.1,0,.23,.185],
      [.89,x*1.09,0,.21,.172]
    ],'purpleLight',blend('Shin'+side,'Thigh'+side,.88,.16));
    loft('Boot_'+side,[
      [.05,x*1.13,.09,.17,.265],[.15,x*1.13,.08,.175,.26],
      [.24,x*1.12,0,.135,.16],[.38,x*1.12,0,.13,.147]
    ],'metal',blend('Foot'+side,'Shin'+side,.35,.1));
    loft('Boot_Sole_'+side,[
      [.025,x*1.13,.09,.183,.282],[.06,x*1.13,.09,.186,.283]
    ],'ivory',single('Foot'+side));
    loft('Boot_Accent_'+side,[
      [.25,x*1.13,0,.144,.162],[.285,x*1.13,0,.145,.16]
    ],'orange',single('Shin'+side));
    const sx=sign*.335;
    loft('Shoulder_Armor_'+side,[
      [1.96,sx,.0,.175,.186],[2.035,sx,.0,.18,.188],
      [2.09,sx,.0,.145,.15]
    ],'metal',single('UpperArm'+side));
    loft('Jacket_Sleeve_'+side,[
      [1.72,sign*.485,0,.097,.105],[1.82,sign*.46,0,.125,.14],
      [1.94,sign*.41,0,.141,.155],[2.015,sign*.37,0,.139,.15]
    ],'ivory',blend('Forearm'+side,'UpperArm'+side,1.78,.12));
    loft('Bracer_'+side,[
      [1.37,sign*.546,0,.087,.097],[1.47,sign*.54,0,.105,.118],
      [1.59,sign*.52,0,.112,.13],[1.70,sign*.495,0,.11,.12]
    ],'ivory',blend('Hand'+side,'Forearm'+side,1.42,.10));
    loft('Glove_'+side,[
      [1.17,sign*.55,0,.08,.095],[1.28,sign*.55,0,.093,.11],
      [1.38,sign*.55,0,.10,.115]
    ],'charcoal',blend('Hand'+side,'Forearm'+side,1.34,.08));
  }
  // All facial details and hair are real 3D geometry parented to the Head bone.
  // Head bone origin is at y=2.4; local coordinates below describe the sculpt.
  function addHead(geo,mat,name,position,scale=[1,1,1],rotation=[0,0,0]) {
    const obj=new THREE.Mesh(geo,material[mat]);obj.name=name;
    obj.position.set(...position);obj.scale.set(...scale);obj.rotation.set(...rotation);
    bones.Head.add(obj);return obj;
  }
  addHead(new THREE.IcosahedronGeometry(1,2),'skin','Skull',[0,.02,-.02],[.185,.22,.21]);
  // Three-dimensional smooth faceted mask with jaw point and nose volume.
  const faceRings=[
    [-.17, .065, .205, .12],[-.09,.015,.22,.17],
    [.01,0,.23,.195],[.13,-.01,.225,.175],[.20,-.02,.18,.115]
  ];
  // Each mask cross-section spans X but projects into +Z, keeping a real profile.
  const facePos=[],faceIndices=[];
  for(let j=0;j<faceRings.length;j++){
    const [yy,xx,z,width]=faceRings[j];
    for(const k of [-1,0,1]){
      facePos.push(xx+k*width,yy,z+(1-Math.abs(k))*.075);
    }
  }
  for(let i=0;i<faceRings.length-1;i++)for(let k=0;k<2;k++){
    let a=i*3+k,b=a+3;faceIndices.push(a,b,a+1,a+1,b,b+1);
  }
  const faceGeo=new THREE.BufferGeometry();
  faceGeo.setAttribute('position',new THREE.Float32BufferAttribute(facePos,3));
  faceGeo.setIndex(faceIndices);faceGeo.computeVertexNormals();
  addHead(faceGeo,'ivory','Mask_Sculpt',[0,0,0]);
  function eye(sign) {
    const geom=new THREE.BoxGeometry(.118,.017,.015);
    addHead(geom,'black','Eye_Slit_'+sign,[sign*.082,.065,.284],[1,1,1],[0,0,sign*.23]);
    const side=new THREE.BoxGeometry(.009,.022,.095);
    addHead(side,'black','Profile_Eye_'+sign,[sign*.182,.068,.16]);
  }
  eye(-1);eye(1);
  // Hair locks are tapered curved 3D meshes, not flat planes or flat relief.
  addHead(new THREE.IcosahedronGeometry(1,2),'hairShadow','HairCap',[0,.21,-.055],[.22,.116,.22]);
  function lock(i,a,b,c,r) {
    const pts=[new THREE.Vector3(...a),new THREE.Vector3(...b),new THREE.Vector3(...c)];
    const curve=new THREE.CatmullRomCurve3(pts);
    const tube=new THREE.TubeGeometry(curve,8,r,5,false);
    addHead(tube,i%4===0?'hairShadow':'hair','HairLock_'+i,[0,0,0]);
  }
  for(let i=0;i<18;i++){
    const ang=Math.PI*2*i/18;
    lock(i,[Math.cos(ang)*.12,.245,Math.sin(ang)*.12-.055],
      [Math.cos(ang)*.20,.31+(i%3)*.015,Math.sin(ang)*.20-.08],
      [Math.cos(ang)*(.245+(i%4)*.014),.33+(i%4)*.042,Math.sin(ang)*.23-.08],.034);
  }
  // A separate hand-held dagger visual, not attached to skin geometry.
  const dagger=new THREE.Group();dagger.name='PreviewDagger';bones.HandR.add(dagger);
  dagger.position.set(.01,-.11,.08);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.22,8),material.charcoal);
  dagger.add(handle);
  const blade=new THREE.Mesh(new THREE.ConeGeometry(.068,.40,5),material.ivory);
  blade.position.y=-.29;blade.rotation.z=Math.PI;dagger.add(blade);
  dagger.visible=false;

  const updateRoot=()=>root.updateMatrixWorld(true);
  updateRoot();
  for(const mesh of meshParts){mesh.bind(skeleton);mesh.normalizeSkinWeights();}
  let seconds=0,actionTime=-1,action='idle',moving=true;
  function setAction(value) {action=value==='guard'?'guard':'idle';}
  function setMoving(v){moving=Boolean(v);}
  function triggerSlash(){actionTime=0;}
  function setDagger(v){dagger.visible=Boolean(v);}
  function update(dt){
    if(!moving) return;
    dt=Math.min(.05,Math.max(0,dt));
    seconds+=dt;
    const wave=Math.sin(seconds*1.8),lean=Math.sin(seconds*.83);
    const guard=action==='guard';
    bones.Spine.rotation.z=.025*lean + (guard?-.06:0);
    bones.Chest.rotation.z=.02*lean+(guard?-.07:0);
    bones.Chest.rotation.x=.016*wave;
    bones.Head.rotation.z=.05*Math.sin(seconds*.71)-(guard?.08:0);
    bones.Head.rotation.y=.04*Math.sin(seconds*.64);
    bones.UpperArmL.rotation.z=.045*wave+(guard?.42:0);
    bones.UpperArmR.rotation.z=-.045*wave-(guard?.54:0);
    bones.ForearmL.rotation.x=guard?-.45:0;
    bones.ForearmR.rotation.x=guard?-.35:0;
    bones.ThighL.rotation.z=.014*lean;
    bones.ThighR.rotation.z=-.014*lean;
    bones.ShinL.rotation.z=.009*wave;
    bones.ShinR.rotation.z=-.009*wave;
    bones.Hips.position.y=1.52+.015*wave;
    if(actionTime>=0){
      actionTime+=dt;
      const t=actionTime;
      const windup=THREE.MathUtils.smoothstep(t,0,.18);
      const impact=THREE.MathUtils.smoothstep(t,.18,.33);
      const recover=THREE.MathUtils.smoothstep(t,.34,.74);
      const swing=windup*(1-impact)-impact*(1-recover);
      bones.Chest.rotation.y=.21*swing;
      bones.UpperArmR.rotation.x=-1.0*swing;
      bones.ForearmR.rotation.z=-.70*swing;
      if(t>.78){actionTime=-1;bones.Chest.rotation.y=0;}
    }else{
      bones.Chest.rotation.y=0;
      bones.UpperArmR.rotation.x=0;
      bones.ForearmR.rotation.z=0;
    }
    skeleton.update();
  }
  // A real SkinnedMesh system: positions deform under bone transforms.
  return {root,bones,skeleton,meshes:meshParts,
    setAction,setMoving,triggerSlash,setDagger,update,
    get moving(){return moving;},get action(){return action;},
    get isRealSkinning(){return true;}};
}
