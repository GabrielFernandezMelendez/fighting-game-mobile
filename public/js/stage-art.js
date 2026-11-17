// La ilustración conserva su encuadre y su color. El combate se dibuja encima
// con la cámara 3D del juego; los efectos se mueven en el espacio de la ilustración.
export const stageArtwork = id => new URL('../img/stages/' + id + '.webp', import.meta.url).href;

export function buildStageArt(id, T, {quality, reducedMotion, onUnavailable}) {
  const group = new T.Group();
  const geometries = [], materials = [];
  const background = new T.Color({sala:'#191726',azotea:'#211933',mercado:'#0B2635'}[id]);
  const windowUV = new T.Vector2(1,1);
  const texture = new T.TextureLoader().load(stageArtwork(id), () => { picture.visible = true; }, undefined, onUnavailable);
  texture.colorSpace = T.SRGBColorSpace;
  const cover = new T.ShaderMaterial({
    uniforms: { source: {value:texture}, windowUV: {value:windowUV} },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
    fragmentShader: `uniform sampler2D source; uniform vec2 windowUV; varying vec2 vUv;
      void main() {
        vec2 anchor = vec2(0.5, 0.35);
        gl_FragColor = texture2D(source, anchor + (vUv - anchor) * windowUV);
        #include <colorspace_fragment>
      }`,
    depthTest:false, depthWrite:false, toneMapped:false,
  });
  const plane = new T.PlaneGeometry(2,2);
  geometries.push(plane); materials.push(cover);
  const picture = new T.Mesh(plane,cover);
  picture.visible = false;
  picture.frustumCulled = false;
  picture.renderOrder = -30;
  picture.onBeforeRender = (renderer, scene, camera) => {
    const aspect = texture.image.width / texture.image.height;
    windowUV.set(Math.min(1,camera.aspect/aspect),Math.min(1,aspect/camera.aspect));
  };
  group.add(picture);

  function strokes(capacity, color, opacity) {
    const points = new T.BufferAttribute(new Float32Array(capacity*6),3);
    points.setUsage(T.DynamicDrawUsage);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position',points);
    geometries.push(geo);
    const material = new T.ShaderMaterial({
      uniforms: { ink:{value:new T.Color(color)}, opacity:{value:opacity}, windowUV:{value:windowUV} },
      vertexShader: `uniform vec2 windowUV;
        void main() {
          vec2 anchor = vec2(0.5, 0.35);
          vec2 screen = anchor + (position.xy - anchor) / windowUV;
          gl_Position = vec4(screen * 2.0 - 1.0, 0.999, 1.0);
        }`,
      fragmentShader: `uniform vec3 ink; uniform float opacity;
        void main() {
          gl_FragColor = vec4(ink,opacity);
          #include <colorspace_fragment>
        }`,
      transparent:true,depthTest:true,depthWrite:false,toneMapped:false,
    });
    materials.push(material);
    const mesh = new T.LineSegments(geo,material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -29;
    group.add(mesh);
    return { points, geo, mesh };
  }
  const layers = [];
  let state = 215;
  const random = () => {
    state = (state*16807)%2147483647;
    return state / 2147483647;
  };
  if (id === 'mercado') {
    for (const [length,color,opacity,max,speed] of [[.031,'#90C3D9',.30,135,.46],[.059,'#C4E4ED',.54,75,.79]]) {
      const layer = strokes(max,color,opacity);
      const drops = Array.from({length:max},()=>({
        x:random(), offset:random(), variation:.7+random()*.62,
      }));
      layers.push({ ...layer, counts:[Math.floor(max*.34),Math.floor(max*.63),max],
        draw(i,t) {
          const d = drops[i];
          const y = ((d.offset - t*speed*d.variation)%1.2+1.2)%1.2 - .10;
          const x = d.x + (.5-y)*.11;
          const line = length*d.variation*(x>.32 && x<.68 ? .62 : 1);
          layer.points.setXYZ(i*2,x,y,0);
          layer.points.setXYZ(i*2+1,x-line*.11,y+line,0);
        },
      });
    }
    const ripple = strokes(14*8,'#C6EAF2',.47);
    const impact = Array.from({length:14},(_,i)=>({
      x:(i<7?.085:.745)+random()*.16,y:.225+random()*.078,phase:random(),
    }));
    layers.push({ ...ripple, counts:[32,64,112],
      draw(i,t) {
        const hit=impact[Math.floor(i/8)], segment=i%8;
        const p=(hit.phase+t*1.7)%1;
        const r=p<.56 ? .002 + p*.021 : 0;
        const a=segment*Math.PI/4,b=a+Math.PI/4;
        ripple.points.setXYZ(i*2,hit.x+r*Math.cos(a),hit.y+.3*r*Math.sin(a),0);
        ripple.points.setXYZ(i*2+1,hit.x+r*Math.cos(b),hit.y+.3*r*Math.sin(b),0);
      },
    });
  }
  if (id === 'azotea') {
    const comet=strokes(6,'#FFA047',.80);
    layers.push({ ...comet, counts:[2,4,6],
      draw(i,t) {
        const phase=(t*.22+i*.173)%1;
        const active=phase<.34;
        const x=.03+i*.14+phase*.48, y=1.09-phase*.88;
        const tail=active ? .039 + phase*.06 : 0;
        comet.points.setXYZ(i*2,x,y,0);
        comet.points.setXYZ(i*2+1,x-tail,y+tail*1.83,0);
      },
    });
  }
  let tier=quality;
  return {
    group, background,
    setQuality(next) { tier=next; },
    update(t) {
      const animated = picture.visible && !reducedMotion.matches && !document.body.classList.contains('reduce-motion');
      for (const layer of layers) {
        const count=layer.counts[tier];
        layer.mesh.visible=animated;
        if (!layer.mesh.visible) continue;
        layer.geo.setDrawRange(0,count*2);
        for (let i=0;i<count;i++) layer.draw(i,t);
        layer.points.needsUpdate=true;
      }
    },
    dispose() {
      texture.dispose();
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
