import type { GlobeBoundarySource } from '../services/globeGeoJson'

const naturalEarthChinaPovDemo: GlobeBoundarySource = {
  id: 'natural-earth-admin0-china-pov-5.1.1',
  label: 'Natural Earth 国家边界（China POV）',
  scope: 'world',
  assetUrl: '/assets/geo/world-countries-china-pov.geojson',
  provenanceUrl: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/',
  authorizedForProduction: false,
  demoOnly: true,
  color: 0x39aee8,
  opacity: 0.54,
  radius: 1.505,
}

/**
 * 地图边界资源注册表。
 *
 * 当前云端演示需要显示国境线，因此开发与生产构建都会注册演示图层。
 * 该资源仍未标记为正式生产授权；正式对外发布前应替换为带审图号的标准地图成果。
 */
export const globeBoundarySources: GlobeBoundarySource[] = [naturalEarthChinaPovDemo]
