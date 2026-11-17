import { BufferAttribute, BufferGeometry, Color } from 'three';

export function painter() {
  const positions=[], colors=[];
  function face(a,b,c,hex) {
    positions.push(...a,...b,...c);
    const color = new Color(hex);
    for (let i=0;i<3;i++) colors.push(color.r,color.g,color.b);
  }
  function quad(a,b,c,d,color) { face(a,b,c,color); face(a,c,d,color); }
  function finish() {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position',new BufferAttribute(new Float32Array(positions),3));
    geometry.setAttribute('color',new BufferAttribute(new Float32Array(colors),3));
    geometry.computeVertexNormals();
    return geometry;
  }
  return { face, quad, finish };
}

