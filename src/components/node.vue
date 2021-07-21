<template>
  <g :transform="`translate(${x} ${y})`">
    <v-shape
      :styles="hover ? style.hover : style.shape"
      :class="{ draggable: style.draggable, selectable: style.selectable }"
      @pointerdown.prevent.stop="handleNodePointerDownEvent(id, $event)"
      @pointerover="hover = true"
      @pointerout="hover = false"
    />
    <v-text
      :text="label"
      :x="labelX"
      :y="labelY"
      :styles="style.label"
      :text-anchor="textAnchor"
      :dominant-baseline="dominantBaseline"
    />
  </g>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, watchEffect } from "vue"
import { Node, Position } from "../common/types"
import { NodeLabelDirection } from "../common/styles"
import { useZoomLevel } from "../composables/zoom"
import { useNodeStyle } from "../composables/style"
import { useMouseOperation } from "../composables/mouse"
import VShape from "../components/shape.vue"
import VText from "../components/text.vue"

export default defineComponent({
  components: { VShape, VText },
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
      default: undefined,
    },
  },
  setup(props) {
    const x = computed(() => props.pos?.x || 0)
    const y = computed(() => props.pos?.y || 0)
    const hover = ref(false)

    const style = useNodeStyle()
    const { scale } = useZoomLevel()

    // TODO: ユーザ定義関数による指定を可能にする
    const label = props.node.name ?? props.id

    const { handleNodePointerDownEvent } = useMouseOperation()

    // ラベル
    const labelMargin = computed(() => {
      return style.label.margin / scale.value
    })

    // 円の場合のラベル位置計算用
    const labelShiftV = ref(0) // ラベルのシフト量(縦)
    const labelShiftH = ref(0) // ラベルのシフト量(横)
    const labelDiagonalShiftV = ref(0) // 斜め方向のシフト量(縦)
    const labelDiagonalShiftH = ref(0) // 斜め方向のシフト量(横)

    watchEffect(() => {
      const s = scale.value
      if (style.shape.type == "circle") {
        const radius = style.shape.radius / s
        const m = radius + labelMargin.value
        const diagonalMargin = Math.sqrt(m ** 2 / 2)
        labelShiftV.value = radius + labelMargin.value
        labelShiftH.value = radius + labelMargin.value
        labelDiagonalShiftV.value = diagonalMargin
        labelDiagonalShiftH.value = diagonalMargin
      } else {
        const borderRadius = style.shape.borderRadius / s
        const width = style.shape.width / s
        const height = style.shape.height / s
        const m = borderRadius + labelMargin.value
        const diagonalMargin = Math.sqrt(m ** 2 / 2)
        labelShiftV.value = height / 2 + labelMargin.value
        labelShiftH.value = width / 2 + labelMargin.value
        labelDiagonalShiftV.value = height / 2 - borderRadius + diagonalMargin
        labelDiagonalShiftH.value = width / 2 - borderRadius + diagonalMargin
      }
    })

    const textAnchor = computed(() => {
      switch (style.label.direction) {
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
      switch (style.label.direction) {
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
    const labelX = computed(() => {
      switch (style.label.direction) {
        case NodeLabelDirection.NORTH:
        case NodeLabelDirection.SOUTH:
          return 0
        case NodeLabelDirection.EAST:
          return labelShiftH.value
        case NodeLabelDirection.WEST:
          return -labelShiftH.value
        case NodeLabelDirection.NORTH_EAST:
        case NodeLabelDirection.SOUTH_EAST:
          return labelDiagonalShiftH.value
        case NodeLabelDirection.NORTH_WEST:
        case NodeLabelDirection.SOUTH_WEST:
        default:
          return -labelDiagonalShiftH.value
      }
    })
    const labelY = computed(() => {
      switch (style.label.direction) {
        case NodeLabelDirection.NORTH:
          return -labelShiftV.value
        case NodeLabelDirection.SOUTH:
          return labelShiftV.value
        case NodeLabelDirection.EAST:
        case NodeLabelDirection.WEST:
          return 0
        case NodeLabelDirection.NORTH_EAST:
        case NodeLabelDirection.NORTH_WEST:
          return -labelDiagonalShiftV.value
        case NodeLabelDirection.SOUTH_EAST:
        case NodeLabelDirection.SOUTH_WEST:
        default:
          return labelDiagonalShiftV.value
      }
    })

    return {
      x,
      y,
      hover,
      style,
      label,
      handleNodePointerDownEvent,
      textAnchor,
      dominantBaseline,
      labelX,
      labelY,
    }
  },
})
</script>

<style lang="scss" scoped>
$transition: 0.2s linear;

circle,
rect {
  pointer-events: none;
  transition: fill $transition, stroke $transition, stroke-width $transition;
}
.draggable,
.selectable {
  pointer-events: all;
}
.selectable {
  cursor: pointer;
}
.dragging circle,
.dragging rect {
  cursor: inherit;
}
text {
  pointer-events: none;
  user-select: none;
  cursor: default;
}
</style>
