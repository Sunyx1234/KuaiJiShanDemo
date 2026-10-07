<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ParkConfig } from '../data/types'
import { globeBoundarySources } from '../data/globeBoundaries'
import { createGeoJsonBoundaryGroup } from '../services/globeGeoJson'
import { useGroupStore } from '../stores/group'

interface PinProjection {
  left: number
  top: number
  visible: boolean
  labelOffsetX: number
  labelOffsetY: number
  leaderLength: number
  leaderAngle: number
}

interface ParkTransition {
  parkId: string
  navigateOnComplete: boolean
  startedAt: number
  duration: number
  fromQuaternion: THREE.Quaternion
  toQuaternion: THREE.Quaternion
  fromCameraPosition: THREE.Vector3
  toCameraPosition: THREE.Vector3
}

const router = useRouter()
const store = useGroupStore()
const canvasHost = ref<HTMLDivElement | null>(null)
const sceneRoot = ref<HTMLElement | null>(null)
const webglAvailable = ref(true)
const pinPositions = ref<Record<string, PinProjection>>({})
const transitioningPark = ref<ParkConfig | null>(null)
const transitionMode = ref<'inspect' | 'navigate' | null>(null)

const statusLabels = {
  connected: '已接入',
  building: '数字模型建设中',
  planned: '规划接入',
} as const

const hoveredProjection = computed(() => {
  if (!store.hoveredParkId) return null
  return pinPositions.value[store.hoveredParkId] ?? null
})

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let earthGroup: THREE.Group | null = null
let cloudLayer: THREE.Mesh | null = null
let resizeObserver: ResizeObserver | null = null
let boundaryAbortController: AbortController | null = null
let parkTransition: ParkTransition | null = null
let navigationPending = false
const parkAnchors = new Map<string, THREE.Object3D>()
const parkMarkers = new Map<string, THREE.Mesh>()
const parkPulseRings = new Map<string, THREE.Mesh>()
const networkFlowTime = { value: 0 }
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const surfaceNormal = new THREE.Vector3(0, 0, 1)
const labelWidth = 108
const labelHeight = 26
const tooltipWidth = 408
const tooltipEstimatedHeight = 330
const labelViewportPadding = 10

function latLngToVector3(latitude: number, longitude: number, radius: number) {
  const latitudeRadians = THREE.MathUtils.degToRad(latitude)
  const longitudeRadians = THREE.MathUtils.degToRad(longitude)
  return new THREE.Vector3(
    radius * Math.cos(latitudeRadians) * Math.sin(longitudeRadians),
    radius * Math.sin(latitudeRadians),
    radius * Math.cos(latitudeRadians) * Math.cos(longitudeRadians),
  )
}

function createStars() {
  const count = 650
  const positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const radius = 6 + Math.random() * 7
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[index * 3 + 1] = radius * Math.cos(phi)
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: 0x5ebfff,
    size: 0.018,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  })
  return new THREE.Points(geometry, material)
}

function createAtmosphereLayer(
  radius: number,
  color: number,
  strength: number,
  riseEnd: number,
  fadeStart: number,
) {
  const geometry = new THREE.SphereGeometry(radius, 96, 64)
  const material = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      glowStrength: { value: strength },
      riseEnd: { value: riseEnd },
      fadeStart: { value: fadeStart },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float glowStrength;
      uniform float riseEnd;
      uniform float fadeStart;
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        float fresnel = 1.0 - clamp(dot(vNormal, vViewDirection), 0.0, 1.0);
        float softRise = smoothstep(0.12, riseEnd, fresnel);
        float softFade = 1.0 - smoothstep(fadeStart, 1.0, fresnel);
        vec3 lightDirection = normalize(vec3(-0.75, 0.5, 0.45));
        float sunFacing = smoothstep(-0.45, 0.65, dot(vNormal, lightDirection));
        float lightBalance = mix(0.28, 1.0, sunFacing);
        float alpha = softRise * softFade * glowStrength * lightBalance;
        gl_FragColor = vec4(glowColor, alpha);
      }
    `,
  })
  const layer = new THREE.Mesh(geometry, material)
  layer.renderOrder = 1
  return layer
}

function createAtmosphere() {
  return createAtmosphereLayer(1.545, 0x55caff, 0.46, 0.62, 0.84)
}

function createSurfaceRing(
  position: THREE.Vector3,
  innerRadius: number,
  outerRadius: number,
  color: number,
  opacity: number,
) {
  const normal = position.clone().normalize()
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(innerRadius, outerRadius, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  )
  ring.position.copy(normal.multiplyScalar(1.535))
  ring.quaternion.setFromUnitVectors(surfaceNormal, position.clone().normalize())
  return ring
}

function createNetworkArc(start: THREE.Vector3, end: THREE.Vector3, index: number) {
  const pointCount = 56
  const points: THREE.Vector3[] = []
  const flowProgress = new Float32Array(pointCount)
  const startNormal = start.clone().normalize()
  const endNormal = end.clone().normalize()

  for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
    const progress = pointIndex / (pointCount - 1)
    const normal = startNormal.clone().lerp(endNormal, progress).normalize()
    const height = 1.535 + Math.sin(progress * Math.PI) * 0.11
    points.push(normal.multiplyScalar(height))
    flowProgress[pointIndex] = progress
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  geometry.setAttribute('flowProgress', new THREE.BufferAttribute(flowProgress, 1))
  const material = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uTime: networkFlowTime,
      uSpeed: { value: 0.11 + index * 0.004 },
      uOffset: { value: index / Math.max(1, store.parks.length - 1) },
      uBaseColor: { value: new THREE.Color(0x1d6f9f) },
      uHighlightColor: { value: new THREE.Color(0x8de8ff) },
    },
    vertexShader: `
      attribute float flowProgress;
      varying float vFlowProgress;
      void main() {
        vFlowProgress = flowProgress;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uOffset;
      uniform vec3 uBaseColor;
      uniform vec3 uHighlightColor;
      varying float vFlowProgress;
      void main() {
        float flowHead = fract(uTime * uSpeed + uOffset);
        float flowDistance = abs(vFlowProgress - flowHead);
        flowDistance = min(flowDistance, 1.0 - flowDistance);
        float movingBand = smoothstep(0.18, 0.0, flowDistance);
        float brightCore = smoothstep(0.055, 0.0, flowDistance);
        vec3 flowColor = mix(uBaseColor, uHighlightColor, movingBand);
        float flowOpacity = 0.34 + movingBand * 0.46 + brightCore * 0.16;
        gl_FragColor = vec4(flowColor, flowOpacity);
      }
    `,
  })

  return new THREE.Line(geometry, material)
}

function loadEarthTexture(path: string) {
  const texture = new THREE.TextureLoader().load(
    path,
    undefined,
    undefined,
    (error) => console.warn(`地球纹理加载失败：${path}`, error),
  )
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.offset.x = 0.25
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy() ?? 4, 8)
  return texture
}

function createEarthSurfaceMaterial() {
  const supports4KTexture = (renderer?.capabilities.maxTextureSize ?? 2048) >= 4096
  const dayTexture = loadEarthTexture(
    supports4KTexture
      ? '/assets/earth/earth-day-4096.jpg'
      : '/assets/earth/earth-day-2048.jpg',
  )
  const nightTexture = loadEarthTexture(
    supports4KTexture
      ? '/assets/earth/earth-night-4096.jpg'
      : '/assets/earth/earth-night-2048.png',
  )

  return new THREE.MeshPhongMaterial({
    map: dayTexture,
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveMap: nightTexture,
    emissiveIntensity: 0.48,
    specular: 0x24658a,
    shininess: 8,
    transparent: false,
    depthWrite: true,
  })
}

function createCloudLayer() {
  const cloudTexture = loadEarthTexture('/assets/earth/earth-clouds-1024.png')
  const layer = new THREE.Mesh(
    new THREE.SphereGeometry(1.513, 96, 64),
    new THREE.MeshPhongMaterial({
      map: cloudTexture,
      color: 0xe8f7ff,
      specular: 0x000000,
      shininess: 0,
      transparent: true,
      opacity: 0.4,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }),
  )
  layer.name = 'earth-clouds'
  layer.renderOrder = -1
  cloudLayer = layer
  return layer
}

function createEarth() {
  const group = new THREE.Group()
  group.rotation.y = THREE.MathUtils.degToRad(-120)
  group.rotation.x = THREE.MathUtils.degToRad(30)

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 96, 64),
    createEarthSurfaceMaterial(),
  )
  group.add(sphere)
  group.add(createCloudLayer())

  group.add(createAtmosphere())

  const markerGeometry = new THREE.SphereGeometry(0.01, 16, 10)
  store.parks.forEach((park) => {
    const anchor = new THREE.Object3D()
    anchor.position.copy(latLngToVector3(park.latitude, park.longitude, 1.54))
    group.add(anchor)
    parkAnchors.set(park.id, anchor)

    const marker = new THREE.Mesh(
      markerGeometry.clone(),
      new THREE.MeshBasicMaterial({
        color: park.status === 'connected' ? 0x45d799 : 0x2aa9ff,
        transparent: true,
      }),
    )
    marker.position.copy(anchor.position)
    group.add(marker)
    parkMarkers.set(park.id, marker)

    const pulseRing = createSurfaceRing(
      anchor.position,
      park.status === 'connected' ? 0.015 : 0.012,
      park.status === 'connected' ? 0.022 : 0.018,
      park.status === 'connected' ? 0x45d799 : 0x2aa9ff,
      park.status === 'connected' ? 0.76 : 0.48,
    )
    group.add(pulseRing)
    parkPulseRings.set(park.id, pulseRing)
  })

  const hub = parkAnchors.get('huijishan')
  if (hub) {
    const hubPosition = hub.position.clone()
    group.add(createSurfaceRing(hubPosition, 0.036, 0.04, 0x45d799, 0.3))
    group.add(createSurfaceRing(hubPosition, 0.06, 0.064, 0x2aa9ff, 0.16))

    store.parks
      .filter((park) => park.id !== 'huijishan')
      .forEach((park, index) => {
        const target = parkAnchors.get(park.id)
        if (!target) return
        group.add(createNetworkArc(hubPosition, target.position, index))
      })
  }

  return group
}

async function loadBoundaryLayers(targetEarth: THREE.Group) {
  if (!globeBoundarySources.length) return
  boundaryAbortController?.abort()
  boundaryAbortController = new AbortController()

  try {
    const boundaryGroup = await createGeoJsonBoundaryGroup(
      globeBoundarySources,
      boundaryAbortController.signal,
    )
    if (earthGroup !== targetEarth) {
      boundaryGroup.traverse((object) => {
        const line = object as THREE.LineSegments
        line.geometry?.dispose()
        const material = line.material as THREE.Material | undefined
        material?.dispose()
      })
      return
    }
    targetEarth.add(boundaryGroup)
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.warn('合规地图边界资源加载失败，已保留基础地球', error)
    }
  }
}

function resizeRenderer() {
  if (!canvasHost.value || !renderer || !camera) return
  const { clientWidth, clientHeight } = canvasHost.value
  if (!clientWidth || !clientHeight) return
  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(clientWidth, clientHeight, false)
}

function getLabelBounds(projection: PinProjection) {
  const labelLeft = projection.left + projection.labelOffsetX
    - (projection.labelOffsetX < 0 ? labelWidth : 0)
  const labelTop = projection.top + projection.labelOffsetY - labelHeight / 2
  return {
    left: labelLeft,
    right: labelLeft + labelWidth,
    top: labelTop,
    bottom: labelTop + labelHeight,
  }
}

function updateLeaderGeometry(projection: PinProjection) {
  const leaderEndX = projection.labelOffsetX + (projection.labelOffsetX < 0 ? 4 : -4)
  const leaderEndY = projection.labelOffsetY
  projection.leaderLength = Math.max(12, Math.hypot(leaderEndX, leaderEndY))
  projection.leaderAngle = THREE.MathUtils.radToDeg(Math.atan2(leaderEndY, leaderEndX))
}

function resolveLabelCollisions(positions: Record<string, PinProjection>, width: number, height: number) {
  const visiblePins = store.parks
    .map((park) => ({ park, projection: positions[park.id] }))
    .filter((entry): entry is { park: ParkConfig; projection: PinProjection } => Boolean(entry.projection?.visible))

  for (let pass = 0; pass < 14; pass += 1) {
    for (let firstIndex = 0; firstIndex < visiblePins.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < visiblePins.length; secondIndex += 1) {
        const first = visiblePins[firstIndex]
        const second = visiblePins[secondIndex]
        const firstBounds = getLabelBounds(first.projection)
        const secondBounds = getLabelBounds(second.projection)
        const overlapX = Math.min(firstBounds.right, secondBounds.right)
          - Math.max(firstBounds.left, secondBounds.left)
        const overlapY = Math.min(firstBounds.bottom, secondBounds.bottom)
          - Math.max(firstBounds.top, secondBounds.top)
        if (overlapX <= 0 || overlapY <= 0) continue

        const firstCenterY = (firstBounds.top + firstBounds.bottom) / 2
        const secondCenterY = (secondBounds.top + secondBounds.bottom) / 2
        const directionY = firstCenterY === secondCenterY
          ? (first.park.id < second.park.id ? 1 : -1)
          : Math.sign(secondCenterY - firstCenterY)
        const connectedBias = first.park.status === 'connected'
          ? 0.22
          : second.park.status === 'connected'
            ? 0.78
            : 0.5
        const separation = overlapY + 5
        first.projection.labelOffsetY -= directionY * separation * connectedBias
        second.projection.labelOffsetY += directionY * separation * (1 - connectedBias)
      }
    }
  }

  visiblePins.forEach(({ projection }) => {
    const bounds = getLabelBounds(projection)
    if (bounds.left < labelViewportPadding) {
      projection.labelOffsetX += labelViewportPadding - bounds.left
    } else if (bounds.right > width - labelViewportPadding) {
      projection.labelOffsetX -= bounds.right - (width - labelViewportPadding)
    }
    if (bounds.top < 48) {
      projection.labelOffsetY += 48 - bounds.top
    } else if (bounds.bottom > height - 34) {
      projection.labelOffsetY -= bounds.bottom - (height - 34)
    }
    updateLeaderGeometry(projection)
  })
}

function updatePinPositions() {
  if (!canvasHost.value || !camera || !earthGroup) return
  const activeCamera = camera
  earthGroup.updateMatrixWorld(true)
  const width = canvasHost.value.clientWidth
  const height = canvasHost.value.clientHeight
  const cameraDirection = activeCamera.position.clone().normalize()
  const nextPositions: Record<string, PinProjection> = {}

  store.parks.forEach((park) => {
    const anchor = parkAnchors.get(park.id)
    if (!anchor) return
    const worldPosition = anchor.getWorldPosition(new THREE.Vector3())
    const facingCamera = worldPosition.clone().normalize().dot(cameraDirection) > 0.16
    const projected = worldPosition.clone().project(activeCamera)
    const insideViewport = projected.z > -1 && projected.z < 1
    const projection: PinProjection = {
      left: (projected.x * 0.5 + 0.5) * width,
      top: (-projected.y * 0.5 + 0.5) * height,
      visible: facingCamera && insideViewport,
      labelOffsetX: park.pinOffset.x,
      labelOffsetY: park.pinOffset.y,
      leaderLength: 0,
      leaderAngle: 0,
    }
    updateLeaderGeometry(projection)
    nextPositions[park.id] = projection
  })

  resolveLabelCollisions(nextPositions, width, height)
  pinPositions.value = nextPositions
}

function updateNetworkAnimation(elapsedSeconds: number) {
  networkFlowTime.value = elapsedSeconds

  store.parks.forEach((park, index) => {
    const marker = parkMarkers.get(park.id)
    const ring = parkPulseRings.get(park.id)
    if (!marker || !ring) return
    const highlighted = store.hoveredParkId === park.id
      || store.selectedParkId === park.id
      || transitioningPark.value?.id === park.id
    const cycle = (elapsedSeconds * 0.72 + index * 0.14) % 1
    const pulseScale = 1 + cycle * (highlighted ? 1.15 : 0.72)
    marker.scale.setScalar(highlighted ? 1.42 + Math.sin(elapsedSeconds * 5) * 0.16 : 1)
    ring.scale.setScalar(pulseScale)
    const ringMaterial = ring.material as THREE.MeshBasicMaterial
    ringMaterial.opacity = (1 - cycle) * (highlighted ? 0.92 : park.status === 'connected' ? 0.68 : 0.4)
  })
}

function updateCloudAnimation(elapsedSeconds: number) {
  if (!cloudLayer || reducedMotion.matches) return
  cloudLayer.rotation.y = elapsedSeconds * 0.0035
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function updateParkTransition(now: number) {
  if (!parkTransition || !earthGroup || !camera) return false
  const progress = THREE.MathUtils.clamp(
    (now - parkTransition.startedAt) / parkTransition.duration,
    0,
    1,
  )
  const easedProgress = easeInOutCubic(progress)
  earthGroup.quaternion.slerpQuaternions(
    parkTransition.fromQuaternion,
    parkTransition.toQuaternion,
    easedProgress,
  )
  camera.position.lerpVectors(
    parkTransition.fromCameraPosition,
    parkTransition.toCameraPosition,
    easedProgress,
  )
  camera.lookAt(0, 0, 0)

  if (progress >= 1) {
    const completedTransition = parkTransition
    parkTransition = null
    if (completedTransition.navigateOnComplete) {
      void navigateToPark(completedTransition.parkId)
    } else {
      transitioningPark.value = null
      transitionMode.value = null
      if (controls) controls.enabled = true
    }
  }
  return true
}

async function navigateToPark(parkId: string) {
  if (navigationPending) return
  navigationPending = true
  try {
    await router.push(`/park/${parkId}`)
  } finally {
    navigationPending = false
    transitioningPark.value = null
    transitionMode.value = null
    if (controls) controls.enabled = true
  }
}

function disposeScene() {
  if (renderer) renderer.setAnimationLoop(null)
  boundaryAbortController?.abort()
  resizeObserver?.disconnect()
  controls?.dispose()
  scene?.traverse((object) => {
    const renderable = object as THREE.Mesh | THREE.Points
    renderable.geometry?.dispose()
    const materials = Array.isArray(renderable.material) ? renderable.material : [renderable.material]
    materials.filter(Boolean).forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) value.dispose()
      })
      if (material instanceof THREE.ShaderMaterial) {
        Object.values(material.uniforms).forEach((uniform) => {
          if (uniform.value instanceof THREE.Texture) uniform.value.dispose()
        })
      }
      material?.dispose()
    })
  })
  renderer?.dispose()
  if (renderer?.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement)
  parkTransition = null
  navigationPending = false
  transitionMode.value = null
  parkAnchors.clear()
  parkMarkers.clear()
  parkPulseRings.clear()
  networkFlowTime.value = 0
  cloudLayer = null
  scene = null
  camera = null
  renderer = null
  controls = null
  earthGroup = null
}

function initializeScene() {
  if (!canvasHost.value) return
  try {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0.18, 4.3)

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.className = 'group-globe__canvas'
    canvasHost.value.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x8ccfff, 0.22))
    const keyLight = new THREE.DirectionalLight(0xe5f5ff, 2.25)
    keyLight.position.set(-4.2, 2.4, 2.8)
    scene.add(keyLight)
    const rimLight = new THREE.DirectionalLight(0x176bd3, 0.3)
    rimLight.position.set(3.5, -1.2, -3)
    scene.add(rimLight)
    scene.add(createStars())

    earthGroup = createEarth()
    scene.add(earthGroup)
    void loadBoundaryLayers(earthGroup)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.055
    controls.enablePan = false
    controls.minDistance = 2.2
    controls.maxDistance = 5.8
    controls.zoomSpeed = 0.82
    controls.autoRotate = !reducedMotion.matches && store.parks.length > 1
    controls.autoRotateSpeed = 0.38

    resizeObserver = new ResizeObserver(resizeRenderer)
    resizeObserver.observe(canvasHost.value)
    resizeRenderer()

    const animationClock = new THREE.Clock()
    renderer.setAnimationLoop(() => {
      if (!renderer || !scene || !camera || !controls) return
      const transitionActive = updateParkTransition(performance.now())
      if (!transitionActive && !transitioningPark.value) {
        controls.autoRotate = !reducedMotion.matches && store.parks.length > 1 && !store.hoveredParkId
        controls.update()
      }
      const elapsedSeconds = animationClock.getElapsedTime()
      updateCloudAnimation(elapsedSeconds)
      updateNetworkAnimation(elapsedSeconds)
      updatePinPositions()
      renderer.render(scene, camera)
    })
  } catch (error) {
    webglAvailable.value = false
    console.error('集团三维地球初始化失败', error)
    disposeScene()
  }
}

function pinStyle(park: ParkConfig): CSSProperties {
  const projection = pinPositions.value[park.id]
  const labelOffsetX = projection?.labelOffsetX ?? park.pinOffset.x
  const labelOffsetY = projection?.labelOffsetY ?? park.pinOffset.y
  return {
    left: `${projection?.left ?? 0}px`,
    top: `${projection?.top ?? 0}px`,
    opacity: projection?.visible ? 1 : 0,
    pointerEvents: projection?.visible ? 'auto' : 'none',
    '--label-x': `${labelOffsetX}px`,
    '--label-y': `${labelOffsetY}px`,
    '--leader-length': `${projection?.leaderLength ?? Math.hypot(labelOffsetX, labelOffsetY)}px`,
    '--leader-angle': `${projection?.leaderAngle ?? THREE.MathUtils.radToDeg(Math.atan2(labelOffsetY, labelOffsetX))}deg`,
  } as CSSProperties
}

function isLabelLeft(park: ParkConfig) {
  return (pinPositions.value[park.id]?.labelOffsetX ?? park.pinOffset.x) < 0
}

function tooltipStyle() {
  if (!hoveredProjection.value) return {}
  const width = sceneRoot.value?.clientWidth ?? 0
  const height = sceneRoot.value?.clientHeight ?? 0
  const labelLeft = hoveredProjection.value.left + hoveredProjection.value.labelOffsetX
    - (hoveredProjection.value.labelOffsetX < 0 ? labelWidth : 0)
  const labelBottom = hoveredProjection.value.top
    + hoveredProjection.value.labelOffsetY
    + labelHeight / 2
  return {
    left: `${Math.min(Math.max(12, labelLeft), Math.max(12, width - tooltipWidth - 12))}px`,
    top: `${Math.min(Math.max(48, labelBottom - 1), Math.max(48, height - tooltipEstimatedHeight - 12))}px`,
  }
}

function startParkFocus(park: ParkConfig, navigateOnComplete: boolean) {
  const anchor = parkAnchors.get(park.id)
  if (!anchor || !earthGroup || !camera || !controls || reducedMotion.matches) {
    if (navigateOnComplete) void navigateToPark(park.id)
    return
  }

  const fromQuaternion = earthGroup.quaternion.clone()
  const anchorDirection = anchor.getWorldPosition(new THREE.Vector3()).normalize()
  const cameraDirection = camera.position.clone().normalize()
  const rotationDelta = new THREE.Quaternion().setFromUnitVectors(anchorDirection, cameraDirection)
  const toQuaternion = rotationDelta.multiply(fromQuaternion.clone()).normalize()
  const targetDistance = Math.max(controls.minDistance, 2.62)

  controls.autoRotate = false
  controls.enabled = false
  transitioningPark.value = park
  transitionMode.value = navigateOnComplete ? 'navigate' : 'inspect'
  parkTransition = {
    parkId: park.id,
    navigateOnComplete,
    startedAt: performance.now(),
    duration: navigateOnComplete ? 780 : 620,
    fromQuaternion,
    toQuaternion,
    fromCameraPosition: camera.position.clone(),
    toCameraPosition: cameraDirection.multiplyScalar(targetDistance),
  }
}

async function openPark(park: ParkConfig) {
  store.selectPark(park.id)
  if (park.status !== 'connected' || navigationPending) return
  store.setHoveredPark(park.id)
  startParkFocus(park, true)
}

watch(
  () => store.focusRequest?.sequence,
  () => {
    const request = store.focusRequest
    if (!request || navigationPending) return
    const park = store.getPark(request.parkId)
    if (park) startParkFocus(park, false)
  },
)

onMounted(initializeScene)
onBeforeUnmount(disposeScene)
</script>

<template>
  <section ref="sceneRoot" class="group-globe-scene" @click.self="store.setHoveredPark(null)">
    <div class="group-globe__title">
      <span>HUIJISHAN · SHAOXING</span>
      <strong>会稽山绍兴园区</strong>
    </div>
    <div class="group-globe__status">
      <span><i class="connected" />园区数字场景已接入</span>
    </div>

    <div v-if="webglAvailable" ref="canvasHost" class="group-globe__host" />
    <div v-else class="group-globe__fallback">
      <i />
      <strong>当前设备无法启用三维地球</strong>
      <span>仍可通过园区列表进入三维场景。</span>
      <div>
        <button v-for="park in store.parks" :key="park.id" :disabled="park.status !== 'connected'"
          @click="openPark(park)">
          {{ park.shortName }}
          <small>{{ statusLabels[park.status] }}</small>
        </button>
      </div>
    </div>

    <div v-if="webglAvailable" class="group-globe__pins">
      <button v-for="park in store.parks" :key="park.id" class="group-park-pin"
        :class="[park.status, { hovered: store.hoveredParkId === park.id, 'label-left': isLabelLeft(park) }]"
        :style="pinStyle(park)" :aria-label="`查看${park.name}`"
        @mouseenter="store.setHoveredPark(park.id)" @mouseleave="store.setHoveredPark(null)"
        @focus="store.setHoveredPark(park.id)" @blur="store.setHoveredPark(null)"
        @click.stop="openPark(park)">
        <i><u /></i>
        <span>
          <b>{{ park.shortName }}</b>
        </span>
      </button>

      <article v-if="store.hoveredPark && hoveredProjection?.visible" class="group-park-tooltip"
        :class="store.hoveredPark.status" :style="tooltipStyle()"
        @mouseenter="store.setHoveredPark(store.hoveredPark.id)"
        @mouseleave="store.setHoveredPark(null)">
        <header>
          <span>DIGITAL TWIN CAMPUS</span>
          <small>{{ store.hoveredPark.city }}</small>
        </header>
        <h3>{{ store.hoveredPark.name }}</h3>
        <p>{{ store.hoveredPark.summary }}</p>
        <dl>
          <div>
            <dt>园区场景</dt>
            <dd>{{ store.hoveredPark.products }}</dd>
          </div>
          <div>
            <dt>园区定位</dt>
            <dd>{{ store.hoveredPark.positioning }}</dd>
          </div>
        </dl>
        <footer>
          <button v-if="store.hoveredPark.status === 'connected'" type="button"
            @click.stop="store.hoveredPark && openPark(store.hoveredPark)">
            进入园区 →
          </button>
          <span v-else>园区场景建设中</span>
        </footer>
      </article>
    </div>

    <Transition name="group-focus">
      <div v-if="transitioningPark && transitionMode === 'navigate'" class="group-globe__transition" aria-live="polite">
        <i><u /></i>
        <span>FOCUSING DIGITAL TWIN</span>
        <strong>正在进入 {{ transitioningPark.shortName }}</strong>
      </div>
    </Transition>

  </section>
</template>
