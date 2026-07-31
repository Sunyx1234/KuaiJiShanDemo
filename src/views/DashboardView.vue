<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import TopHeader from '../components/TopHeader.vue'
import MetricStrip from '../components/MetricStrip.vue'
import LeftMonitor from '../components/LeftMonitor.vue'
import CenterScene from '../components/CenterScene.vue'
import RightOperations from '../components/RightOperations.vue'
import BottomDock from '../components/BottomDock.vue'
import SecurityLeft from '../components/SecurityLeft.vue'
import SecurityRight from '../components/SecurityRight.vue'
import SecurityWorkflowDock from '../components/SecurityWorkflowDock.vue'
import VisitorLeft from '../components/VisitorLeft.vue'
import VisitorRight from '../components/VisitorRight.vue'
import VisitorTimelineDock from '../components/VisitorTimelineDock.vue'
import GroupTopHeader from '../components/GroupTopHeader.vue'
import GroupLeftOverview from '../components/GroupLeftOverview.vue'
import GroupRightOverview from '../components/GroupRightOverview.vue'
import { useDashboardStore } from '../stores/dashboard'
import { useGroupStore } from '../stores/group'
import { configureSecurityVideoUrls } from '../services/securityVideoUrls'

const route = useRoute()
const router = useRouter()
const GroupGlobeScene = defineAsyncComponent(() => import('../components/GroupGlobeScene.vue'))
const store = useDashboardStore()
const groupStore = useGroupStore()
const isGroupLevel = computed(() => route.name === 'group-dashboard')
const activePark = computed(() => {
  const parkId = typeof route.params.parkId === 'string' ? route.params.parkId : ''
  return parkId ? groupStore.getPark(parkId) : null
})
const parkHeaderTitle = computed(() => activePark.value
  ? `${activePark.value.shortName}综合态势运营中心`
  : '正泰集团厂区综合态势运营中心')

let workOrderPoller = 0
let mountedParkId: string | null = null

function stopParkServices() {
  window.clearInterval(workOrderPoller)
  workOrderPoller = 0
}

function startParkServices() {
  if (workOrderPoller) return
  void configureSecurityVideoUrls()
  void store.loadWorkOrders()
  workOrderPoller = window.setInterval(() => void store.loadWorkOrders(), 3000)
}

watch([isGroupLevel, () => route.params.parkId], ([groupLevel]) => {
  if (groupLevel) {
    stopParkServices()
    mountedParkId = null
    groupStore.selectPark(null)
    return
  }
  if (route.name === 'park-dashboard' && !activePark.value) {
    void router.replace('/')
    return
  }
  if (activePark.value) {
    if (mountedParkId !== activePark.value.id) {
      store.switchNavigation('overview')
      mountedParkId = activePark.value.id
    }
    groupStore.selectPark(activePark.value.id)
  }
  startParkServices()
}, { immediate: true })

onBeforeUnmount(stopParkServices)
</script>

<template>
  <ScreenFrame>
    <main class="dashboard">
      <GroupTopHeader v-if="isGroupLevel" />
      <TopHeader v-else :title="parkHeaderTitle" show-group-return />

      <div v-if="isGroupLevel" class="group-dashboard-grid">
        <section class="group-globe-stage">
          <Suspense>
            <GroupGlobeScene />
            <template #fallback>
              <div class="group-globe-loading"><i /><span>三维地球场景加载中</span></div>
            </template>
          </Suspense>
        </section>
        <GroupLeftOverview />
        <GroupRightOverview />
      </div>

      <div v-else :key="`park-${activePark?.id ?? 'unknown'}-${store.activeNav}`"
        class="dashboard-grid" :class="{ 'security-mode': store.activeNav === 'security' }">
        <SecurityLeft v-if="store.activeNav === 'security'" />
        <VisitorLeft v-else-if="store.activeNav === 'people'" />
        <LeftMonitor v-else />
        <section class="center-column" :class="{ 'security-center': store.activeNav === 'security' }">
          <MetricStrip />
          <CenterScene />
          <SecurityWorkflowDock v-if="store.activeNav === 'security'" />
          <VisitorTimelineDock v-else-if="store.activeNav === 'people'" />
          <BottomDock v-else />
        </section>
        <SecurityRight v-if="store.activeNav === 'security'" />
        <VisitorRight v-else-if="store.activeNav === 'people'" />
        <RightOperations v-else />
      </div>
      <div class="footer-glow" />
    </main>
  </ScreenFrame>
</template>
