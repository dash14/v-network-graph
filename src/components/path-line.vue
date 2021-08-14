<template>
  <path
    class="v-path-line"
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

<script lang="ts">
  import { computed, defineComponent, PropType } from "vue"
import { useZoomLevel } from "../composables/zoom"
import { PathStrokeStyle } from "../common/configs"
import { Position } from "../common/types"
import { applyScaleToDasharray } from "../common/utility"

export default defineComponent({
  props: {
    points: {
      type: Array as PropType<Position[]>,
      required: true,
    },
    config: {
      type: Object as PropType<PathStrokeStyle>,
      required: true,
    }
  },
  setup(props) {
    const { scale } = useZoomLevel()

    const d = computed(() => {
      return "M" + props.points.map(p => `${p.x} ${p.y}`).join(" L ")
    })

    const strokeDasharray = computed(() => {
      return applyScaleToDasharray(props.config.dasharray, scale.value)
    })

    const animationSpeed = computed(() => {
      const speed = props.config.animate ? props.config.animationSpeed * scale.value : false
      return speed ? `--animation-speed:${speed}` : undefined
    })

    return { d, scale, strokeDasharray, animationSpeed }
  },
})
</script>

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
