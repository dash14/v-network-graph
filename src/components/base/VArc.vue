<script setup lang="ts">
import { computed } from "vue"
import { Position } from "@/common/types";
import { StrokeStyle } from "@/common/configs"
import { useZoomLevel } from "@/composables/zoom"
import { applyScaleToDasharray, getDasharrayUnit } from "@/utils/visual"

const props = defineProps<{
  p1: Position
  p2: Position
  radius: number[]
  isLargeArc: boolean
  isClockwise: boolean
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

const pathD = computed(() => {
  const { p1, p2, radius, isLargeArc, isClockwise } = props
  const [rx, ry] = radius
  const f1 = isLargeArc ? 1 : 0
  const f2 = isClockwise ? 1 : 0
  return `M ${p1.x} ${p1.y} A ${rx} ${ry} 0 ${f1} ${f2} ${p2.x} ${p2.y}`
})

defineExpose({ strokeWidth, strokeDasharray, animationSpeed })
</script>

<template>
  <path
    :class="{ 'v-line': true, animate: config.animate }"
    :d="pathD"
    :stroke="config.color"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
    :stroke-linecap="config.linecap"
    :style="animationSpeed"
    fill="none"
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
