import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { parkBuildings } from './parkLayout'

/** Photo-guided architectural study. Dimensions and unseen elevations are approximate.
 * All materials stay inside the existing dashboard's navy / steel blue / cyan palette.
 * Repeated opaque pieces are batched by material to keep the orbit preview inexpensive. */
export function createJiaxingPark(): THREE.Group {
  const root = new THREE.Group()
  root.name = '正泰嘉兴园区 · 建筑场景模型'
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const unitBox = new THREE.BoxGeometry(1, 1, 1)
  const transform = new THREE.Matrix4()
  const quaternion = new THREE.Quaternion()
  const euler = new THREE.Euler()
  const position = new THREE.Vector3()
  const scale = new THREE.Vector3()
  const materials = {
    base: material('#081c33', .88),
    ground: material('#122e45', .94),
    road: material('#0c2035', .96),
    kerb: material('#35596e', .8),
    wall: material('#31546e', .72, .18),
    roof: material('#4e7690', .63, .35),
    roofAlternate: material('#456b85', .62, .3),
    rib: material('#789daf', .5, .5),
    office: material('#18384f', .62, .22),
    glass: material('#12617d', .27, .56, '#0c5675', .18),
    windowFrame: material('#457e98', .45, .6),
    solar: material('#103c66', .32, .55),
    solarLine: material('#42799b', .5, .4),
    lawn: material('#123f45', .97),
    hedge: material('#1b5558', .98),
    tree: material('#21636a', .95),
    treeLight: material('#347c80', .95),
    trunk: material('#294b59', 1),
    court: material('#1b5368', .95),
    courtInner: material('#286c78', .9),
    marking: material('#749daf', .9),
    cyan: material('#2fadd6', .4, .35, '#1ba9e5', .7),
    car: material('#8babbc', .5, .4),
    carBlue: material('#28738f', .45, .5),
    carDark: material('#234053', .48, .5),
    light: material('#abdeed', .35, .2, '#65caff', 1.2),
  }
  function material(color: string, roughness: number, metalness = 0, emissive = '#000000', emissiveIntensity = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity })
  }
  function add(geometry: THREE.BufferGeometry, mat: THREE.Material) {
    const list = batches.get(mat) ?? []
    list.push(geometry)
    batches.set(mat, list)
  }
  function box(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material, ry = 0, rx = 0, rz = 0) {
    quaternion.setFromEuler(euler.set(rx, ry, rz))
    transform.compose(position.set(x, y, z), quaternion, scale.set(w, h, d))
    add(unitBox.clone().applyMatrix4(transform), mat)
  }
  function line(points: number[][], mat: THREE.Material, width = .18) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i]
      const dx = b[0] - a[0], dz = b[1] - a[1]
      box((a[0] + b[0]) / 2, .36, (a[1] + b[1]) / 2, width, .06, Math.hypot(dx, dz), mat, Math.atan2(dx, dz))
    }
  }
  function slab(x: number, z: number, w: number, d: number, mat: THREE.Material, y = .18) {
    box(x, y, z, w, .16, d, mat)
  }
  function outline(x: number, z: number, w: number, d: number, y: number, mat = materials.cyan, thickness = .16) {
    box(x, y, z - d / 2, w, thickness, thickness, mat)
    box(x, y, z + d / 2, w, thickness, thickness, mat)
    box(x - w / 2, y, z, thickness, thickness, d, mat)
    box(x + w / 2, y, z, thickness, thickness, d, mat)
  }

  // A raised site plinth, inset pavement and perimeter circulation.
  box(0, -2.1, 0, 268, 4, 240, materials.base)
  box(0, -.08, 0, 260, .3, 232, materials.ground)
  outline(0, 0, 268, 240, -.1, materials.cyan, .28)
  outline(0, 0, 268.2, 240.2, -2.8, materials.windowFrame, .12)
  for (const x of [-123, 113]) slab(x, 0, 11, 225, materials.road)
  for (const z of [-108, -66, 4, 61, 101]) slab(-3, z, 239, z === 101 ? 14 : 8, materials.road)
  slab(-13, -45, 10, 119, materials.road)
  slab(-28, 40, 9, 53, materials.road)
  // Dashed lanes, crossings and directional arrows.
  for (let z = -103; z < 112; z += 8) for (const x of [-123, 113]) slab(x, z, .23, 3.5, materials.marking, .3)
  for (let x = -115; x < 115; x += 8) slab(x, 102, 3.5, .23, materials.marking, .3)
  for (let i = 0; i < 8; i++) {
    slab(-34 + i * 1.6, 94, .75, 8, materials.marking, .3)
    slab(113, 54 + i * 1.4, 8, .6, materials.marking, .3)
  }

  // Roof bays and ridge/seam systems distinguish the low, expansive production halls.
  for (const building of parkBuildings) {
    const { x, z, width: w, depth: d, height: h } = building
    if (building.kind === 'office') continue
    box(x, h / 2, z, w, h, d, materials.wall)
    box(x, .65, z, w + .8, 1.1, d + .8, materials.office)
    const bays = Math.round(w / 15)
    const bayWidth = w / bays
    for (let bay = 0; bay < bays; bay++) {
      const cx = x - w / 2 + bayWidth * (bay + .5)
      for (const side of [-1, 1]) {
        box(cx + side * bayWidth / 4, h + .7, z, bayWidth / 2 + .2, .25, d + 1,
          bay % 2 ? materials.roofAlternate : materials.roof, 0, 0, -side * .1)
      }
      box(cx, h + 1.12, z, .32, .22, d + 1, materials.rib)
      // Continuous translucent rooflights, broken at fire compartments.
      for (const offset of [-d * .26, d * .26]) {
        box(cx + bayWidth * .23, h + .95, z + offset, 1.3, .12, d * .35, materials.glass)
      }
      for (let seam = -bayWidth / 2; seam < bayWidth / 2; seam += 2.2) {
        box(cx + seam, h + 1.16 - Math.abs(seam) * .1, z, .07, .05, d, materials.rib)
      }
    }
    outline(x, z, w + 1, d + 1, h + .9, materials.windowFrame, .2)
    // Horizontal clerestories, corrugated cladding, portal frames and loading doors.
    for (const face of [-1, 1]) {
      box(x, h - 2.3, z + face * (d / 2 + .06), w - 3, 1.15, .14, materials.glass)
      for (let offset = -w / 2 + 3; offset < w / 2; offset += 7) {
        box(x + offset, h / 2, z + face * (d / 2 + .16), .23, h, .25, materials.rib)
      }
      for (let door = -w / 2 + 10; door < w / 2 - 4; door += 24) {
        box(x + door, 2.4, z + face * (d / 2 + .22), 6, 4.8, .3, materials.office)
        box(x + door, 5, z + face * (d / 2 + 1), 7.3, .28, 2.4, materials.roof)
        for (let l = 1; l < 5; l++) box(x + door, l * .7, z + face * (d / 2 + .4), 5.5, .08, .06, materials.windowFrame)
      }
    }
    for (const side of [-1, 1]) {
      box(x + side * (w / 2 + .08), h - 2.3, z, .15, 1.15, d - 3, materials.glass)
      for (let offset = -d / 2 + 2; offset < d / 2; offset += 5) box(x + side * (w / 2 + .12), h / 2, z + offset, .25, h, .18, materials.rib)
    }
    // Reference-inspired photovoltaic fields on the rear roofs.
    if (z < -60) solarArray(x, h + 1.65, z, w - 8, d - 6)
  }

  function solarArray(x: number, y: number, z: number, w: number, d: number) {
    const columns = Math.floor(w / 3), rows = Math.floor(d / 4)
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const px = x + (col - (columns - 1) / 2) * 3
      const pz = z + (row - (rows - 1) / 2) * 4
      box(px, y, pz, 2.8, .16, 3.35, materials.solar, 0, -.08)
      for (const mountZ of [-1, 1]) box(px, y - .35, pz + mountZ, .15, .65, .15, materials.windowFrame)
      box(px, y + .18, pz, .07, .05, 3.32, materials.solarLine)
      for (const delta of [-.8, .8]) box(px, y + .18, pz + delta, 2.8, .05, .045, materials.solarLine)
    }
  }

  // Front glazed office wings with a visible roof terrace and rooftop solar banks.
  for (const building of parkBuildings) {
    if (building.kind !== 'office') continue
    const { x, z, width: w, depth: d, height: h } = building
    box(x, h / 2, z, w, h, d, materials.office)
    for (const face of [-1, 1]) {
      box(x, h * .49, z + face * (d / 2 + .06), w - 3, h - 2, .16, materials.glass)
      for (let col = -w / 2 + 2; col < w / 2; col += 2.8) box(x + col, h / 2, z + face * (d / 2 + .2), .12, h - 1, .23, materials.windowFrame)
      for (let floor = 1; floor < 4; floor++) box(x, floor * h / 3 - .5, z + face * (d / 2 + .3), w + .3, .32, .5, materials.windowFrame)
    }
    for (const side of [-1, 1]) for (let offset = -d / 2 + 3; offset < d / 2; offset += 3.2) {
      for (let floor = 0; floor < 3; floor++) box(x + side * (w / 2 + .08), 2 + floor * 3.1, z + offset, .2, 1.8, 1.35, materials.glass)
    }
    box(x, h, z, w + .8, .4, d + .8, materials.roofAlternate)
    outline(x, z, w, d, h + .7, materials.rib, .5)
    outline(x, z, w + .3, d + .3, h + .15, materials.cyan, .12)
    solarArray(x - w * .09, h + 1.15, z, w * .68, d * .7)
    for (let i = 0; i < Math.floor(w / 15); i++) {
      box(x - w / 2 + 5 + i * 12, h + 1.1, z - d / 2 + 2, 3.5, 1.7, 2, materials.kerb)
    }
    slab(x, z + d / 2 + 2, w + 2, 3, materials.kerb)
  }
  // Open rectangular arrival portal: four tall columns and parallel overhead beams.
  for (const x of [-49, -15]) for (const z of [70, 87]) box(x, 7.5, z, 1.9, 15, 1.9, materials.roof)
  for (const z of [70, 87]) box(-32, 15, z, 36, 1.6, 2, materials.roof)
  for (const x of [-49, -15]) box(x, 15, 78.5, 2, 1.6, 19, materials.roof)
  for (let x = -45; x < -17; x += 5) box(x, 15.05, 78.5, .8, .7, 17, materials.rib)
  box(-32, 14.1, 88.1, 33, .16, .18, materials.cyan)
  slab(-32, 78.5, 32, 17, materials.kerb)
  // Architectural nameplates are canvas text assets authored in code, not photo textures.
  sign('CHINT  正泰', -32, 12.85, 88.12, 20, 2.6)
  sign('正 泰 电 气', 42, 8.9, 90.22, 23, 2.2)

  // Planted courts, paths, low hedge borders and a sports area in the reference.
  for (const [x, z, w, d] of [[-74, 31.5, 66, 43], [15, 31.5, 67, 43], [77, 46, 33, 15]]) {
    slab(x, z, w + 1.4, d + 1.4, materials.kerb)
    slab(x, z, w, d, materials.lawn, .3)
    outline(x, z, w - 1, d - 1, .5, materials.hedge, .65)
    const path: number[][] = []
    for (let t = 0; t <= 24; t++) {
      const u = t / 24
      path.push([x - w * .46 + w * .92 * u, z + Math.sin(u * Math.PI * 2) * d * .27])
    }
    line(path, materials.kerb, .9)
    line([[x - w * .15, z - d * .47], [x + w * .08, z], [x + w * .3, z + d * .47]], materials.kerb, .75)
    for (let i = 0; i < 16; i++) {
      const tx = x + Math.sin(i * 12.9898 + x) * w * .4
      const tz = z + Math.cos(i * 7.31 + z) * d * .35
      if (Math.abs(tz - z) > 3) tree(tx, tz, 1.9 + (i % 3) * .35, i)
    }
  }
  for (let i = 0; i < 2; i++) {
    const x = 67 + i * 19
    slab(x, 27.5, 17, 19, materials.court)
    slab(x, 27.5, 13.8, 16.2, materials.courtInner, .29)
    outline(x, 27.5, 13.6, 16, .4, materials.marking, .12)
    line([[x - 6.8, 27.5], [x + 6.8, 27.5]], materials.marking, .12)
    const ring = new THREE.RingGeometry(2, 2.12, 32).rotateX(-Math.PI / 2).translate(x, .42, 27.5)
    add(ring, materials.marking)
    for (const end of [-1, 1]) {
      box(x, 1.6, 27.5 + end * 8, .14, 3.2, .14, materials.rib)
      box(x, 3.2, 27.5 + end * 7.5, 1.4, .9, .12, materials.marking)
    }
  }

  function tree(x: number, z: number, height: number, variant = 0) {
    const trunk = new THREE.CylinderGeometry(.16, .24, height * .65, 5).translate(x, height * .325, z)
    add(trunk, materials.trunk)
    for (let crown = 0; crown < 2; crown++) {
      const geometry = new THREE.IcosahedronGeometry(height * (.42 - crown * .07), 1)
      geometry.scale(1, 1.2, .92).translate(x + crown * .35, height * (.65 + crown * .23), z)
      add(geometry, variant % 3 ? materials.tree : materials.treeLight)
    }
  }
  // Avenues and site perimeter planting.
  for (let x = -113; x < 109; x += 6) {
    if (x < -50 || x > -12) tree(x, 112, 3.1 + (Math.abs(x) % 3) * .3, x)
    tree(x, 8, 3, x)
    if (x < 99) tree(x, 56, 3.2, x)
  }
  for (let z = -102; z <= 90; z += 7) {
    tree(124, z, 3.6, z)
    tree(-132, z, 3.6, z)
  }
  for (let x = -114; x < 110; x += 9) tree(x, -116, 3, x)

  function car(x: number, z: number, rotation: number, variant: number) {
    const color = variant % 5 === 0 ? materials.carBlue : variant % 3 === 0 ? materials.carDark : materials.car
    box(x, .8, z, 1.8, 1.1, 3.8, color, rotation)
    box(x, 1.45, z, 1.55, .65, 2, materials.glass, rotation)
    const dz = Math.cos(rotation) * 1.86, dx = Math.sin(rotation) * 1.86
    box(x + dx, .83, z + dz, 1.4, .16, .13, materials.light, rotation)
  }
  function parkingRow(x: number, z: number, count: number, alongZ = false) {
    for (let i = 0; i < count; i++) {
      const px = x + (alongZ ? 0 : i * 2.9), pz = z + (alongZ ? i * 2.9 : 0)
      if (i % 7 !== 4) car(px, pz, alongZ ? Math.PI / 2 : 0, i)
      box(px + (alongZ ? 0 : 1.35), .3, pz + (alongZ ? 1.35 : 0), alongZ ? 4.7 : .08, .05, alongZ ? .08 : 4.7, materials.marking)
    }
  }
  parkingRow(-108, 95, 20)
  parkingRow(-9, 96, 34)
  parkingRow(103.5, -96, 49, true)
  parkingRow(-104, .2, 24)
  parkingRow(-9, .2, 31)
  parkingRow(-114, 31, 18, true)
  // Fences, streetlights, gatehouse and service equipment.
  for (const x of [-129, 120]) {
    for (let z = -111; z < 115; z += 4) box(x, 1.25, z, .18, 2.5, .18, materials.windowFrame)
    for (const y of [.5, 1.5, 2.45]) box(x, y, 0, .12, .1, 224, materials.windowFrame)
  }
  for (let x = -115; x < 115; x += 16) {
    for (const z of [59, 107]) {
      box(x, 3.3, z, .2, 6.6, .2, materials.windowFrame)
      box(x, 6.6, z - .6, .2, .15, 1.4, materials.windowFrame)
      box(x, 6.55, z - 1.2, .6, .1, 1, materials.light)
    }
  }
  box(108, 2, 84, 4.5, 4, 6, materials.office)
  box(108, 4.1, 84, 5.5, .3, 7, materials.roof)
  box(108, 2.6, 87.1, 3.5, 1.7, .13, materials.glass)
  box(114, 1.1, 88, 6.7, .2, .25, materials.cyan)
  for (let i = 0; i < 3; i++) {
    box(106, 2, -82 + i * 7, 4.5, 4, 5, materials.wall)
    box(106, 4.15, -82 + i * 7, 4.9, .3, 5.4, materials.rib)
  }
  // Flagpoles beside the main entrance.
  for (const x of [-46, -40, -34]) {
    box(x, 5, 110, .13, 10, .13, materials.rib)
    box(x + 1, 8.9, 110, 2, 1.2, .04, materials.cyan)
  }

  function sign(text: string, x: number, y: number, z: number, w: number, h: number) {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 1024, 128)
    ctx.font = '600 80px Arial, "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#a4dcef'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 512, 66)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }))
    mesh.name = text
    mesh.position.set(x, y, z)
    root.add(mesh)
  }

  // One draw call per material; temporary transformed pieces are freed after merging.
  for (const [mat, pieces] of batches) {
    const geometry = mergeGeometries(pieces, false)
    if (geometry) {
      const mesh = new THREE.Mesh(geometry, mat)
      mesh.name = Object.entries(materials).find(([, value]) => value === mat)?.[0] ?? 'architecture'
      mesh.castShadow = !['lawn', 'ground', 'road', 'marking', 'cyan'].includes(mesh.name)
      mesh.receiveShadow = true
      root.add(mesh)
    }
    pieces.forEach(piece => piece.dispose())
  }
  unitBox.dispose()
  root.userData.referenceFidelity = 'Approximate architectural reconstruction from one aerial photo'
  root.userData.palette = 'CHINT dashboard navy / steel blue / cyan'
  return root
}
