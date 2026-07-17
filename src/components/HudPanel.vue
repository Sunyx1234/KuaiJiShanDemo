<script setup lang="ts">
defineProps<{ title: string; compact?: boolean }>()
</script>

<template>
  <section class="hud-panel" :class="{ compact }">
    <header class="hud-panel__head">
      <span class="hud-panel__diamond" />
      <h2>{{ title }}</h2>
      <slot name="actions" />
    </header>
    <div class="hud-panel__body"><slot /></div>
  </section>
</template>
