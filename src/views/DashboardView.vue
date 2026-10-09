<script setup lang="ts">
import { computed, defineAsyncComponent, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenFrame from '../components/ScreenFrame.vue'
import TopHeader from '../components/TopHeader.vue'
import EnterpriseMetrics from '../components/EnterpriseMetrics.vue'
import EnterpriseBusinessAnalysis from '../components/EnterpriseBusinessAnalysis.vue'
import EnterpriseProductionSummary from '../components/EnterpriseProductionSummary.vue'
import EnterpriseActivity from '../components/EnterpriseActivity.vue'
import EnterpriseOrderList from '../components/EnterpriseOrderList.vue'
import MetricStrip from '../components/MetricStrip.vue'
import CenterScene from '../components/CenterScene.vue'
import FactoryPanel from '../components/FactoryPanel.vue'
import OrderDetailDialog from '../components/OrderDetailDialog.vue'
import FactoryDetailDock from '../components/FactoryDetailDock.vue'
import GroupTopHeader from '../components/GroupTopHeader.vue'
import GroupLeftOverview from '../components/GroupLeftOverview.vue'
import GroupRightOverview from '../components/GroupRightOverview.vue'
import { useDashboardStore } from '../stores/dashboard'
import { useGroupStore } from '../stores/group'

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
  ? `${activePark.value.shortName}数字孪生运营中心`
  : '会稽山数字孪生运营中心')

let mountedParkId: string | null = null

watch([isGroupLevel, () => route.params.parkId], ([groupLevel]) => {
  if (groupLevel) {
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
}, { immediate: true })
</script>

<template>
  <ScreenFrame>
    <main class="dashboard" :class="{ 'park-dashboard': !isGroupLevel, 'group-dashboard': isGroupLevel }">
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

      <div v-else :key="`park-${activePark?.id ?? 'unknown'}`"
        class="dashboard-grid" :class="{ 'enterprise-overview-grid': store.activeNav === 'overview' }">
        <EnterpriseBusinessAnalysis v-if="store.activeNav === 'overview'" />
        <FactoryPanel v-else side="left" />
        <section class="center-column">
          <EnterpriseMetrics v-if="store.activeNav === 'overview'" />
          <MetricStrip v-else />
          <CenterScene />
          <EnterpriseActivity v-if="store.activeNav === 'overview'" />
          <FactoryDetailDock v-else />
        </section>
        <EnterpriseProductionSummary v-if="store.activeNav === 'overview'" />
        <FactoryPanel v-else side="right" />
      </div>
      <EnterpriseOrderList />
      <OrderDetailDialog />
      <div class="footer-glow" />
    </main>
  </ScreenFrame>
</template>
