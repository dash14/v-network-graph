<script setup lang="ts">
import { computed } from "vue"
import { Position } from "@/common/types";
import { StrokeStyle } from "@/common/configs"
import { useZoomLevel } from "@/composables/zoom"
import { applyScaleToDasharray, getDasharrayUnit } from "@/utils/visual"

const props = defineProps<{
  p1: Position
  p2: Position
  config: StrokeStyle
}>()

const { scale } = useZoomLevel()

const strokeWidth = computed(() => {
  return props.config.width * scale.value
})

const strokeDasharray = computed(() => {
  return applyScaleToDasharray(props.config.dasharray, scale.value)
})

const animationSpeed = computed(() => {
  const speed = props.config.animate
    ? getDasharrayUnit(props.config.dasharray) * props.config.animationSpeed * scale.value
    : false
  return speed ? `--animation-speed:${speed}` : undefined
})

</script>

<template>
  <path
    :class="{ 'v-line': true, animate: config.animate }"
    :d="`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`"
    :stroke="config.color"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
    :stroke-linecap="config.linecap"
    :style="animationSpeed"
  />
</template>

<style scoped>
.v-line.animate {
  --animation-speed: 100;
  animation: dash 10s linear infinite;
  stroke-dashoffset: var(--animation-speed);
}
@keyframes dash {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
