// Aura visual iteration 2. REVIEW MODEL ONLY; not rigged, not the game character.
// 3D sculptural proxy: silhouette/materials follow character-documentation/AURA.md.
export function createAuraDetail(THREE, toonMaterials) {
  const root = new THREE.Group();
  root.name = 'AURA_DETAIL_V2';
  const weapon = new THREE.Group();
  weapon.name = 'AURA_SIGNATURE_DAGGER';
  const line = new THREE.MeshBasicMaterial({color:0x0c0b13,side:THREE.BackSide});
  const m = toonMaterials;
  let count = 0;

  function add(geo, material, x,y,z, sx=1,sy=1,sz=1, parent=root, edge=false) {
    const o = new THREE.Mesh(geo,m[material]);
    o.position.set(x,y,z);
    o.scale.set(sx,sy,sz);
    parent.add(o);
    o.name = material + '_' + (++count);
    if(edge) {
      const back=new THREE.Mesh(geo,line);
      back.scale.setScalar(1.024);
      o.add(back);
    }
    return o;
  }
  function cube(material,p,d, edge=false, parent=root) {
    return add(new THREE.BoxGeometry(1,1,1),material,...p,...d,parent,edge);
  }
  function orb(material,p,r,detail=1, edge=false,parent=root) {
    return add(new THREE.IcosahedronGeometry(1,detail),material,...p,...r,parent,edge);
  }
  function bar(material,a,b,ra,rb=ra,sides=8, edge=false,parent=root) {
    const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b);
    const d=vb.clone().sub(va), len=d.length();
    const o=add(new THREE.CylinderGeometry(rb,ra,len,sides,1),material,...va.clone().add(vb).multiplyScalar(.5).toArray(),1,1,1,parent,edge);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
    return o;
  }
  function poly(material, pts, z, depth=.03, parent=root) {
    const shape=new THREE.Shape();
    pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
    shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:1,steps:1});
    const o=add(geo,material,0,0,z,1,1,1,parent);
    return o;
  }
  function strand(material,start,end,thick=.055) {
    return bar(material,start,end,thick,.003,5);
  }
  function ring(material,p,radius=.075,tube=.012,parent=root) {
    const o=add(new THREE.TorusGeometry(radius,tube,5,16),material,...p,1,1,1,parent);
    return o;
  }
  // Silhouette: approx. 2.79 m in scene units, tall boots, large collar.
  // Anatomical underlay first; ivory cropped jacket leaves an exposed midriff.
  orb('charcoal',[0,1.89,0],[.245,.33,.16],2);
  orb('skin',[0,1.65,.025],[.175,.13,.12],1);
  poly('charcoal',[[-.18,1.67],[.18,1.67],[.19,1.59],[-.18,1.59]],.132);
  orb('purple',[0,1.45,-.012],[.213,.195,.17],1);

  // Asymmetric cropped jacket: cream panels, dark split, hems and fasteners.
  poly('ivory',[[-.245,2.14],[-.055,2.14],[-.063,1.91],[-.105,1.79],[-.26,1.82],[-.295,1.99]],.175,.065);
  poly('ivory',[[.245,2.14],[.055,2.14],[.07,1.92],[.13,1.81],[.27,1.82],[.303,1.99]],.175,.065);
  poly('armor',[[-.25,1.83],[-.098,1.805],[-.095,1.774],[-.265,1.785]],.239,.021);
  poly('armor',[[.25,1.83],[.115,1.805],[.11,1.774],[.264,1.785]],.239,.021);
  poly('orange',[[.007,2.084],[.057,2.02],[.01,1.992],[-.033,2.035]],.239,.013);
  cube('darkMetal',[[-.13,1.95,.248]][0],[.030,.036,.014]);
  cube('darkMetal',[[.16,2.07,.246]][0],[.032,.035,.015]);
  // High dark scarf: layered faceted shapes, orange inside lip.
  orb('charcoal',[0,2.175,.027],[.275,.15,.228],1,true);
  poly('darkMetal',[[-.275,2.245],[.28,2.245],[.215,2.12],[-.185,2.10]],.226,.045);
  poly('orange',[[-.235,2.247],[-.12,2.264],[0,2.21],[.115,2.258],[.242,2.245],[.202,2.218],[0,2.177],[-.208,2.22]],.270,.013);
  poly('charcoal',[[-.22,2.21],[.16,2.18],[.245,2.08],[.05,2.035],[-.19,2.10]],.29,.024);
  poly('orange',[[-.14,2.055],[-.06,2.045],[0,2.025],[.035,2.053]],.316,.013);
  // Rear angular scarf layers.
  poly('darkMetal',[[-.23,2.27],[.23,2.26],[.18,2.08],[-.18,2.08]],-.267,.035);
  poly('orange',[[-.16,2.08],[0,2.03],[.15,2.075]],-.290,.012);

  // Waist buckles, offset hip rig and trailing belt straps.
  cube('charcoal',[0,1.56,.05],[.435,.095,.34],true);
  cube('armor',[0,1.566,.253],[.12,.09,.028]);
  cube('darkMetal',[0,1.568,.271],[.078,.048,.013]);
  cube('orange',[0,1.565,.283],[.035,.016,.014]);
  for(const sign of [-1,1]){
    const x=sign*.18;
    cube('darkMetal',[x,1.57,.219],[.055,.09,.03]);
    cube('orange',[x,1.575,.239],[.018,.058,.011]);
  }
  poly('charcoal',[[-.21,1.55],[-.36,1.48],[-.34,1.18],[-.22,1.10],[-.215,1.35]],.155,.06);
  cube('armor',[-.325,1.244,.223],[.12,.085,.05]);
  cube('orange',[-.36,1.25,.257],[.022,.05,.013]);
  bar('charcoal',[.265,1.52,.06],[.305,1.13,.025],.045,.035,5);
  bar('charcoal',[-.315,1.48,-.08],[-.33,1.28,-.07],.05,.040,5);

  // Trousers: fractured low-poly panels, generous silhouette at knees.
  for(const sign of [-1,1]){
    const suffix=sign<0?'L':'R', x=sign*.226;
    bar('purple',[x,1.47,-.005],[x*1.11,1.05,.0],.186,.210,7,true);
    orb('purple',[x*1.12,1.01,0],[.222,.216,.182],1,true);
    bar('purple',[x*1.13,1.0,0],[x*1.20,.47,-.01],.202,.145,7,true);
    // Shading facets/protruding folds, not random surface noise.
    poly('purpleLight',[[x-sign*.17,1.34],[x+sign*.08,1.24],[x+sign*.07,1.13],[x-sign*.115,1.19]],.180,.010);
    poly('darkMetal',[[x-sign*.13,.91],[x+sign*.12,.82],[x+sign*.08,.66],[x-sign*.055,.73]],.171,.012);
    bar('purpleLight',[x-sign*.06,.69,.192],[x+sign*.08,.50,.12],.014,.012,5);
    cube('darkMetal',[x*1.20,.43,.01],[.264,.104,.32],true);
    cube('armor',[x*1.20,.35,-.008],[.23,.34,.29],true);
    cube('charcoal',[x*1.2,.148,.126],[.315,.21,.49],true);
    cube('ivory',[x*1.20,.046,.135],[.332,.073,.515]);
    cube('armor',[x*1.2,.18,.35],[.22,.125,.05]);
    cube('orange',[x*1.20,.335,.164],[.035,.16,.023]);
    bar('orange',[x*1.2-sign*.10,.395,.164],[x*1.2+sign*.10,.395,.164],.012,.012,5);
    cube('darkMetal',[x*1.20,.27,.174],[.18,.07,.03]);
    cube('ivory',[x*1.20,.275,.195],[.09,.026,.012]);
    // Angular articulated shoulder plates and slanted sleeves.
    const sh=sign*.345;
    orb('armor',[sh,2.034,0],[.23,.13,.215],1,true);
    poly('darkMetal',[[sh-sign*.22,2.09],[sh+sign*.19,2.08],[sh+sign*.18,1.97],[sh-sign*.19,1.965]],.202,.05);
    poly('orange',[[sh-sign*.07,2.05],[sh+sign*.09,2.04],[sh+sign*.065,2.016]],.26,.018);
    bar('ivory',[sign*.39,1.99,0],[sign*.425,1.75,.0],.13,.119,7,true);
    orb('armor',[sign*.433,1.70,.012],[.124,.107,.124],1);
    bar('ivory',[sign*.437,1.675,.015],[sign*.465,1.38,.035],.122,.09,7,true);
    poly('purpleLight',[[sign*.345,1.62],[sign*.51,1.58],[sign*.51,1.52],[sign*.36,1.53]],.148,.018);
    cube('charcoal',[sign*.464,1.31,.036],[.18,.17,.17],true);
    cube('orange',[sign*.47,1.37,.134],[.13,.027,.015]);
    for(let j=0;j<3;j++) cube('darkMetal',[sign*.455,1.28+j*.046,.13],[.12,.019,.018]);
    // Hands open, weapon held separately in the review model.
    cube('skin',[sign*.465,1.20,.052],[.105,.09,.12]);
  }
  // Mask and head: bone-ivory faceted mask, sharp negative-space eyes.
  bar('charcoal',[0,2.23,0],[0,2.32,0],.105,.095);
  orb('skin',[0,2.48,-.035],[.185,.235,.192],2);
  // Low-poly mask sculpt: front narrowed at jaw, forehead wider.
  const maskV=new Float32Array([
    -.177,2.605,.124, .177,2.605,.124, -.169,2.505,.219, .169,2.505,.219,
    -.112,2.385,.209, .112,2.385,.209, 0,2.325,.158, 0,2.550,.276
  ]);
  const maskI=[0,2,7,0,7,1,1,7,3,2,4,6,2,6,7,7,6,5,7,5,3,3,5,1];
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(maskV,3));
  geo.setIndex(maskI);geo.computeVertexNormals();
  const mask=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color:0xe7ddd5,gradientMap:m.ivory.gradientMap,side:THREE.DoubleSide,flatShading:true}));
  mask.name='Signature angular mask';root.add(mask);
  // Mask eyes are narrow black triangular polygons above the surface.
  poly('black',[[-.148,2.524],[-.031,2.505],[-.045,2.483],[-.127,2.496]],.276,.010);
  poly('black',[[.148,2.524],[.031,2.505],[.045,2.483],[.127,2.496]],.276,.010);
  bar('purpleLight',[0,2.43,.249],[0,2.37,.208],.004,.003,5);
  // Hair: chunky sculpted anime locks, concentrated near crown/back.
  orb('hair',[0,2.661,-.043],[.225,.116,.22],1,true);
  orb('hairShade',[0,2.604,-.177],[.20,.13,.112],1);
  for(let i=0;i<13;i++){
    const theta=i*Math.PI*2/13;
    const x=.182*Math.cos(theta), z=-.045+.18*Math.sin(theta);
    const a=[x,2.665,z],b=[x+Math.cos(theta)*.10,2.72+(i%4)*.040,z+Math.sin(theta)*.094];
    strand(i%4===0?'hairShade':'hair',a,b,.087);
  }
  for(let i=0;i<4;i++){
    strand('hair',[ -.09+i*.054,2.715,.13],[-.16+i*.087,2.61,.18],.072);
  }

  // Signature dagger for silhouette only; one selectable weapon per fight.
  // Blade points toward the floor next to the left arm, not attached to body.
  const blade=weapon;
  bar('charcoal',[-.49,1.16,.09],[-.58,1.00,.22],.042,.038,7,false,blade);
  bar('orange',[-.565,1.028,.21],[-.56,.965,.23],.066,.015,6,false,blade);
  const bladeGeo=new THREE.ConeGeometry(.085,.52,4,1);
  const sharp=add(bladeGeo,'ivory',-.71,.75,.24,1,1,.60,blade,true);
  sharp.rotation.z=-.20;
  const inner=add(new THREE.ConeGeometry(.022,.37,3),'orange',-.709,.78,.265,1,1,.9,blade);
  inner.rotation.z=-.20;
  const pommel=add(new THREE.TorusGeometry(.063,.018,5,12),'orange',-.485,1.16,.09,1,1,1,blade);
  weapon.visible=false;
  root.add(weapon);
  return {root,weapon,getPieceCount:()=>count};
}
