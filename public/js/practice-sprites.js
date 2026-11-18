import { ATTACK_KEYS, isWalking, practicePose } from './practice-motion.js';

// Aura 2D al estilo de los juegos de lucha dibujados (Skullgirls): cada dibujo se MANTIENE varios fotogramas
// (no se funde ni se deforma con el siguiente), el juego corre a 60 fps y la fluidez la dan el timing,
// el pivote fijo en los pies, la pausa de impacto, el estirón del golpe y la respiración en guardia.

const ATLAS = new URL('../assets/practice/', import.meta.url);
const MOVE_EFFECT = [
  ['jab', .78, 1.04, 0], ['arc', .79, 1.03, -.24], ['arc', .75, 1.11, .24],
  ['arc', .56, 1.26, 1.04], ['arc', .79, .37, -.21], ['jab', .71, 1.05, 0],
  ['arc', .72, 1.04, -.22], ['arc', .66, .85, -.82], ['arc', .54, 1.25, .85], ['jab', .72, .53, -.78],
];
const WEAPON_EFFECTS = {
  sword: { g_tap: 'arc', g_fwd: 'jab', a_tap: 'arc' },
  hammer: { g_tap: 'arc', g_back: 'arc', a_tap: 'arc', a_down: 'arc' },
  spear: { g_fwd: 'jab', a_fwd: 'jab' },
};

const TILE = 384;
const FLOW_TILE = 48;

export async function loadPracticeAtlas(T, weapon, cache = new Map()) {
  const names = weapon === 'dagger' ? ['dagger','dagA','dagB','dagC','common'] : [weapon, weapon + '-mid','common'];
  names.push(weapon + '-walk');
  const loader = new T.TextureLoader();
  const load = (name, color) => {
    if (!cache.has(name)) {
      const pending = loader.loadAsync(new URL(name, ATLAS).href).then(texture => {
        if (color) texture.colorSpace = T.SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.minFilter = texture.magFilter = T.LinearFilter;
        return texture;
      }).catch(error => { cache.delete(name); throw error; });
      cache.set(name, pending);
    }
    return cache.get(name);
  };
  const art = await Promise.all(names.map(async name => [name, await load('hd-' + name + '.webp', true)]));
  return { art: new Map(art) };
}

// Las hojas de caminar se dibujaron algo más grandes que las de guardia y ataque: se igualan aquí para
// que el personaje no cambie de tamaño al pasar de una a otra (medido superponiendo cintura y cabeza).
const SHEET_SCALE = { 'dagger-walk': .94, 'sword-walk': .94, 'hammer-walk': .95, 'spear-walk': .97 };

function spriteMaterial(T) {
  return new T.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide,
    uniforms: {
      sheet: { value: null }, rect: { value: new T.Vector4() },
      breathe: { value: 0 }, tint: { value: new T.Color('#ffffff') },
    },
    vertexShader: `
      uniform float breathe;
      varying vec2 spriteUV;
      void main() {
        spriteUV = uv;
        vec3 p = position;
        // respiración: los pies quietos, el torso y la cabeza suben un poco (uv.y 0 = suelo del dibujo)
        p.y += breathe * smoothstep(.30, .80, uv.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
      }`,
    fragmentShader: `
      uniform sampler2D sheet;
      uniform vec4 rect;
      uniform vec3 tint;
      varying vec2 spriteUV;
      void main() {
        vec4 c = texture2D(sheet, rect.xy + clamp(spriteUV, 0., 1.) * rect.zw);
        if (c.a < .5) discard;              // borde duro, como un dibujo (sin halos semitransparentes)
        gl_FragColor = vec4(c.rgb * tint, 1.);
        #include <colorspace_fragment>
      }`,
  });
}

function rectFor(rect, texture, tile, index, cols) {
  const { width, height } = texture.image;
  const col = index % cols, row = Math.floor(index / cols);
  rect.set((col * tile + .5) / width, (height - (row + 1) * tile + .5) / height,
    (tile - 1) / width, (tile - 1) / height);
}

function textureFrom(T, width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'));
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  return map;
}

function paintedTrail(T, stroke) {
  return textureFrom(T, 256, 128, ctx => {
    const path = (color, draw) => {
      ctx.fillStyle = color; ctx.beginPath(); draw(); ctx.fill();
    };
    if (stroke === 'jab') {
      path('#F46314', () => {ctx.moveTo(6,79);ctx.quadraticCurveTo(111,43,246,51);ctx.quadraticCurveTo(168,84,6,79);});
      path('#FF9B24', () => {ctx.moveTo(39,73);ctx.quadraticCurveTo(144,50,245,51);ctx.quadraticCurveTo(156,73,39,73);});
      path('#FFF2BA', () => {ctx.moveTo(120,64);ctx.quadraticCurveTo(188,53,246,51);ctx.lineTo(204,61);ctx.closePath();});
    } else {
      path('#EB5314', () => {ctx.moveTo(5,97);ctx.bezierCurveTo(98,95,193,55,220,11);ctx.bezierCurveTo(262,31,212,105,5,97);});
      path('#FF9A22', () => {ctx.moveTo(29,95);ctx.bezierCurveTo(118,80,199,45,220,11);ctx.bezierCurveTo(248,43,165,82,29,95);});
      path('#FFF2BA', () => {ctx.moveTo(91,82);ctx.quadraticCurveTo(190,49,220,11);ctx.quadraticCurveTo(219,50,91,82);});
    }
  });
}

export class PracticeArt {
  constructor(T, scene, atlas) {
    this.atlas = atlas;
    this.bodyGeometry = new T.PlaneGeometry(1, 1);
    this.streakGeometry = new T.PlaneGeometry(1, 1);
    this.trails = { jab: paintedTrail(T,'jab'), arc: paintedTrail(T,'arc') };
    this.body = new T.Mesh(this.bodyGeometry, spriteMaterial(T));
    this.streak = new T.Mesh(this.streakGeometry, new T.MeshBasicMaterial({ transparent:true, depthWrite:false, toneMapped:false, side:T.DoubleSide }));
    this.body.renderOrder = 2;
    this.streak.renderOrder = 5;
    this.streak.visible = false;
    scene.add(this.body, this.streak);
  }

  capture(F) {
    this.previous = { x: F.x, y: F.y, state: F.state, move: F.move, face: F.face, f: F.f, t: F.t };
    this.shake ??= 0;
  }

  update(F, move, fraction = 1) {
    const tickBefore = this.previous;
    const advances = tickBefore?.t === F.t - 1;
    const frozen = tickBefore?.t === F.t;          // pausa de impacto: la simulación no avanza
    // El dibujo cambia solo en fotogramas enteros de la simulación: nada de medios dibujos.
    const tick = F.f;
    const x = advances ? tickBefore.x + (F.x - tickBefore.x) * fraction : F.x;
    const y = advances ? tickBefore.y + (F.y - tickBefore.y) * fraction : F.y;
    const phase = Math.max(0, tick - 4) / (F.state === 'walkB' ? -43 : 35);
    const walking = isWalking(F.state);
    if (walking) {
      this.exitStep = ((Math.floor(phase * 8) % 8) + 8) % 8;
    } else if (F.state !== 'idle' || tick >= 4) {
      this.exitStep = null;
    }
    const [a, b, blend] = practicePose(F, tick, F.t, walking ? Math.floor(phase * 8) / 8 + .001 : phase, this.exitStep ?? null);
    const pose = blend >= 1 ? b : a;                 // siempre un dibujo entero
    const uniforms = this.body.material.uniforms;
    uniforms.tint.value.set(F.state === 'hit' && F.f < 4 ? '#ffc9a5' : '#ffffff');
    uniforms.sheet.value = this.atlas.art.get(pose.atlas);
    rectFor(uniforms.rect.value, uniforms.sheet.value, TILE, pose.id, 4);

    const face = F.face, scale = F.scale;
    const size = 2.44 * scale * (SHEET_SCALE[pose.atlas] ?? 1);
    let sx = 1, sy = 1, dx = 0;
    // respiración en guardia: 4 pasos por ciclo de ~1,5 s, cambia cada 6 fotogramas (dibujado "a seises")
    const idle = F.state === 'idle' && !walking;
    const step = Math.floor(F.t / 6) % 16;
    uniforms.breathe.value = idle ? [0, .004, .008, .011, .012, .011, .008, .004, 0, -.002, -.003, -.002, 0, 0, 0, 0][step] * size : 0;
    // estirón en los dos primeros fotogramas activos del golpe (el "smear" de los dibujos a mano)
    const active = move?.active;
    if (F.state === 'attack' && active && tick >= active[0] && tick <= active[0] + 1) { sx = 1.07; sy = .97; dx = .05; }
    // aplastado al aterrizar
    if (F.state === 'land' && tick < 3) { sx = 1.05; sy = .94; }
    // vibración al recibir un golpe durante la pausa de impacto
    if (F.state === 'hit' && frozen) dx = (F.t + this.shake++) % 2 ? .025 : -.025; else this.shake = 0;
    this.body.scale.set(face * size * sx, size * sy, 1);
    this.body.position.set(x + face * (scale * .12 + dx), y + (324 / TILE - .5) * size * sy, .12);
    const type = ATTACK_KEYS.indexOf(F.move);
    const isThrow = F.move === 'throw';
    const effect = MOVE_EFFECT[type] || (isThrow ? ['arc', .54, 1.06, -.25] : F.move === 'grab' ? ['jab', .53, 1.05, 0] : null);
    const start = move?.active?.[0] ?? move?.release;
    const end = move?.active?.[1] ?? (start + 2);
    this.streak.visible = !!(effect && F.state === 'attack' && F.f >= start && F.f <= end + 2);
    if (!this.streak.visible) return;
    const [defaultStroke, offsetX, offsetY, angle] = effect;
    const stroke = WEAPON_EFFECTS[F.wk]?.[F.move] ?? defaultStroke;
    const reach = { dagger:.80, sword:1.24, hammer:1.10, spear:1.38 }[F.wk] ?? .8;
    const progress = Math.min(1, (tick - start + 1) / Math.max(1, end - start + 3));
    this.streak.position.set(x + offsetX * face * scale, y + offsetY * scale, .30);
    this.streak.rotation.z = face * angle;
    this.streak.scale.set(face * reach * scale * (.82 + progress * .22), scale * reach * .60, 1);
    if (this.streak.material.map !== this.trails[stroke]) {
      this.streak.material.map = this.trails[stroke];
      this.streak.material.needsUpdate = true;
    }
    this.streak.material.opacity = F.f <= end ? 1 : .62 - (F.f - end - 1) * .26;
  }

  dispose() {
    this.body.removeFromParent();
    this.streak.removeFromParent();
    this.body.material.dispose();
    this.streak.material.dispose();
    for (const texture of Object.values(this.trails)) texture.dispose();
    this.bodyGeometry.dispose();
    this.streakGeometry.dispose();
  }
}

// Seis dibujos de polvo con siluetas de tinta, dos niveles de sombra y
// fragmentos separados al final. Las texturas se crean solo en Práctica.
export function practiceDustFrames(T) {
  return Array.from({length:6}, (_, frame) => textureFrom(T, 192, 112, ctx => {
    const extent = [ .43,.70,1,.98,.90,.82 ][frame];
    ctx.translate(24,97); ctx.scale(extent,extent);
    const path = (color, draw) => {ctx.beginPath();ctx.fillStyle=color;draw();ctx.fill();};
    if (frame < 5) {
      path('#493846', () => {ctx.moveTo(-17,1);ctx.quadraticCurveTo(-7,-6,-1,-24);ctx.quadraticCurveTo(12,-47,24,-33);ctx.quadraticCurveTo(44,-58,58,-40);ctx.quadraticCurveTo(78,-55,87,-42);ctx.quadraticCurveTo(107,-61,125,-65);ctx.quadraticCurveTo(108,-51,109,-37);ctx.quadraticCurveTo(131,-47,158,-57);ctx.quadraticCurveTo(143,-35,128,-23);ctx.lineTo(151,-26);ctx.quadraticCurveTo(126,4,-17,1);});
      path('#B29383', () => {ctx.moveTo(-13,-2);ctx.quadraticCurveTo(0,-7,4,-25);ctx.quadraticCurveTo(16,-43,24,-28);ctx.quadraticCurveTo(46,-53,58,-35);ctx.quadraticCurveTo(79,-49,87,-37);ctx.quadraticCurveTo(110,-57,121,-60);ctx.quadraticCurveTo(103,-46,106,-32);ctx.quadraticCurveTo(133,-48,149,-51);ctx.quadraticCurveTo(132,-33,120,-23);ctx.quadraticCurveTo(99,-10,-13,-2);});
      path('#F1CEB0', () => {ctx.moveTo(0,-11);ctx.quadraticCurveTo(10,-35,20,-27);ctx.quadraticCurveTo(28,-14,44,-35);ctx.quadraticCurveTo(57,-44,58,-25);ctx.quadraticCurveTo(72,-42,82,-35);ctx.quadraticCurveTo(73,-13,0,-11);});
    }
    if (frame > 1) {
      for (const [x,y,r] of [[105,-37,5],[131,-50,6],[71,-30,4],[159,-40,3]].slice(frame-2)) {
        const up=(frame-1)*6;
        path('#DDAD91', () => {ctx.moveTo(x,y-up);ctx.lineTo(x+r*1.2,y-up-r);ctx.lineTo(x+r*2.7,y-up-r*1.7);ctx.lineTo(x+r*1.9,y-up);ctx.closePath();});
      }
    }
  }));
}
