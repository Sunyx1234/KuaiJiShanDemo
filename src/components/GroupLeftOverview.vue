<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGroupStore } from '../stores/group'
import type { ParkConfig } from '../data/types'

const store = useGroupStore()
const router = useRouter()

function openPark(park: ParkConfig) {
  store.requestParkFocus(park.id)
  if (park.status === 'connected') void router.push(`/park/${park.id}`)
}
</script>

<template>
  <aside class="group-showcase-column group-left-overview">
    <section class="group-showcase-panel group-network-panel">
      <header class="group-showcase-heading">
        <div>
          <span>GLOBAL MANUFACTURING NETWORK</span>
          <h2>全球制造网络</h2>
        </div>
        <i />
      </header>

      <p class="group-network-intro">以全球制造基地为节点，持续构建协同、绿色、数字化的产业网络。</p>

      <div class="group-network-stats">
        <article v-for="item in store.networkSummary" :key="item.label">
          <strong>{{ item.value }}<small>{{ item.unit }}</small></strong>
          <span>{{ item.label }}</span>
        </article>
      </div>

      <div class="group-directory-heading">
        <span>重点制造基地</span>
        <small>{{ store.parks.length }} 个展示节点</small>
      </div>

      <nav class="group-park-directory" aria-label="全球制造基地列表">
        <button v-for="(park, index) in store.parks" :key="park.id"
          :class="{ selected: store.selectedParkId === park.id, connected: park.status === 'connected' }"
          :aria-label="park.status === 'connected' ? `进入${park.name}` : `在地球上查看${park.name}`"
          @mouseenter="store.setHoveredPark(park.id)" @mouseleave="store.setHoveredPark(null)"
          @focus="store.setHoveredPark(park.id)" @blur="store.setHoveredPark(null)"
          @click="openPark(park)">
          <b>{{ String(index + 1).padStart(2, '0') }}</b>
          <span>
            <strong>{{ park.shortName }}</strong>
            <small>{{ park.city }}</small>
          </span>
          <em>{{ park.status === 'connected' ? '进入园区' : '聚焦查看' }}</em>
        </button>
      </nav>
    </section>
  </aside>
</template>
