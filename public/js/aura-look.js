// Revisión de arte del visor. Se pinta en las coordenadas de la malla en reposo
// para que los detalles viajen con la piel sin rebakear el GLB ni alterar su rig.
import { Color } from 'three';

const PALETTE = {
  chaqueta: '#E7C6B3', pantalon: '#8F6E89', gris: '#746878', grafito: '#342D3A',
  negro: '#211A28', naranja: '#FF7A1A', pelo: '#E5D5F3', mascara: '#E8DAD5',
  piel: '#EDB09B', metal: '#BDB3BA',
};
const SHADOW = {
  chaqueta: '#BD988A', pantalon: '#624863', gris: '#504759', grafito: '#241E2D',
  negro: '#16131D', naranja: '#B44512', pelo: '#9C86B1', mascara: '#A995A0',
  piel: '#B97968', metal: '#81747F',
};
const mask = `
  vec3 p = vAuraRest;
  float x = abs(p.x - 0.002);
  float y = p.y - (2.481 + 0.44 * (x - 0.064) + 1.8 * (x - 0.064) * (x - 0.064));
  float taper = max(0.0, min((x - 0.029) * 0.66, (0.143 - x) * 0.46));
  float d = abs(y) - taper;
  float aa = max(fwidth(d), 0.0005);
  float slit = (1.0 - smoothstep(-aa, aa, d)) * step(0.027, x) * step(x, 0.143) * step(0.043, p.z);
  cel = mix(cel, uInk, slit * uAuraReview);
`;
const clothing = `
  vec3 p = vAuraRest;
  // Hebilla frontal rectangular. Perfila el metal en dos planos y deja el centro grafito.
  vec2 q = abs(vec2(p.x + 0.014, p.y - 1.696));
  float inner = step(q.x, 0.038) * step(q.y, 0.020);
  float outer = step(q.x + q.y * 0.38, 0.055) * step(q.y, 0.032);
  float buckle = outer * step(0.211, p.z) * uAuraReview;
  vec3 metal = mix(uPal[9] * uShd[9], uPal[9], lit);
  cel = mix(cel, mix(metal, uPal[3] * uShd[3], inner), buckle);
`;

function installDetail(material, type) {
  const detail = type === 'mask' ? mask : clothing;
  const compile = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  const active = { value: 0 };
  material.customProgramCacheKey = () => key + '-aura-' + type;
  material.onBeforeCompile = shader => {
    compile(shader);
    shader.uniforms.uAuraReview = active;
    shader.vertexShader = 'varying vec3 vAuraRest;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n vAuraRest = position;'
    );
    shader.fragmentShader = 'varying vec3 vAuraRest; uniform float uAuraReview;\n' + shader.fragmentShader.replace(
      'outgoingLight = cel +', '{' + detail + '}\n outgoingLight = cel +'
    );
  };
  return active;
}

export function createAuraLook(model) {
  const materials = [];
  model.traverse(object => {
    const cel = object.material?.userData.cel;
    const zones = object.geometry?.userData.neonZones;
    if (!cel || !zones) return;
    const source = object.userData.srcMat;
    const active = source === 'Aura_mascara' ? installDetail(object.material, 'mask')
      : source === 'Aura_ropa' ? installDetail(object.material, 'clothing') : null;
    const original = { colors: cel.uPal.value.map(color => color.clone()), shades: cel.uShd.value.map(color => color.clone()) };
    const revised = {
      colors: original.colors.map((color, i) => PALETTE[zones[i]] ? new Color(PALETTE[zones[i]]) : color),
      shades: original.shades.map((color, i) => {
        if (!SHADOW[zones[i]]) return color;
        const base = new Color(PALETTE[zones[i]]);
        const shadow = new Color(SHADOW[zones[i]]);
        return shadow.setRGB(shadow.r / base.r, shadow.g / base.g, shadow.b / base.b);
      }),
    };
    materials.push({ cel, active, original, revised });
  });
  return review => {
    for (const { cel, active, original, revised } of materials) {
      const { colors, shades } = review ? revised : original;
      cel.uPal.value.forEach((color, i) => color.copy(colors[i]));
      cel.uShd.value.forEach((color, i) => color.copy(shades[i]));
      if (active) active.value = Number(review);
    }
  };
}
