import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { factoryThemes, type FactoryTheme } from '../data/factory'
import { processRegions } from '../data/processRegions'
import { useDashboardStore } from './dashboard'
export const useFactoryStore = defineStore('factory', () => {
  const dashboard = useDashboardStore()
  const selectedIndex = ref(0)
  const selectedProcessIndex = ref(2)
  const theme = computed<FactoryTheme>(() => dashboard.activeNav in factoryThemes ? dashboard.activeNav as FactoryTheme : 'overview')
  const config = computed(() => factoryThemes[theme.value])
  const selected = computed(() => config.value.records[selectedIndex.value] ?? config.value.records[0]!)
  const processRegion = computed(() => processRegions[selectedProcessIndex.value]!)
  function select(index: number) {
    if (!config.value.records[index]) return
    selectedIndex.value = index
    if (theme.value === 'production') selectedProcessIndex.value = selected.value.progress
  }
  function selectProcess(index: number) { if (processRegions[index]) selectedProcessIndex.value = index }
  function openTheme(next: FactoryTheme) {
    const batch = selected.value.batch
    const index = factoryThemes[next].records.findIndex(record => record.batch === batch)
    selectedIndex.value = index >= 0 ? index : 0
    dashboard.switchNavigation(next)
  }
  watch(theme, next => {
    if (selectedIndex.value >= config.value.records.length) selectedIndex.value = 0
    if (next === 'production') selectedProcessIndex.value = selected.value.progress
  })
  return { theme, config, selected, selectedIndex, selectedProcessIndex, processRegion, select, selectProcess, openTheme }
})
