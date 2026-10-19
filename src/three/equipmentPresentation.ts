import * as THREE from 'three'

export type EquipmentFraming = 'single' | 'group' | 'line'

/** Fit equipment bounds to the viewport, independently of the floor and selection helper. */
export function fitEquipmentCamera(dimensions: THREE.Vector3, aspect: number, mode: EquipmentFraming, fov = 40) {
  const fractions = mode === 'single' ? { width: .88, height: .70 } : mode === 'group' ? { width: .82, height: .78 } : { width: .94, height: .82 }
  const direction = mode === 'single' ? new THREE.Vector3(1.05, .68, 1.3) : dimensions.x >= dimensions.z
    ? new THREE.Vector3(mode === 'line' ? .9 : .45, mode === 'line' ? .9 : .55, 1.5)
    : new THREE.Vector3(1.5, mode === 'line' ? .9 : .55, mode === 'line' ? .9 : .45)
  direction.normalize()
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize()
  const up = new THREE.Vector3().crossVectors(direction, right).normalize()
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2)), tanH = tanV * Math.max(.1, aspect)
  const corners: { x: number; y: number; depth: number }[] = []
  for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) {
    const corner = new THREE.Vector3(x * dimensions.x, y * dimensions.y, z * dimensions.z)
    corners.push({ x: corner.dot(right), y: corner.dot(up), depth: corner.dot(direction) })
  }
  // Recenter the projected bounds: a perspective view of a long assembly is asymmetric.
  const measure = (distance: number) => {
    const axis = (key: 'x' | 'y', tangent: number) => {
      let low = Math.min(...corners.map(c => c[key])), high = Math.max(...corners.map(c => c[key]))
      for (let i = 0; i < 32; i++) {
        const offset = (low + high) / 2
        const values = corners.map(c => (c[key] - offset) / (distance - c.depth) / tangent)
        if (Math.min(...values) + Math.max(...values) > 0) low = offset
        else high = offset
      }
      const offset = (low + high) / 2
      return { offset, extent: Math.max(...corners.map(c => Math.abs((c[key] - offset) / (distance - c.depth) / tangent))) }
    }
    const horizontal = axis('x', tanH), vertical = axis('y', tanV)
    return { horizontal, vertical, fit: Math.max(horizontal.extent / fractions.width, vertical.extent / fractions.height) }
  }
  let near = Math.max(.01, ...corners.map(c => c.depth)) + .01
  let far = Math.max(1, dimensions.length() * 10)
  while (measure(far).fit > 1) far *= 2
  for (let i = 0; i < 48; i++) {
    const distance = (near + far) / 2
    if (measure(distance).fit > 1) near = distance
    else far = distance
  }
  const framed = measure(far)
  const targetOffset = right.clone().multiplyScalar(framed.horizontal.offset).addScaledVector(up, framed.vertical.offset)
  return { direction, distance: far, targetOffset, fractions }

}

/** Preserve paint, rubber, glass and material maps; tune only exposed metal surfaces. */
export function enhanceEquipmentMaterials(root: THREE.Object3D) {
  const enhanced = new Map<THREE.Material, THREE.Material>()
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = true
    object.receiveShadow = true
    const tune = (original: THREE.Material) => {
      if (enhanced.has(original)) return enhanced.get(original)!
      const material = original.clone()
      if (material instanceof THREE.MeshStandardMaterial) {
        const metal = /stainless|machined|steel|metal|brass|不锈钢|金属/i.test(material.name)
        material.envMapIntensity = metal ? 1.15 : .75
        if (metal) material.roughness = THREE.MathUtils.clamp(material.roughness, .26, .4)
      }
      enhanced.set(original, material)
      return material
    }
    object.material = Array.isArray(object.material) ? object.material.map(tune) : tune(object.material)
  })
  // Original materials are replaced once per load; shared textures remain owned by the cloned materials.
  enhanced.forEach((_, original) => original.dispose())
}

/** Soft local grounding supplements the directional light's physical cast shadows. */
export function createEquipmentContactShadow(width: number, depth: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(0, 0, 0, .38)')
  gradient.addColorStop(.45, 'rgba(0, 0, 0, .24)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.15, depth * 1.15), material)
  shadow.rotation.x = -Math.PI / 2
  shadow.name = '设备接触阴影'
  shadow.renderOrder = 1
  return shadow
}
