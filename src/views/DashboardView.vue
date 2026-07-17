<script setup lang="ts">
import ScreenFrame from '../components/ScreenFrame.vue'
import TopHeader from '../components/TopHeader.vue'
import MetricStrip from '../components/MetricStrip.vue'
import LeftMonitor from '../components/LeftMonitor.vue'
import CenterScene from '../components/CenterScene.vue'
import RightOperations from '../components/RightOperations.vue'
import BottomDock from '../components/BottomDock.vue'
</script>

<template>
  <ScreenFrame>
    <main class="dashboard">
      <TopHeader />
      <div class="dashboard-grid">
        <LeftMonitor />
        <section class="center-column">
          <MetricStrip />
          <CenterScene />
          <BottomDock />
        </section>
        <RightOperations />
      </div>
      <div class="footer-glow" />
    </main>
  </ScreenFrame>
</template>
