import * as THREE from 'three'
import type { CampusRegion } from '../data/processRegions'

// 对合并后的模型几何按世界坐标着色，保留建筑原始材质与夜景。
export function createCampusRegionHighlight(model: THREE.Group) {
  const uniforms = {
    regionMin: { value: new THREE.Vector2() }, regionMax: { value: new THREE.Vector2() },
    regionColor: { value: new THREE.Color('#66e0e5') }, regionStrength: { value: 0 },
  }
  const cloned = new Map<THREE.MeshStandardMaterial, THREE.MeshStandardMaterial>()
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !/^(02|03|04|05|20|25)[ _]/.test(object.name)) return
    const patch = (material: THREE.Material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return material
      const cached = cloned.get(material)
      if (cached) return cached
      const copy = material.clone()
      copy.customProgramCacheKey = () => 'campus-process-region-v1'
      copy.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms)
        shader.vertexShader = 'varying vec3 processWorldPosition;\n' + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', 'processWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>')
        shader.fragmentShader = 'varying vec3 processWorldPosition; uniform vec2 regionMin; uniform vec2 regionMax; uniform vec3 regionColor; uniform float regionStrength;\n' + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          vec2 processNear = smoothstep(regionMin, regionMin + vec2(1.5), processWorldPosition.xz);
          vec2 processFar = 1.0 - smoothstep(regionMax - vec2(1.5), regionMax, processWorldPosition.xz);
          float processMask = processNear.x * processNear.y * processFar.x * processFar.y * regionStrength;
          diffuseColor.rgb = mix(diffuseColor.rgb, regionColor, processMask * 0.6);`)
        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += regionColor * processMask * 0.42;')
      }
      cloned.set(material, copy)
      return copy
    }
    object.material = Array.isArray(object.material) ? object.material.map(patch) : patch(object.material)
  })
  let targetStrength = 0
  function setRegion(region: CampusRegion | null | undefined, bounds: THREE.Box3) {
    targetStrength = region ? 1 : 0
    if (!region || bounds.isEmpty()) return
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const x = center.x + (region.x - 50) / 50 * size.x * .68
    const z = center.z + (region.y - 50) / 50 * size.z * .68
    const width = region.width / 100 * size.x * 1.36
    const depth = region.depth / 100 * size.z * 1.36
    uniforms.regionMin.value.set(x - width / 2, z - depth / 2)
    uniforms.regionMax.value.set(x + width / 2, z + depth / 2)
    uniforms.regionColor.value.set(region.color)
  }
  function update() {
    uniforms.regionStrength.value = THREE.MathUtils.lerp(uniforms.regionStrength.value, targetStrength, .16)
    if (Math.abs(uniforms.regionStrength.value - targetStrength) < .005) uniforms.regionStrength.value = targetStrength
    return uniforms.regionStrength.value !== targetStrength
  }
  return { setRegion, update }
}
