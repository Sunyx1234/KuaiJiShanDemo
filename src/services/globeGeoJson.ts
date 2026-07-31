import * as THREE from 'three'

type Position = [longitude: number, latitude: number]

interface GeoJsonGeometry {
  type: string
  coordinates?: unknown
  geometries?: GeoJsonGeometry[]
}

interface GeoJsonFeature {
  type: 'Feature'
  geometry: GeoJsonGeometry | null
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

export interface GlobeBoundarySource {
  id: string
  label: string
  scope: 'world' | 'china' | 'province'
  assetUrl: `/assets/geo/${string}.geojson`
  provenanceUrl: `https://${string}`
  reviewNumber?: string
  authorizedForProduction: boolean
  developmentOnly?: boolean
  color: number
  opacity: number
  radius?: number
}

function isPosition(value: unknown): value is Position {
  return Array.isArray(value)
    && value.length >= 2
    && typeof value[0] === 'number'
    && Number.isFinite(value[0])
    && typeof value[1] === 'number'
    && Number.isFinite(value[1])
}

function positionLines(geometry: GeoJsonGeometry | null): Position[][] {
  if (!geometry) return []
  const coordinates = geometry.coordinates

  if (geometry.type === 'LineString' && Array.isArray(coordinates)) {
    return [coordinates.filter(isPosition)]
  }
  if ((geometry.type === 'MultiLineString' || geometry.type === 'Polygon') && Array.isArray(coordinates)) {
    return coordinates
      .filter(Array.isArray)
      .map(line => line.filter(isPosition))
  }
  if (geometry.type === 'MultiPolygon' && Array.isArray(coordinates)) {
    return coordinates.flatMap((polygon) => (
      Array.isArray(polygon)
        ? polygon.filter(Array.isArray).map(line => line.filter(isPosition))
        : []
    ))
  }
  if (geometry.type === 'GeometryCollection') {
    return (geometry.geometries ?? []).flatMap(positionLines)
  }
  return []
}

function validateSource(source: GlobeBoundarySource) {
  if (!source.authorizedForProduction && !source.developmentOnly) {
    throw new Error(`地图边界 ${source.id} 未标记为可用于生产环境`)
  }
  if ((source.scope === 'china' || source.scope === 'province') && !source.reviewNumber) {
    throw new Error(`地图边界 ${source.id} 缺少审图号`)
  }
}

function latLngToVector3([longitude, latitude]: Position, radius: number) {
  const latitudeRadians = THREE.MathUtils.degToRad(latitude)
  const longitudeRadians = THREE.MathUtils.degToRad(longitude)
  return new THREE.Vector3(
    radius * Math.cos(latitudeRadians) * Math.sin(longitudeRadians),
    radius * Math.sin(latitudeRadians),
    radius * Math.cos(latitudeRadians) * Math.cos(longitudeRadians),
  )
}

function appendSurfaceSegment(
  output: number[],
  startPosition: Position,
  endPosition: Position,
  radius: number,
) {
  const startNormal = latLngToVector3(startPosition, 1).normalize()
  const endNormal = latLngToVector3(endPosition, 1).normalize()
  const angle = startNormal.angleTo(endNormal)
  const maxSegmentAngle = THREE.MathUtils.degToRad(1)
  const segmentCount = Math.max(1, Math.ceil(angle / maxSegmentAngle))
  let previous = startNormal.clone().multiplyScalar(radius)

  for (let segmentIndex = 1; segmentIndex <= segmentCount; segmentIndex += 1) {
    const progress = segmentIndex / segmentCount
    const current = startNormal
      .clone()
      .lerp(endNormal, progress)
      .normalize()
      .multiplyScalar(radius)
    output.push(previous.x, previous.y, previous.z, current.x, current.y, current.z)
    previous = current
  }
}

function createBoundaryLine(
  collection: GeoJsonFeatureCollection,
  source: GlobeBoundarySource,
) {
  const radius = source.radius ?? 1.512
  const positions: number[] = []

  collection.features
    .flatMap(feature => positionLines(feature.geometry))
    .filter(line => line.length >= 2)
    .forEach((line) => {
      for (let index = 1; index < line.length; index += 1) {
        appendSurfaceSegment(positions, line[index - 1], line[index], radius)
      }
    })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({
    color: source.color,
    transparent: true,
    opacity: source.opacity,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  })
  const line = new THREE.LineSegments(geometry, material)
  line.name = `geo-boundary:${source.id}`
  line.renderOrder = 4
  return line
}

function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<GeoJsonFeatureCollection>
  return candidate.type === 'FeatureCollection' && Array.isArray(candidate.features)
}

export async function createGeoJsonBoundaryGroup(
  sources: GlobeBoundarySource[],
  signal?: AbortSignal,
) {
  const group = new THREE.Group()
  group.name = 'geojson-boundaries'

  for (const source of sources) {
    validateSource(source)
    const response = await fetch(source.assetUrl, { signal })
    if (!response.ok) {
      throw new Error(`地图边界 ${source.id} 加载失败：${response.status}`)
    }
    const geoJson: unknown = await response.json()
    if (!isFeatureCollection(geoJson)) {
      throw new Error(`地图边界 ${source.id} 不是有效的 FeatureCollection`)
    }
    group.add(createBoundaryLine(geoJson, source))
  }

  return group
}
