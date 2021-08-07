<template>
  <path
    class="v-line"
    :d="`M ${x1} ${y1} L ${x2} ${y2}`"
    :stroke="config.color"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
    :stroke-linecap="config.linecap"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue"
import { StrokeStyle } from "../common/configs"
import { useZoomLevel } from "../composables/zoom"

export default defineComponent({
  props: {
    x1: {
      type: Number,
      required: true
    },
    y1: {
      type: Number,
      required: true
    },
    x2: {
      type: Number,
      required: true
    },
    y2: {
      type: Number,
      required: true
    },
    config: {
      type: Object as PropType<StrokeStyle>,
      required: true,
    },
  },
  setup(props) {
    const { scale } = useZoomLevel()

    const strokeWidth = computed(() => {
      return props.config.width / scale.value
    })

    const strokeDasharray = computed(() => {
      const s = scale.value
      const dasharray = props.config.dasharray
      if (
        s === 1 ||
        dasharray === undefined ||
        dasharray === "none"
      ) {
        return dasharray ?? 0
      } else if (typeof dasharray === "string") {
        return dasharray
          .split(/\s+/)
          .map(v => parseInt(v) / s)
          .join(" ")
      } else {
        return dasharray / scale.value
      }
    })

    return { strokeWidth, strokeDasharray }
  },
})
</script>
