<template>
  <path
    :d="`M ${x1} ${y1} L ${x2} ${y2}`"
    :stroke="styles.color"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
    :stroke-linecap="styles.linecap"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue"
import { StrokeStyle } from "../common/styles"
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
    styles: {
      type: Object as PropType<StrokeStyle>,
      required: true,
    },
  },
  setup(props) {
    const { scale } = useZoomLevel()

    const strokeWidth = computed(() => {
      return props.styles.width / scale.value
    })

    const strokeDasharray = computed(() => {
      if (scale.value === 1) {
        return props.styles.dasharray
      } else {
        return props.styles.dasharray
          ?.split(/\s+/)
          .map(v => parseInt(v) / scale.value)
          .join(" ")
      }
    })

    return { strokeWidth, strokeDasharray }
  },
})
</script>
