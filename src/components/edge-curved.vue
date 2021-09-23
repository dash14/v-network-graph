<script setup lang="ts">
import { computed, PropType } from "vue"
import { StrokeStyle } from "../common/configs"
import { useZoomLevel } from "../composables/zoom"
import { applyScaleToDasharray, getDasharrayUnit } from "../common/utility"
import { EdgeState } from "../composables/state"
import chunk from "lodash-es/chunk"

const props = defineProps({
  state: {
    type: Object as PropType<EdgeState>,
    required: true,
  },
  config: {
    type: Object as PropType<StrokeStyle>,
    required: true,
  },
})

const { scale } = useZoomLevel()

const pathD = computed(() => {
  const p = props.state.position
  const points = [ ...props.state.curve?.control ?? [], { x: p.x2, y: p.y2 }]
  const d: string[] = []
  d.push(`M ${p.x1} ${p.y1}`)
  chunk(points, 2).forEach(([p1, p2]) => d.push(`Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`))
  return d.join(" ")
})

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

defineExpose({ strokeWidth, strokeDasharray, animationSpeed })
</script>

<template>
  <!-- <circle
    :cx="state.curve.circle.center.x"
    :cy="state.curve.circle.center.y"
    :r="state.curve.circle.radius"
    fill="#ff000080"
  />
  <circle
    v-for="cp in state.curve.control"
    :key="JSON.stringify(cp)"
    :cx="cp.x"
    :cy="cp.y"
    :r="2"
    fill="#0000ff"
  /> -->
  <path
    :class="{ 'v-line': true, animate: config.animate }"
    :d="pathD"
    fill="none"
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
