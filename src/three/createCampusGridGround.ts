import * as THREE from 'three'

/** A static world-space ground: preserve the campus footprint and fade into the horizon. */
export function createCampusGridGround(model: THREE.Group) {
  const footprint = new THREE.Box3()
  model.updateMatrixWorld(true)
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    if (materials.some(material => material.name === '浅灰场地')) {
      footprint.union(new THREE.Box3().setFromObject(object))
    }
  })
  if (footprint.isEmpty()) footprint.setFromObject(model)
  const center = footprint.getCenter(new THREE.Vector3())
  const size = footprint.getSize(new THREE.Vector3())
  const span = Math.max(size.x, size.z, 1)
  const minorSpacing = Math.max(5, Math.round(span / 28 / 5) * 5)
  const geometry = new THREE.PlaneGeometry(span * 8, span * 8)
  geometry.rotateX(-Math.PI / 2)
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      footprintHalf: { value: new THREE.Vector2(Math.max(size.x / 2, 1), Math.max(size.z / 2, 1)) },
      spacing: { value: minorSpacing },
      fadeRadius: { value: span * 2.2 },
      baseColor: { value: new THREE.Color('#102b3b') },
      lineColor: { value: new THREE.Color('#437c91') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vGround;
      void main() {
        vGround = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vGround;
      uniform vec2 footprintHalf;
      uniform float spacing;
      uniform float fadeRadius;
      uniform vec3 baseColor;
      uniform vec3 lineColor;

      float gridLine(vec2 p) {
        vec2 pixelWidth = max(fwidth(p), vec2(0.00001));
        vec2 distanceToLine = abs(fract(p - 0.5) - 0.5) / pixelWidth;
        vec2 lines = 1.0 - smoothstep(vec2(0.35), vec2(1.35), distanceToLine);
        // Fade each axis independently before its projected cells become subpixel.
        lines *= 1.0 - smoothstep(vec2(0.12), vec2(0.5), pixelWidth);
        return max(lines.x, lines.y);
      }

      void main() {
        vec2 edge = abs(vGround) / footprintHalf;
        float outsideCampus = smoothstep(0.88, 1.12, max(edge.x, edge.y));
        float horizon = 1.0 - smoothstep(0.12, 1.0, length(vGround) / fadeRadius);
        float visibility = outsideCampus * horizon;
        if (visibility < 0.001) discard;
        float minor = gridLine(vGround / spacing);
        float major = gridLine(vGround / (spacing * 5.0));
        float line = max(minor * 0.10, major * 0.32);
        gl_FragColor = vec4(mix(baseColor, lineColor, line), visibility * (0.24 + line * 0.45));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  const ground = new THREE.Mesh(geometry, material)
  ground.name = '园区外围科技网格｜静态渐隐'
  ground.position.set(center.x, footprint.min.y - 0.08, center.z)
  // Draw below existing transparent terrain and light decals, but depth-test buildings.
  ground.renderOrder = -2
  return ground
}
