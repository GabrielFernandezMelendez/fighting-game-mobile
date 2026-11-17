const ATLAS = new URL('../assets/practice/', import.meta.url);
const KEYS = ['g_tap', 'g_fwd', 'g_back', 'g_up', 'g_down', 'a_tap', 'a_fwd', 'a_back', 'a_up', 'a_down'];
const DAGGER = [
  ['dagger', [4,5,6,7,8,9,10,11]], ['dagA', [0,1,2,3]], ['dagA', [4,5,6,7]], ['dagA', [8,9,10,11]],
  ['dagB', [0,1,2,3]], ['dagB', [4,5,6,7]], ['dagB', [8,9,10,11]],
  ['dagC', [0,1,2,3]], ['dagC', [4,5,6,7]], ['dagC', [8,9,10,11]],
];
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

export function attackSprite(F, move) {
  const guard = [F.wk, 0];
  if (F.move === 'grab') return F.f < move.active[0] - 2 || F.f > 22 ? guard : ['common', 8];
  if (F.move === 'throw') {
    if (F.f >= 37) return guard;
    return ['common', F.f < 9 ? 8 : F.f < move.release ? 9 : 10];
  }
  const i = KEYS.indexOf(F.move);
  if (i < 0) return guard;
  const [start, end] = move.active;
  if (F.wk !== 'dagger') {
    // Las otras armas tienen una pose principal propia por ataque.
    // Sus poses de preparación y recuperación comparten la guardia de esa arma.
    const ready = [F.wk, move.air ? 11 : 0];
    const last = move.dive ? end : Math.min(end + 2, move.total - 2);
    return F.f >= start - 1 && F.f <= last ? [F.wk, i + 1] : ready;
  }
  const [atlas, drawings] = DAGGER[i];
  if (drawings.length === 8) {
    const f = F.f;
    const slot = f < start ? Math.min(2, Math.floor(3 * f / start))
      : f <= end ? (f === start ? 3 : 4)
      : Math.min(7, 5 + Math.floor(3 * (f - end - 1) / Math.max(1, move.total - end - 1)));
    return [atlas, drawings[slot]];
  }
  const slot = F.f < start ? Number(F.f >= start * .5)
    : F.f <= end ? 2 : 3;
  return [atlas, drawings[slot]];
}

export function practicePose(F, move) {
  if (F.state === 'attack' && move) return attackSprite(F, move);
  const dagger = F.wk === 'dagger';
  const guard = [F.wk, dagger ? [0,1,2,3,0][Math.floor((F.t % 60) / 12)] : 0];
  switch (F.state) {
    case 'down': case 'lose': return ['common', 11];
    case 'hit': case 'launched': case 'thrown': return ['common', 6];
    case 'air': return dagger ? ['common', 5] : [F.wk, 11];
    case 'prejump': case 'crouch': case 'cblock': return dagger ? ['common', 4] : guard;
    case 'dashF': return dagger ? ['common', 2] : guard;
    case 'dashB': return dagger ? ['common', 3] : guard;
    case 'walkF': case 'walkB': return dagger ? ['common', Math.floor(F.t / 6) % 2] : guard;
    case 'land': case 'getup': return dagger ? ['common', 7] : guard;
    default: return guard;
  }
}

export function loadPracticeAtlas(T, weapon, cache = new Map()) {
  const names = weapon === 'dagger' ? ['dagger','dagA','dagB','dagC','common'] : [weapon,'common'];
  const loader = new T.TextureLoader();
  return Promise.all(names.map(async name => {
    if (!cache.has(name)) {
      const pending = loader.loadAsync(new URL(name + '.webp', ATLAS).href).then(texture => {
        texture.colorSpace = T.SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.minFilter = texture.magFilter = T.LinearFilter;
        return texture;
      }).catch(error => { cache.delete(name); throw error; });
      cache.set(name, pending);
    }
    return [name, await cache.get(name)];
  })).then(entries => new Map(entries));
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
    this.body = new T.Mesh(this.bodyGeometry, new T.MeshBasicMaterial({ transparent:true, alphaTest:.045, depthWrite:false, toneMapped:false, side:T.DoubleSide }));
    this.streak = new T.Mesh(this.streakGeometry, new T.MeshBasicMaterial({ transparent:true, depthWrite:false, toneMapped:false, side:T.DoubleSide }));
    this.body.renderOrder = 2;
    this.streak.renderOrder = 5;
    this.streak.visible = false;
    scene.add(this.body, this.streak);
  }

  update(F, move) {
    const [name, index] = practicePose(F, move);
    this.body.material.color.set(F.state === 'hit' && F.f < 4 ? '#ffc9a5' : '#ffffff');
    const map = this.atlas.get(name);
    if (this.body.material.map !== map) {
      this.body.material.map = map;
      this.body.material.needsUpdate = true;
    }
    if (this.index !== index || this.name !== name) {
      // UV con un texel de margen para que no sangren sprites vecinos.
      const u = ((index % 4) * 256 + 1) / 1024, v = ((2 - Math.floor(index / 4)) * 256 + 1) / 768;
      const right = u + 254 / 1024, top = v + 254 / 768;
      const uv = this.bodyGeometry.attributes.uv;
      uv.setXY(0, u, top); uv.setXY(1, right, top);
      uv.setXY(2, u, v); uv.setXY(3, right, v);
      uv.needsUpdate = true;
      this.index = index; this.name = name;
    }
    const face = F.face, scale = F.scale;
    const size = 2.44 * scale;
    this.body.scale.set(face * size, size, 1);
    this.body.position.set(F.x + face * scale * .12, F.y + (216 / 256 - .5) * size, .12);
    const type = KEYS.indexOf(F.move);
    const isThrow = F.move === 'throw';
    const effect = MOVE_EFFECT[type] || (isThrow ? ['arc', .54, 1.06, -.25] : F.move === 'grab' ? ['jab', .53, 1.05, 0] : null);
    const start = move?.active?.[0] ?? move?.release;
    const end = move?.active?.[1] ?? (start + 2);
    this.streak.visible = !!(effect && F.state === 'attack' && F.f >= start && F.f <= end + 2);
    if (!this.streak.visible) return;
    const [defaultStroke, x, y, angle] = effect;
    const stroke = WEAPON_EFFECTS[F.wk]?.[F.move] ?? defaultStroke;
    const reach = { dagger:.80, sword:1.24, hammer:1.10, spear:1.38 }[F.wk] ?? .8;
    const progress = Math.min(1, (F.f - start + 1) / Math.max(1, end - start + 3));
    this.streak.position.set(F.x + x * face * scale, F.y + y * scale, .30);
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
