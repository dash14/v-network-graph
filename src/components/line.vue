<template>
  <path
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
      if (scale.value === 1) {
        return props.config.dasharray
      } else {
        return props.config.dasharray
          ?.split(/\s+/)
          .map(v => parseInt(v) / scale.value)
          .join(" ")
      }
    })

    return { strokeWidth, strokeDasharray }
  },
})
</script>
