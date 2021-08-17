<script setup lang="ts">
import { computed, PropType } from "vue"
import { useZoomLevel } from "../composables/zoom"
import { usePathConfig } from "../composables/config"
import { Config } from "../common/configs"
import { Path, PositionOrCurve } from "../common/types"
import { applyScaleToDasharray } from "../common/utility"

const props = defineProps({
  points: {
    type: Array as PropType<PositionOrCurve[]>,
    required: true,
  },
  path: {
    type: Object as PropType<Path>,
    required: true,
  }
})

const { scale } = useZoomLevel()
const pathConfig = usePathConfig()

const d = computed(() => {
  let move = true
  return props.points.map(p => {
    if (p === null) {
      move = true
    } else if (p instanceof Array) {
      return `C ${p[0].x} ${p[0].y}, ${p[1].x} ${p[1].y}, ${p[2].x} ${p[2].y}`
    } else {
      const m = move
      move = false
      return `${m ? "M " : "L "}${p.x} ${p.y}`
    }
  }).join(" ")
})

const config = computed(() => {
  return Config.values(pathConfig.path, props.path)
})

const strokeDasharray = computed(() => {
  return applyScaleToDasharray(config.value.dasharray, scale.value)
})

const animationSpeed = computed(() => {
  const speed = config.value.animate ? config.value.animationSpeed * scale.value : false
  return speed ? `--animation-speed:${speed}` : undefined
})

defineExpose({ d, scale, config, strokeDasharray, animationSpeed })
</script>

<template>
  <path
    :class="{ 'v-path-line': true, animate: config.animate }"
    :d="d"
    fill="none"
    :stroke="config.color"
    :stroke-width="config.width * scale"
    :stroke-dasharray="strokeDasharray"
    :stroke-linecap="config.linecap"
    :stroke-linejoin="config.linejoin"
    :style="animationSpeed"
  />
</template>

<style scoped>
.v-path-line.animate {
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
