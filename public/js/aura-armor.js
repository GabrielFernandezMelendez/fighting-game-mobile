import { DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import { outlineMaterial } from './models.js';
import { painter } from './aura-mesh.js';

const cut = `
  float collarX = abs(vAuraArmorRest.x);
  float seam = 2.102 + 0.73 * min(0.14, collarX);
  if (uAuraArmor > 0.5 && (
    (collarX < 0.224 && vAuraArmorRest.y > seam) ||
    vAuraArmorRest.y > 2.278
  )) discard;
`;

function installClip(material, enabled) {
  const compile=material.onBeforeCompile;
  const program=material.customProgramCacheKey();
  material.customProgramCacheKey=()=>program+'-aura-collar';
  material.onBeforeCompile=shader=>{
    compile(shader);
    shader.uniforms.uAuraArmor=enabled;
    shader.vertexShader='varying vec3 vAuraArmorRest;\n'+shader.vertexShader.replace(
      '#include <project_vertex>', 'vAuraArmorRest = position;\n#include <project_vertex>'
    );
    shader.fragmentShader='varying vec3 vAuraArmorRest; uniform float uAuraArmor;\n'+shader.fragmentShader.replace(
      '#include <opaque_fragment>', cut+'\n#include <opaque_fragment>'
    );
  };
}

function buildScarf() {
  const paint=painter();
  const n=16;
  // Radio lateral, radio frontal, altura y caída en V del frente.
  const rows=[
    [.174,.153,2.155,.079],
    [.254,.222,2.225,.119],
    [.220,.229,2.274,.108],
    [.218,.197,2.351,.090],
    [.228,.198,2.371,.092],
    [.180,.160,2.361,.087],
    [.119,.108,2.274,.028],
    [.122,.105,2.162,.001],
  ];
  const rings=rows.map(([x,z,y,dip],r)=>Array.from({length:n},(_,i)=>{
    const a=(i+.5)*2*Math.PI/n;
    const front=Math.max(0,Math.cos(a));
    const back=Math.max(0,-Math.cos(a));
    const fold=r===2 ? .012*Math.sin(a*2) : 0;
    return [x*Math.sin(a),y-dip*front**2+.017*back+fold,z*Math.cos(a)-.011];
  }));
  const palette=[
    ['#231D2D','#302638','#392D43'],
    ['#302739','#41364A','#4D4055'],
    ['#282131','#362B40','#484052'],
    ['#7C321D','#B94A1A','#DF6317'],
    ['#BE4C15','#FF7A1A','#FF9A36'],
    ['#652719','#A23C15','#E75D13'],
    ['#211925','#301F2A','#49303B'],
    ['#261F31','#281F30','#362B40'],
  ];
  for(let r=0;r<rings.length;r++) for(let i=0;i<n;i++) {
    const j=(i+1)%n;
    const next=rings[(r+1)%rings.length];
    const light = i>=9&&i<=14 ? 2 : i<=4||i===15 ? 1 : 0;
    paint.quad(rings[r][i],rings[r][j],next[j],next[i],palette[r][light]);
  }
  // Solapa frontal, con una punta central y una sombra en el borde doblado.
  const left=[-.219,2.240,.150], right=[.212,2.246,.150];
  const creaseL=[-.140,2.228,.224], creaseR=[.134,2.219,.232];
  const crease=[-.010,2.174,.255], nose=[-.033,2.059,.256];
  const lowerL=[-.138,2.102,.224], lowerR=[.141,2.118,.231];
  paint.quad(left,creaseL,lowerL,[-.187,2.164,.177],'#382D41');
  paint.quad(creaseL,crease,nose,lowerL,'#41364A');
  paint.quad(crease,creaseR,lowerR,nose,'#32283D');
  paint.quad(creaseR,right,[.194,2.166,.179],lowerR,'#4B3B51');
  paint.face(creaseL,[-.051,2.166,.255],crease,'#262030');
  paint.face(crease,creaseR,[.071,2.169,.252],'#211B2A');
  paint.quad(lowerL,nose,[-.032,2.051,.253],[-.136,2.094,.218],'#221C2B');
  paint.quad(nose,lowerR,[.138,2.110,.228],[-.032,2.051,.253],'#221C2B');
  return paint.finish();
}

function buildShoulder(side) {
  const paint=painter();
  // Silueta superior y vuelta de la placa; la cara interior queda oscura.
  const border=[
    [.150,2.232,.075],[.202,2.253,.139],[.291,2.235,.177],
    [.393,2.198,.121],[.407,2.145,.061],[.356,2.099,.177],
    [.235,2.037,.219],[.173,2.086,.202],
  ].map(([x,y,z])=>[x*side,y,z]);
  const crown=[.267*side,2.228,.153];
  const top=['#5B5068','#62546E','#51435D','#352C40','#3C3148','#4A3D54','#554661','#493E56'];
  for(let i=0;i<border.length;i++){
    const a=border[i],b=border[(i+1)%border.length];
    const under=p=>[p[0]*.99,p[1]-.018,p[2]-.018];
    paint.face(crown,a,b,top[i]);
    paint.quad(a,b,under(b),under(a),'#221C2A');
  }
  // Dos remaches planos siguen el panel delantero en reposo.
  for (const [x,y,z] of [[.244,2.084,.208],[.310,2.107,.194]]) {
    const center=[x*side,y,z];
    const corners=[[0,.009,0],[.009,0,-.002],[0,-.008,.001],[-.009,0,.003]]
      .map(([dx,dy,dz])=>[center[0]+dx*side,center[1]+dy,center[2]+dz+.002]);
    const raised=[center[0],center[1]+.001,center[2]+.007];
    corners.forEach((p,i)=>paint.face(p,corners[(i+1)%4],raised,i<2?'#D4B6A5':'#877380'));
  }
  return paint.finish();
}

let armor;
function armorPieces() {
  if (!armor) armor={
    scarf:buildScarf(), left:buildShoulder(1), right:buildShoulder(-1),
    material:new MeshBasicMaterial({vertexColors:true,side:DoubleSide}),
  };
  return armor;
}

export function attachAuraArmor(fighter) {
  const { Torso, ShoulderL, ShoulderR }=fighter.bones;
  let cloth;
  fighter.model.traverse(object=>{
    if (object.userData.srcMat==='Aura_ropa') cloth=object;
  });
  if (!Torso || !ShoulderL || !ShoulderR || !cloth) return () => {};
  const parts=armorPieces();
  const pieces=[
    [Torso,parts.scarf,'Aura · bufanda'],
    [ShoulderL,parts.left,'Aura · hombrera izquierda'],
    [ShoulderR,parts.right,'Aura · hombrera derecha'],
  ].map(([bone,geometry,name])=>{
    const mesh=new Mesh(geometry,parts.material);
    mesh.name=name;
    fighter.model.add(mesh);
    bone.attach(mesh);
    mesh.visible=false;
    return mesh;
  });
  const enabled={value:0};
  installClip(cloth.material,enabled);
  const line=fighter.outlines.find(mesh=>mesh.geometry===cloth.geometry);
  const original=line?.material;
  let painted;
  if (line) {
    const fineInk=outlineMaterial(.008);
    painted=fineInk.clone();
    painted.onBeforeCompile=fineInk.onBeforeCompile;
    painted.customProgramCacheKey=fineInk.customProgramCacheKey;
    installClip(painted,enabled);
  }
  return show=>{
    enabled.value=Number(show);
    for(const part of pieces) part.visible=show;
    if (line && show) line.material=painted;
    else if (line?.material===painted) line.material=original;
  };
}
