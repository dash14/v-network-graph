<script setup lang="ts">
import { computed, PropType } from "vue"
import { Position } from "@/common/types";
import { StrokeStyle } from "@/common/configs"
import { useZoomLevel } from "@/composables/zoom"
import { applyScaleToDasharray, getDasharrayUnit } from "@/utils/visual"

const props = defineProps({
  p1: {
    type: Object as PropType<Position>,
    required: true,
  },
  p2: {
    type: Object as PropType<Position>,
    required: true,
  },
  radius: {
    type: Array as PropType<number[]>,
    required: true,
  },
  isLargeArc: {
    type: Boolean,
    required: true,
  },
  isClockwise: {
    type: Boolean,
    required: true,
  },
  config: {
    type: Object as PropType<StrokeStyle>,
    required: true,
  },
})

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
