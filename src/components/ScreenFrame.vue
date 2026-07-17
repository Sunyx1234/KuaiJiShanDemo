<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const scale = ref(1)
const left = ref(0)
const top = ref(0)

function resize() {
  scale.value = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
  left.value = (window.innerWidth - 1920 * scale.value) / 2
  top.value = (window.innerHeight - 1080 * scale.value) / 2
}
onMounted(() => { resize(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => window.removeEventListener('resize', resize))
</script>

<template>
  <div class="screen-shell">
    <div class="screen" :style="{ transform: `translate(${left}px, ${top}px) scale(${scale})` }"><slot /></div>
  </div>
</template>
