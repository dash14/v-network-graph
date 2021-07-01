<template>
  <circle
    class="nt-node-selection"
    :cx="x"
    :cy="y"
    :r="radius"
    :stroke="selectionStyle.color"
    :stroke-width="strokeWidth"
    fill="none"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue"
import { Position } from "@/common/types"
import { useNodeStyle, useNodeSelectionStyle, useViewStyle } from "@/composables/style"

export default defineComponent({
  props: {
    pos: {
      type: Object as PropType<Position>,
      required: false,
      default: undefined,
    },
    zoom: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const x = computed(() => props.pos?.x || 0)
    const y = computed(() => props.pos?.y || 0)

    const nodeStyle = useNodeStyle()
    const viewStyle = useViewStyle()
    const selectionStyle = useNodeSelectionStyle()
    const radius = computed(() => {
      const z = viewStyle.resizeWithZooming ? 1 : props.zoom
      return (nodeStyle.width / 2 + selectionStyle.padding + selectionStyle.width / 2) / z
    })
    const strokeWidth = computed(() => {
      const z = viewStyle.resizeWithZooming ? 1 : props.zoom
      return selectionStyle.width / z
    })

    return { x, y, selectionStyle, radius, strokeWidth }
  },
})
</script>

<style lang="scss" scoped>
.nt-node-selection {
  pointer-events: none;
}
</style>
