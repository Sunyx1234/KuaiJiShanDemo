import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  groupConnectivitySummary,
  groupNetworkSummary,
  groupPerformanceTrend,
  groupShowcaseTopics,
  parks,
} from '../data/group'

export const useGroupStore = defineStore('group', () => {
  const hoveredParkId = ref<string | null>(null)
  const selectedParkId = ref<string | null>(null)
  const focusRequest = ref<{ parkId: string; sequence: number } | null>(null)
  let focusSequence = 0

  const hoveredPark = computed(() => parks.find(park => park.id === hoveredParkId.value) ?? null)
  const selectedPark = computed(() => parks.find(park => park.id === selectedParkId.value) ?? null)
  const connectedParks = computed(() => parks.filter(park => park.status === 'connected'))

  function setHoveredPark(id: string | null) {
    hoveredParkId.value = id
  }

  function selectPark(id: string | null) {
    selectedParkId.value = id
  }

  function requestParkFocus(id: string) {
    selectedParkId.value = id
    hoveredParkId.value = id
    focusSequence += 1
    focusRequest.value = { parkId: id, sequence: focusSequence }
  }

  function getPark(id: string) {
    return parks.find(park => park.id === id) ?? null
  }

  return {
    parks,
    networkSummary: groupNetworkSummary,
    performanceTrend: groupPerformanceTrend,
    connectivitySummary: groupConnectivitySummary,
    showcaseTopics: groupShowcaseTopics,
    hoveredParkId,
    selectedParkId,
    focusRequest,
    hoveredPark,
    selectedPark,
    connectedParks,
    setHoveredPark,
    selectPark,
    requestParkFocus,
    getPark,
  }
})
