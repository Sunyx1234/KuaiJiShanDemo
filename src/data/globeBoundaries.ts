import type { GlobeBoundarySource } from '../services/globeGeoJson'

const naturalEarthChinaPovPreview: GlobeBoundarySource = {
  id: 'natural-earth-admin0-china-pov-5.1.1',
  label: 'Natural Earth 国家边界（China POV）',
  scope: 'world',
  assetUrl: '/assets/geo/world-countries-china-pov.geojson',
  provenanceUrl: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/',
  authorizedForProduction: false,
  developmentOnly: true,
  color: 0x39aee8,
  opacity: 0.54,
  radius: 1.522,
}

/**
 * 地图边界资源注册表。
 *
 * Natural Earth 图层只用于本地开发预览，因此生产构建不会注册该资源。
 * 正式对外环境取得带审图号的标准地图成果后，再增加 production source。
 */
export const globeBoundarySources: GlobeBoundarySource[] = import.meta.env.DEV
  ? [naturalEarthChinaPovPreview]
  : []
