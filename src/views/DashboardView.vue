<script setup lang="ts">
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
import { onBeforeUnmount, onMounted } from 'vue'
import { useDashboardStore } from '../stores/dashboard'
import { configureSecurityVideoUrls } from '../services/securityVideoUrls'

const store = useDashboardStore()
void configureSecurityVideoUrls()
let workOrderPoller = 0
onMounted(() => {
  void store.loadWorkOrders()
  workOrderPoller = window.setInterval(() => void store.loadWorkOrders(), 3000)
})
onBeforeUnmount(() => window.clearInterval(workOrderPoller))
</script>

<template>
  <ScreenFrame>
    <main class="dashboard">
      <TopHeader />
      <div class="dashboard-grid" :class="{ 'security-mode': store.activeNav === 'security' }">
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
