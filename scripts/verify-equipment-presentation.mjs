import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
const source = await readFile(new URL('../src/three/equipmentPresentation.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replaceAll("'three'", `'${import.meta.resolve('three')}'`)
const { fitEquipmentCamera, enhanceEquipmentMaterials } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const assets = [
  ['single', 'experiments/equipment-01-loader/model/bottling-loader.glb'],
  ['single', 'experiments/equipment-03-filter-press/model/plate-frame-filter-press.glb'],
  ['single', 'experiments/equipment-09-fermenter/model/发酵罐-单罐.glb'],
  ['group', 'experiments/equipment-09-fermenter/model/发酵罐-八罐整体.glb'],
  ['group', 'experiments/equipment-10-post-fermenter/model/后发酵罐-24罐整体.glb'],
  ['group', 'experiments/equipment-04-rice-steamer/model/rice-steamer.glb'],
  ['line', 'experiments/bottling-line-01/model/bottling-line.glb'],
]
for (const [mode, path] of assets) {
  const bytes = await readFile(path)
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
  const box = new THREE.Box3().setFromObject(gltf.scene), size = box.getSize(new THREE.Vector3())
  if (path.includes('rice-steamer')) size.x = size.x * 2 + 2.5
  for (const aspect of [1.4, 1.55, 1.8, 2]) {
    const fit = fitEquipmentCamera(size, aspect, mode)
    const camera = new THREE.PerspectiveCamera(40, aspect, .01, 1000)
    camera.position.copy(fit.direction).multiplyScalar(fit.distance).add(fit.targetOffset); camera.lookAt(fit.targetOffset); camera.updateMatrixWorld()
    const points = []
    for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) points.push(new THREE.Vector3(x * size.x, y * size.y, z * size.z).project(camera))
    const width = (Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x))) / 2
    const height = (Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))) / 2
    assert.ok(points.every(p => Math.abs(p.x) <= .941 && Math.abs(p.y) <= .821), path)
    assert.ok(Number.isFinite(fit.distance) && fit.distance > 0)
    if (aspect === 1.8) {
      if (mode === 'single') assert.ok(height >= .60 && height <= .75, path)
      if (mode === 'group') assert.ok(width >= .75 && width <= .85, path)
      if (mode === 'line') assert.ok(width >= .90 && width <= .95, path)
    }
    if (aspect === 1.8) console.log(`${mode} ${path.split('/').pop()}: size ${size.toArray().map(v=>v.toFixed(1))}, width ${(width*100).toFixed(1)}%, height ${(height*100).toFixed(1)}%`)
  }
}
const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'Stainless', metalness: .8, roughness: .05 }))
enhanceEquipmentMaterials(mesh)
assert.equal(mesh.material.metalness, .8)
assert.equal(mesh.material.roughness, .26)
assert.equal(mesh.castShadow, true)
assert.equal(mesh.receiveShadow, true)
const glass = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhysicalMaterial({ name: 'Guard glass', roughness: .02, transmission: .85, transparent: true, opacity: .3 }))
enhanceEquipmentMaterials(glass)
assert.equal(glass.material.roughness, .02)
assert.equal(glass.material.transmission, .85)
assert.equal(glass.material.opacity, .3)
const paint = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'Safety yellow', color: '#d8bd42', roughness: .55, metalness: .05 }))
const paintColor = paint.material.color.getHex()
enhanceEquipmentMaterials(paint)
assert.equal(paint.material.color.getHex(), paintColor)
assert.equal(paint.material.roughness, .55)
console.log('PASS: seven real equipment assets fit four viewport ratios; target coverage, metal finish, preserved glass/paint and shadow flags verified.')
