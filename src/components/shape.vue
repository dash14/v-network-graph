<template>
  <circle
    v-if="config.type === 'circle'"
    :cx="x"
    :cy="y"
    :r="radius"
    :fill="config.color"
    :stroke="strokeColor"
    :stroke-width="strokeWidth"
  />
  <rect
    v-else
    :x="x"
    :y="y"
    :width="width"
    :height="height"
    :rx="borderRadius"
    :ry="borderRadius"
    :fill="config.color"
    :stroke="strokeColor"
    :stroke-width="strokeWidth"
  />
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watchEffect } from "vue"
import { ShapeStyle } from "../common/styles"
import { useZoomLevel } from "../composables/zoom"

export default defineComponent({
  props: {
    baseX: {
      type: Number,
      default: 0,
    },
    baseY: {
      type: Number,
      default: 0,
    },
    config: {
      type: Object as PropType<ShapeStyle>,
      required: true,
    },
  },
  setup(props) {
    const { scale } = useZoomLevel()

    const x = ref(props.baseX)
    const y = ref(props.baseY)
    const strokeWidth = ref(0)
    const strokeColor = ref("#000000")
    const radius = ref(0)
    const width = ref(0)
    const height = ref(0)
    const borderRadius = ref(0)

    watchEffect(() => {
      const s = scale.value
      strokeWidth.value = (props.config.stroke?.width ?? 0) / s
      strokeColor.value = props.config.stroke?.color ?? "none"

      if (props.config.type === "circle") {
        x.value = props.baseX
        y.value = props.baseY
        radius.value = props.config.radius / s
      } else {
        width.value = props.config.width / s
        height.value = props.config.height / s
        borderRadius.value = props.config.borderRadius / s
        x.value = props.baseX - width.value / 2
        y.value = props.baseY - height.value / 2
      }
    })

    return {
      x,
      y,
      strokeWidth,
      strokeColor,
      radius,
      width,
      height,
      borderRadius,
    }
  },
})
</script>
