<script setup lang="ts">
import { computed, PropType } from "vue"
import { StrokeStyle } from "../common/configs"
import { useZoomLevel } from "../composables/zoom"
import { applyScaleToDasharray, getDasharrayUnit } from "../common/utility"

const props = defineProps({
  x1: {
    type: Number,
    required: true,
  },
  y1: {
    type: Number,
    required: true,
  },
  x2: {
    type: Number,
    required: true,
  },
  y2: {
    type: Number,
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

defineExpose({ strokeWidth, strokeDasharray, animationSpeed })
</script>

<template>
  <path
    :class="{ 'v-line': true, animate: config.animate }"
    :d="`M ${x1} ${y1} L ${x2} ${y2}`"
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
