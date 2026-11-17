// Mapas de color pintados para UV locales. El gris neutral deja que cada
// pieza conserve su paleta y que la misma textura sirva para varios tonos.
export function paintedTexture(T, kind) {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=256;
  const context=canvas.getContext('2d');
  function rect(color,x,y,w,h) {
    context.fillStyle=color;
    context.fillRect(x,y,w,h);
  }
  function shape(color,points) {
    context.beginPath();
    context.moveTo(...points[0]);
    for (const point of points.slice(1)) context.lineTo(...point);
    context.closePath();
    context.fillStyle=color;
    context.fill();
  }
  rect('#f5f5f5',0,0,256,256);
  if (kind === 'panel') {
    shape('#e2e2e2',[[0,0],[256,0],[256,84],[192,84],[171,62],[0,62]]);
    shape('#cdcdcd',[[0,214],[117,214],[145,190],[256,190],[256,256],[0,256]]);
    rect('#bcbcbc',0,245,256,11);
    rect('#ffffff',0,235,256,3);
    for (const x of [12,237]) {
      rect('#aaa',x,13,7,7);
      rect('#fff',x+1,14,4,1);
    }
  } else if (kind === 'slate' || kind === 'stone') {
    const stone=kind==='stone';
    shape('#dfdfdf',[[0,0],[256,0],[256,47],[124,38],[92,67],[0,52]]);
    shape('#e8e8e8',[[0,214],[67,203],[155,225],[256,203],[256,256],[0,256]]);
    shape(stone?'#d6d6d6':'#e6e6e6',[[256,91],[207,105],[184,116],[217,116],[256,107]]);
    rect('#b9b9b9',0,248,256,8);
    rect('#fff',1,237,254,3);
    rect('#fff',1,4,254,3);
    if(stone) shape('#dbdbdb',[[96,101],[121,96],[169,140],[150,135],[123,112]]);
  } else if (kind === 'roof') {
    shape('#dedede',[[0,0],[256,0],[256,67],[148,184],[0,184]]);
    rect('#bdbdbd',0,236,256,20);
    rect('#fff',0,222,256,5);
  } else if(kind === 'wood') {
    for (const y of [46,120,193]) {
      rect('#b5b5b5',0,y,256,5);
      rect('#fff',0,y+6,256,3);
      shape('#ddd',[[18,y+16],[91,y+15],[148,y+20],[68,y+23]]);
      shape('#d5d5d5',[[135,y+38],[197,y+32],[226,y+34],[246,y+29],[211,y+43]]);
    }
  } else if(kind === 'cloth') {
    shape('#d9d9d9',[[0,0],[48,0],[37,87],[35,157],[0,231]]);
    shape('#ebebeb',[[195,0],[236,0],[256,133],[256,209],[223,150]]);
    rect('#b8b8b8',0,244,256,12);
    rect('#fff',0,234,256,3);
  }
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=4;
  return texture;
}

export function celSurface(material) {
  // Bandas en espacio de mundo: no se desplazan al desplazar la cámara.
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vStageNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vec3 paintedNormal = normal;
      #ifdef USE_INSTANCING
        mat3 localInstance = mat3(instanceMatrix);
        paintedNormal /= vec3(dot(localInstance[0],localInstance[0]),dot(localInstance[1],localInstance[1]),dot(localInstance[2],localInstance[2]));
        paintedNormal = localInstance * paintedNormal;
      #endif
      vStageNormal = mat3(modelMatrix) * paintedNormal;
    `);
    shader.fragmentShader='varying vec3 vStageNormal;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
      float incidence=dot(normalize(vStageNormal),normalize(vec3(-0.48,0.78,0.52)));
      vec3 shadow=vec3(.50,.49,.62), mid=vec3(.80,.79,.87);
      vec3 band=mix(shadow,mid,step(0.12,incidence));
      band=mix(band,vec3(1.12,1.08,1.06),step(0.69,incidence));
      outgoingLight=diffuseColor.rgb*band+totalEmissiveRadiance;
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=> 'neon-stage-paint';
  material.userData.stageCel=true;
  return material;
}
