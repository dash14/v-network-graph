<template>
  <g :transform="`translate(${x} ${y})`">
    <circle
      cx="0"
      cy="0"
      :r="radius"
      :fill="style.color"
      @mousedown.prevent.stop="handleNodeMouseDownEvent(id, $event)"
    />
    <text
      :font-family="labelStyle.fontFamily"
      :font-size="fontSize"
      :text-anchor="textAnchor"
      :dominant-baseline="dominantBaseline"
      :x="labelX"
      :y="labelY"
    >{{ label }}</text>
  </g>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue"
import { Node, NodeLabelDirection, Position } from "../common/types"
import { useNodeLabelStyle, useNodeStyle } from "../composables/style"
import { useMouseOperation } from "../composables/mouse"

export default defineComponent({
  props: {
    id: {
      type: String,
      required: true,
    },
    node: {
      type: Object as PropType<Node>,
      required: true,
    },
    pos: {
      type: Object as PropType<Position>,
      required: false,
      default: undefined
    },
    zoom: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const x = computed(() => props.pos?.x || 0)
    const y = computed(() => props.pos?.y || 0)

    const style = useNodeStyle()
    const labelStyle = useNodeLabelStyle()

    // TODO: ユーザ定義関数による指定を可能にする
    const label = props.node.name ?? props.id

    const { handleNodeMouseDownEvent } = useMouseOperation()

    const radius = computed(() => {
      const z = style.resizeWithZooming ? 1 : props.zoom
      return style.width / 2 / z
    })

    // ラベル
    const fontSize = computed(() => {
      const z = style.resizeWithZooming ? 1 : props.zoom
      return labelStyle.fontSize / z
    })
    const labelMargin = computed(() => {
      const z = style.resizeWithZooming ? 1 : props.zoom
      return labelStyle.margin / z
    })
    const textAnchor = computed(() => {
      switch (labelStyle.direction) {
        case NodeLabelDirection.NORTH:
        case NodeLabelDirection.SOUTH:
          return "middle"
        case NodeLabelDirection.EAST:
        case NodeLabelDirection.NORTH_EAST:
        case NodeLabelDirection.SOUTH_EAST:
          return "start"
        case NodeLabelDirection.WEST:
        case NodeLabelDirection.NORTH_WEST:
        case NodeLabelDirection.SOUTH_WEST:
        default:
          return "end"
      }
    })
    const dominantBaseline = computed(() => {
      switch (labelStyle.direction) {
        case NodeLabelDirection.NORTH:
        case NodeLabelDirection.NORTH_EAST:
        case NodeLabelDirection.NORTH_WEST:
          return "auto"
        case NodeLabelDirection.SOUTH:
        case NodeLabelDirection.SOUTH_EAST:
        case NodeLabelDirection.SOUTH_WEST:
          return "hanging"
        case NodeLabelDirection.EAST:
        case NodeLabelDirection.WEST:
        default:
          return "central"
      }
    })
    const diagonalMargin = computed(() => {
      const m = radius.value + labelMargin.value
      return Math.sqrt(m ** 2 / 2)
    })
    const labelX = computed(() => {
      switch (labelStyle.direction) {
        case NodeLabelDirection.NORTH:
        case NodeLabelDirection.SOUTH:
          return 0
        case NodeLabelDirection.EAST:
          return radius.value + labelMargin.value
        case NodeLabelDirection.WEST:
          return -radius.value - labelMargin.value
        case NodeLabelDirection.NORTH_EAST:
        case NodeLabelDirection.SOUTH_EAST:
          return diagonalMargin.value
        case NodeLabelDirection.NORTH_WEST:
        case NodeLabelDirection.SOUTH_WEST:
        default:
          return -diagonalMargin.value
      }
    })
    const labelY = computed(() => {
      switch (labelStyle.direction) {
        case NodeLabelDirection.NORTH:
          return -radius.value - labelMargin.value
        case NodeLabelDirection.SOUTH:
          return radius.value + labelMargin.value
        case NodeLabelDirection.EAST:
        case NodeLabelDirection.WEST:
          return 0
        case NodeLabelDirection.NORTH_EAST:
        case NodeLabelDirection.NORTH_WEST:
          return -diagonalMargin.value
        case NodeLabelDirection.SOUTH_EAST:
        case NodeLabelDirection.SOUTH_WEST:
        default:
          return diagonalMargin.value
      }
    })

    return {
      x,
      y,
      style,
      labelStyle,
      label,
      handleNodeMouseDownEvent,
      radius,
      fontSize,
      textAnchor,
      dominantBaseline,
      labelX,
      labelY,
    }
  },
})
</script>

<style lang="scss" scoped>
circle {
  cursor: pointer;
}
.dragging circle {
  cursor: inherit;
}
text {
  pointer-events: none;
  cursor: default;
}
</style>
