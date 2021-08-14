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
import { usePathConfig } from "../composables/style"
import { Config } from "../common/configs"
import { Path, Position } from "../common/types"
import { applyScaleToDasharray } from "../common/utility"

export default defineComponent({
  props: {
    points: {
      type: Array as PropType<Position[]>,
      required: true,
    },
    path: {
      type: Object as PropType<Path>,
      required: true,
    }
  },
  setup(props) {
    const { scale } = useZoomLevel()
    const pathConfig = usePathConfig()

    const d = computed(() => {
      return "M" + props.points.map(p => `${p.x} ${p.y}`).join(" L ")
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

    return { d, scale, config, strokeDasharray, animationSpeed }
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
