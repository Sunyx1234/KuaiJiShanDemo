import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const load = async path => import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')}`)
const { fluctuateReading } = await load('../src/utils/equipmentTelemetry.ts')
const { getEquipmentReadings } = await load('../src/data/equipmentReadings.ts')
const registry = await load('../src/data/processEquipment.ts')
const devices = [...registry.steamerDevices, ...registry.bottlingDevices, ...registry.fermentationDevices, ...registry.pressDevices]
let checked = 0
assert.equal(devices.length, 41)
for (const device of devices) {
  const metrics = getEquipmentReadings(device.id)
  assert.equal(metrics.length, 3, device.id)
  for (const metric of metrics) {
    let previous = metric.baseline
    for (let index = 0; index <= 1000; index++) {
      const value = fluctuateReading(metric.baseline, metric.precision, () => index / 1000)
      assert.ok(Number.isFinite(value))
      assert.ok(value >= metric.baseline * .995 - 1e-9 && value <= metric.baseline * 1.005 + 1e-9, `${device.id}/${metric.id}: ${value}`)
      assert.ok(Math.abs(value * 10 ** metric.precision - Math.round(value * 10 ** metric.precision)) < 1e-6)
      previous = value
      checked++
    }
    if (!metric.baseline) assert.equal(previous, 0)
  }
}
console.log(`PASS: ${devices.length} devices, 123 metrics, ${checked} boundary/precision samples; zero and integer readings remain valid.`)

// Exercise the actual Pinia store with a controlled interval clock.
const { createPinia, setActivePinia } = await import('pinia')
const sourceUrls = {}
for (const [specifier, path] of Object.entries({ '../data/processEquipment': '../src/data/processEquipment.ts', '../data/equipmentReadings': '../src/data/equipmentReadings.ts', '../utils/equipmentTelemetry': '../src/utils/equipmentTelemetry.ts' })) {
  const output = ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  sourceUrls[specifier] = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`
}
sourceUrls.vue = import.meta.resolve('vue')
sourceUrls.pinia = import.meta.resolve('pinia')
let storeSource = ts.transpileModule(await readFile(new URL('../src/stores/equipmentReadings.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
for (const [specifier, url] of Object.entries(sourceUrls)) storeSource = storeSource.replaceAll(`'${specifier}'`, `'${url}'`)
const originalInterval = globalThis.setInterval, originalClear = globalThis.clearInterval
const timers = new Map()
let sequence = 0
try {
  globalThis.setInterval = (callback, delay) => { assert.equal(delay, 5000); timers.set(++sequence, callback); return sequence }
  globalThis.clearInterval = id => timers.delete(id)
  const { useEquipmentReadingsStore } = await import(`data:text/javascript;base64,${Buffer.from(storeSource).toString('base64')}`)
  setActivePinia(createPinia())
  const store = useEquipmentReadingsStore()
  store.start(); store.start()
  assert.equal(timers.size, 1, 'viewers must share one interval')
  const before = store.sampleTimes.length
  for (let tick = 0; tick < 50; tick++) timers.values().next().value()
  assert.equal(store.sampleTimes.length, before)
  for (const [id, metrics] of Object.entries(store.profiles)) for (const metric of metrics) {
    const samples = store.history[id][metric.id]
    assert.equal(samples.length, 361)
    if (metric.updateMode === 'fixed') assert.ok(samples.every(value => value === metric.baseline), `${id}/${metric.label} must remain fixed in readings and history`)
    const last = samples.at(-1)
    assert.ok(last >= metric.baseline * .995 - 1e-9 && last <= metric.baseline * 1.005 + 1e-9)
  }
  store.stop(); assert.equal(timers.size, 1)
  store.stop(); assert.equal(timers.size, 0, 'last viewer must release the interval')
  store.start(); assert.equal(timers.size, 1)
  store.stop(); assert.equal(timers.size, 0)
  console.log('PASS: 50 refresh cycles; fixed levels/counts/speeds/durations never change or decrease; fluctuating readings stay bounded; timer lifecycle verified.')
} finally {
  globalThis.setInterval = originalInterval; globalThis.clearInterval = originalClear
}
