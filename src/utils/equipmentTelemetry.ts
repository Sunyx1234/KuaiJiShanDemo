/** Sample around the immutable baseline, never around the previous reading. */
export function fluctuateReading(baseline: number, precision: number, random = Math.random): number {
  const scale = 10 ** precision
  const minimum = Math.ceil(baseline * .995 * scale - 1e-8)
  const maximum = Math.floor(baseline * 1.005 * scale + 1e-8)
  const sample = Math.round(baseline * (1 + (random() * 2 - 1) * .005) * scale)
  return Math.min(maximum, Math.max(minimum, sample)) / scale
}
