// Repintado experimental del visor sobre el GLB riggeado de combate.
// Las marcas usan la malla en reposo y siguen la animación del esqueleto.
import { BufferAttribute, Color } from 'three';
import { outlineMaterial } from './models.js';
import { attachAuraArmor } from './aura-armor.js';

const PALETTE = {
  chaqueta:'#E7C6B3', pantalon:'#8F6E89', gris:'#756B7A', grafito:'#342D3A',
  negro:'#211A28', naranja:'#FF7A1A', pelo:'#E5D5F3', mascara:'#E8DAD5', piel:'#EDB09B', metal:'#BDB3BA',
};
const SHADOW = {
  chaqueta:'#BD9587', pantalon:'#654B63', gris:'#504759', grafito:'#24202F',
  negro:'#17131F', naranja:'#B34816', pelo:'#A892BE', mascara:'#B09CA5', piel:'#B97968', metal:'#81747F',
};

// Las zonas se guardan como índices en el GLB. Restringe las etiquetas del
// escaneo por pieza antes de votar entre vértices vecinos de la misma superficie.
function clothingZone(id, x, y) {
  const lateral = Math.abs(x);
  if (y < .056) return 0;                                    // suela
  if (y < .33) return [3,4,5,9].includes(id) ? id : 3;        // bota
  if (y < 1.52 && lateral < .395) {
    if ((id===3 || id===4) && lateral>.22 && y>1.12) return id; // correa
    return 1;
  }
  if (y < 1.71 && lateral < .32) return [3,4,5,9].includes(id) ? id : 3;
  if (y < 1.32 && lateral > .39) return [3,4,5,8].includes(id) ? id : 3; // guante
  if (y > 2.27) return id===5 ? 5 : 3;                        // cuello y forro
  if (id===6 || id===7) return 3;
  return id;
}

function prepareClothing(geometry) {
  if (geometry.hasAttribute('aAuraLabs')) return;
  const { position, labs } = geometry.attributes;
  const lookup = new Map(), vertices = [], corner = new Uint32Array(position.count);
  for (let i=0;i<corner.length;i++) {
    const x=position.getX(i), y=position.getY(i), z=position.getZ(i);
    const key = [x,y,z].map(v=>Math.round(v*10000)).join(',');
    let index=lookup.get(key);
    if (index===undefined) {
      index=vertices.length;
      lookup.set(key,index);
      const id=labs.array[(Math.floor(i/3)*9)+(i%3)];
      vertices.push({ id:clothingZone(id,x,y), near:new Set() });
    }
    corner[i]=index;
  }
  for (let i=0;i<corner.length;i+=3) {
    const a=corner[i],b=corner[i+1],c=corner[i+2];
    vertices[a].near.add(b).add(c);
    vertices[b].near.add(a).add(c);
    vertices[c].near.add(a).add(b);
  }
  const votes=new Uint8Array(10);
  let labels=vertices.map(v=>v.id);
  for (let pass=0;pass<2;pass++) {
    labels=vertices.map(({ near },i)=>{
      const original=labels[i];
      votes.fill(0);
      votes[original]=3;
      for (const adjacent of near) votes[labels[adjacent]]++;
      let winner=original;
      for (const adjacent of near) {
        const candidate=labels[adjacent];
        if (votes[candidate]>votes[winner]) winner=candidate;
      }
      return winner;
    });
  }
  const data=new Float32Array(corner.length*3);
  for (let i=0;i<corner.length;i+=3) {
    const a=labels[corner[i]],b=labels[corner[i+1]],c=labels[corner[i+2]];
    for (let k=i;k<i+3;k++) data.set([a,b,c],k*3);
  }
  geometry.setAttribute('aAuraLabs',new BufferAttribute(data,3));
}

const mask = `
  vec3 p = vAuraRest;
  float x = abs(p.x - 0.002);
  float y = p.y - (2.489 + 0.46 * (x - 0.067) + 1.2 * (x - 0.067) * (x - 0.067));
  float taper = max(0.0, min((x - 0.031) * 0.61, (0.144 - x) * 0.44));
  float d = abs(y) - taper;
  float aa = max(fwidth(d), 0.00035);
  float slit = (1.0 - smoothstep(-aa, aa, d)) * step(0.031, x) * step(x, 0.144) * step(0.045, p.z);
  float bevel = step(0.13, x + 0.24 * (p.y - 2.47));
  vec3 porcelain = mix(uPal[7], uPal[7] * uShd[7], bevel);
  cel = mix(cel, mix(porcelain, uInk, slit), uAuraReview);
`;
// Pelo en revisión: tres tonos (luz, medio y sombra profunda bajo los mechones, junto a la raíz)
// y se vuelve a pintar la tinta de los pliegues encima, para que cada mechón quede delineado.
const hair = `
  vec3 p = vAuraRest;
  float root = step(p.y, 2.585 + 0.10 * p.x - 0.32 * (p.z + 0.035));
  vec3 light = uPal[6], mid = uPal[6] * uShd[6], deep = mid * vec3(0.74, 0.70, 0.86);
  vec3 tone = lit > 0.5 ? mix(light, mid, root) : mix(mid, deep, root);
  cel = mix(cel, tone, uAuraReview);
  cel = mix(cel, uInk, ink * uAuraReview);
`;
const clothing = `
  vec3 p = vAuraRest;
  // Pliegues grandes dibujados en reposo. El sombreado del escaneo ya no
  // decide esta frontera en cada triángulo del pantalón.
  if (uAuraReview > 0.5 && lb == 1.0) {
    float leg = abs(p.x);
    float pleat = abs(p.y - (1.23 - 1.36 * leg));
    float knee = 0.123 + abs(p.y - 0.73) * 0.42;
    float fold = max(1.0 - step(0.042, pleat), step(leg, knee) * step(0.56, p.y));
    fold = max(fold, step(p.y, 0.40 + leg * 0.31));
    float back = step(p.z, -0.03 - 0.21 * leg);
    cel = mix(uPal[1], uPal[1] * uShd[1], max(fold, back));
  }
  vec2 q = abs(vec2(p.x + 0.014, p.y - 1.696));
  float inner = step(q.x, 0.038) * step(q.y, 0.016);
  float outer = step(q.x + q.y * 0.38, 0.055) * step(q.y, 0.027);
  float buckle = outer * step(0.195, p.z) * uAuraReview;
  vec3 metal = mix(uPal[9] * uShd[9], uPal[9], lit);
  cel = mix(cel, mix(metal, uPal[3] * uShd[3], inner), buckle);
`;
const details={ mask, hair, clothing };
const cleanZone={ mask:7, hair:6, skin:8 };

function installPaint(material, type) {
  const compile = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  const active = { value: 0 };
  material.customProgramCacheKey = () => key + '-aura-' + type;
  material.onBeforeCompile = shader => {
    compile(shader);
    shader.uniforms.uAuraReview = active;
    const cleanAttribute = type==='clothing' ? 'attribute vec3 aAuraLabs; varying vec3 vAuraLabs;\n' : '';
    shader.vertexShader = cleanAttribute + 'varying vec3 vAuraRest;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n vAuraRest = position;' + (cleanAttribute ? '\n vAuraLabs = aAuraLabs;' : '')
    );
    shader.fragmentShader = 'varying vec3 vAuraRest; uniform float uAuraReview;\n' + shader.fragmentShader
      .replace('max(ink, inkL)', type==='hair' ? 'max(ink, inkL)' : 'max(ink, inkL) * (1.0 - 0.86 * uAuraReview)')
      .replace('cel += uRim', 'cel += uRim * (1.0 - 0.70 * uAuraReview)')
      .replace('outgoingLight = cel +', '{' + (details[type] || '') + '}\n outgoingLight = cel +');
    if (cleanAttribute) {
      shader.fragmentShader = 'varying vec3 vAuraLabs;\n' + shader.fragmentShader.replace(
        'L = vLabs;', 'L = mix(vLabs, vAuraLabs, uAuraReview);'
      );
    } else {
      const zone=cleanZone[type];
      shader.fragmentShader = shader.fragmentShader.replace(
        'float nl = dot', `alb = mix(alb, uPal[${zone}], uAuraReview);
        shadeC = mix(shadeC, uShd[${zone}], uAuraReview);
        inkL *= 1.0 - uAuraReview;
        float nl = dot`
      );
    }
  };
  return active;
}

export function createAuraLook(fighter) {
  const materials = [];
  const hairGeo = new Set();
  fighter.model.traverse(o => { if (o.userData?.srcMat==='Aura_pelo' && o.geometry) hairGeo.add(o.geometry); });
  const outlines = fighter.outlines.map(mesh=>({ mesh, original:mesh.material, hair:hairGeo.has(mesh.geometry) }));
  const fineInk = outlineMaterial(0.008);
  fighter.model.traverse(object => {
    const cel = object.material?.userData.cel;
    const zones = object.geometry?.userData.neonZones;
    if (!cel || !zones) return;
    const type = { Aura_mascara:'mask', Aura_pelo:'hair', Aura_piel:'skin', Aura_ropa:'clothing' }[object.userData.srcMat];
    if (type==='clothing') prepareClothing(object.geometry);
    const active = type ? installPaint(object.material,type) : null;
    const original = { colors: cel.uPal.value.map(color => color.clone()), shades: cel.uShd.value.map(color => color.clone()) };
    const colors = original.colors.map((color,i) => PALETTE[zones[i]] ? new Color(PALETTE[zones[i]]) : color);
    const shades = original.shades.map((color,i) => {
      if (!SHADOW[zones[i]]) return color;
      const base=colors[i], shadow=new Color(SHADOW[zones[i]]);
      return shadow.setRGB(shadow.r/base.r,shadow.g/base.g,shadow.b/base.b);
    });
    materials.push({ cel, active, original, revised:{ colors, shades }, originalBand:cel.uBand.value });
  });
  return review => {
    for (const { cel, active, original, revised, originalBand } of materials) {
      const { colors, shades } = review ? revised : original;
      cel.uPal.value.forEach((color,i) => color.copy(colors[i]));
      cel.uShd.value.forEach((color,i) => color.copy(shades[i]));
      cel.uBand.value = review && originalBand===0.28 ? 0.16 : originalBand;
      if (active) active.value=Number(review);
    }
    for (const { mesh, original, hair } of outlines) mesh.material=review && !hair ? fineInk : original;
  };
}

// La variante en revisión usa la cabeza del propio GLB (public/assets/chars/aura_review.glb) en vez de
// una cabeza nueva por piezas; aura-head.js queda en el repo pero sin usar.
export function createAuraVariant(fighter) {
  const paint=createAuraLook(fighter);
  const armor=attachAuraArmor(fighter);
  return show=>{
    paint(show);
    armor(show);
  };
}
