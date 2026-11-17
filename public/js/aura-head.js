import {
  CatmullRomCurve3, DoubleSide, Group, Mesh,
  MeshBasicMaterial, SphereGeometry, Vector3,
} from 'three';
import { painter } from './aura-mesh.js';

const HAIR = ['#F0E1FB','#DCCBED','#B7A3CC','#897697'];
const INK = '#252032';

// Coordenadas de reposo del GLB de Aura. Cada sección es un volumen cerrado
// con una arista superior, dos planos visibles y una cara inferior en sombra.
const LOCKS = [
  [[-.025,2.61,-.143,.099,.063],[.057,2.661,-.167,.078,.054],[.161,2.656,-.176,.038,.028],[.221,2.688,-.167,0,0]],
  [[-.056,2.555,-.131,.075,.050],[-.135,2.579,-.162,.067,.045],[-.197,2.561,-.165,.031,.022],[-.241,2.602,-.162,0,0]],
  [[.014,2.512,-.142,.069,.052],[.105,2.541,-.173,.087,.055],[.170,2.510,-.167,.035,.034],[.212,2.539,-.168,0,0]],
  [[-.105,2.539,-.036,.056,.050],[-.155,2.546,-.072,.062,.040],[-.202,2.519,-.098,.048,.031],[-.216,2.555,-.111,0,0]],
  [[.087,2.560,-.024,.070,.071],[.159,2.564,-.032,.078,.056],[.200,2.537,-.046,.031,.030],[.238,2.563,-.074,0,0]],
  [[.058,2.648,-.070,.095,.066],[.135,2.662,-.020,.076,.060],[.190,2.634,-.020,.042,.033],[.243,2.641,-.039,0,0]],
  [[-.044,2.675,-.047,.097,.072],[.019,2.727,-.063,.076,.060],[.049,2.762,-.077,.036,.038],[.048,2.794,-.080,0,0]],
  [[-.057,2.659,.036,.074,.063],[-.104,2.718,.023,.062,.060],[-.126,2.746,.016,.038,.041],[-.161,2.748,-.010,0,0]],
  [[.039,2.679,.037,.070,.063],[.104,2.675,.078,.067,.053],[.131,2.625,.091,.048,.034],[.167,2.606,.080,0,0]],
  [[-.046,2.678,.075,.067,.067],[-.081,2.620,.145,.065,.052],[-.105,2.545,.179,.041,.036],[-.121,2.494,.167,0,0]],
  [[.029,2.681,.076,.058,.066],[.041,2.640,.145,.053,.049],[.017,2.586,.184,.039,.034],[.001,2.551,.174,0,0]],
];


function addLock(paint, control, index) {
  const curve=new CatmullRomCurve3(control.map(([x,y,z])=>new Vector3(x,y,z)));
  const stations=curve.getPoints(9).map((point,i)=>{
    const n=i/3, a=Math.min(2, Math.floor(n)), t=n-a;
    return [...point.toArray(),...control[a].slice(3).map((v,k)=>v+(control[a+1][k+3]-v)*t)];
  });
  const rings=stations.map(([x,y,z,w,d],i)=>{
    const a=stations[Math.max(0,i-1)], b=stations[Math.min(stations.length-1,i+1)];
    const length=Math.hypot(b[0]-a[0], b[1]-a[1]);
    const nx=-(b[1]-a[1])/length*w, ny=(b[0]-a[0])/length*w;
    return [[x+nx,y+ny,z-.12*d],[x+.14*nx,y+.14*ny,z+d],[x-nx,y-ny,z-.12*d],[x,y,z-d*.82]];
  });
  const color = [HAIR[index%3===0?0:1], HAIR[2], HAIR[3], HAIR[2]];
  for (let i=0;i<rings.length-1;i++) {
    for (let k=0;k<4;k++) {
      const j=(k+1)%4;
      paint.quad(rings[i][k],rings[i][j],rings[i+1][j],rings[i+1][k],color[k]);
    }
  }
  paint.quad(rings[0][0],rings[0][3],rings[0][2],rings[0][1],HAIR[3]);
}

function addMask(paint) {
  // Cresta de la máscara y biseles que vuelven hacia las sienes.
  const rows=[
    [[0,2.607,.164],[.103,2.607,.117],[.156,2.564,.039]],
    [[0,2.524,.207],[.100,2.511,.167],[.156,2.506,.045]],
    [[0,2.417,.186],[.082,2.421,.147],[.112,2.439,.060]],
    [[0,2.293,.130],[.037,2.322,.115],[.072,2.366,.057]],
  ];
  for (const side of [-1,1]) {
    const grid=rows.map(row=>row.map(([x,y,z])=>[x*side,y,z]));
    const faces=[];
    for (let r=0;r<grid.length-1;r++) for (let c=0;c<2;c++) {
      const [a,b]=[grid[r][c],grid[r][c+1]], [d,e]=[grid[r+1][c],grid[r+1][c+1]];
      const color = c===1 ? '#BFA6AA' : side===1 ? '#EDD9CC' : '#F6E6D6';
      paint.quad(a,b,e,d,color);
      faces.push([a,b,e],[a,e,d]);
    }
    const edge=grid.map(row=>row[2]);
    for(let i=0;i<edge.length-1;i++) {
      const a=edge[i],b=edge[i+1];
      paint.quad(a,b,[b[0]*.96,b[1],b[2]-.022],[a[0]*.96,a[1],a[2]-.022],INK);
    }
    // Recorta el dibujo por cara para que cada segmento siga su mismo plano.
    const eye=[[.029,2.473],[.069,2.515],[.132,2.533],[.079,2.486]].map(([x,y])=>[x*side,y]);
    for (const [a,b,c] of faces) {
      const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
      const orientation=Math.sign(cross(a,b,c));
      let polygon=eye;
      for (const [p,q] of [[a,b],[b,c],[c,a]]) {
        const clipped=[];
        for(let i=0;i<polygon.length;i++) {
          const last=polygon[(i+polygon.length-1)%polygon.length], next=polygon[i];
          const d1=orientation*cross(p,q,last), d2=orientation*cross(p,q,next);
          if ((d1>=0)!==(d2>=0)) {
            const t=d1/(d1-d2);
            clipped.push(last.map((v,j)=>v+(next[j]-v)*t));
          }
          if(d2>=0) clipped.push(next);
        }
        polygon=clipped;
      }
      const area=cross(a,b,c);
      const points=polygon.map(([x,y])=>[x,y,(
        cross(b,c,[x,y])*a[2]+cross(c,a,[x,y])*b[2]+cross(a,b,[x,y])*c[2]
      )/area+.002]);
      for(let i=1;i<points.length-1;i++) paint.face(points[0],points[i],points[i+1],'#181520');
    }
  }
}

let headParts;
function newHead() {
  if (!headParts) {
    const paint=painter();
    addMask(paint);
    for(const side of [-1,1]) {
      const ear = [
        [.145*side,2.493,.043],[.165*side,2.531,.025],[.175*side,2.512,.002],
        [.169*side,2.462,.018],[.152*side,2.450,.045],
      ];
      const ridge=[.173*side,2.488,.037];
      ear.forEach((vertex,i)=>paint.face(vertex,ear[(i+1)%ear.length],ridge,i<2?'#D5998F':'#AE776F'));
    }
    LOCKS.forEach((points,index)=>addLock(paint,points,index));
    const scalp=new SphereGeometry(1,16,10);
    scalp.scale(.146,.143,.151);
    scalp.translate(0,2.552,-.035);
    headParts={
      sculpture:paint.finish(), scalp,
      colors:new MeshBasicMaterial({ vertexColors:true,side:DoubleSide }),
      base:new MeshBasicMaterial({ color:'#A38DAE' }),
    };
  }
  const head=new Group();
  head.name='Aura · máscara y pelo esculpidos';
  head.add(new Mesh(headParts.scalp,headParts.base),new Mesh(headParts.sculpture,headParts.colors));
  return head;
}

export function attachAuraHead(fighter) {
  const anchor=fighter.bones.Head;
  if (!anchor) return () => {};
  const pieces=[];
  fighter.model.traverse(object => {
    if (object.userData.srcMat==='Aura_pelo' || object.userData.srcMat==='Aura_mascara') pieces.push(object);
  });
  const replaced=new Set(pieces.map(piece=>piece.geometry));
  for (const mesh of fighter.outlines) if (replaced.has(mesh.geometry)) pieces.push(mesh);
  const head=newHead();
  fighter.model.add(head);
  anchor.attach(head);
  // El centro de la cabeza sigue al hueso también al espejar al luchador.
  const original=pieces.map(mesh=>[mesh,mesh.visible]);
  return enabled => {
    head.visible=enabled;
    for (const [mesh,visible] of original) {
      if(mesh.userData.outline) mesh.userData.hiddenByLook=enabled;
      mesh.visible=!enabled && visible;
    }
  };
}
