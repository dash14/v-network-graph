<template>
  <g
    :transform="`translate(${x} ${y})`"
    @pointerdown.prevent.stop="handleNodePointerDownEvent(id, $event)"
    @pointerenter.capture="handleNodePointerOverEvent(id, $event)"
    @pointerleave.capture="handleNodePointerOutEvent(id, $event)"
  >
    <slot
      name="override-node"
      :node-id="id"
      :scale="scale"
      :config="state.shape"
      :class="{ draggable: config.draggable, selectable: config.selectable }"
    >
      <v-shape
        :config="state.shape"
        :class="{ draggable: config.draggable, selectable: config.selectable }"
      />
    </slot>
    <slot
      v-if="labelVisibility"
      name="override-node-label"
      :node-id="id"
      :scale="scale"
      :text="state.labelText"
      :x="labelX"
      :y="labelY"
      :config="state.label"
      :text-anchor="textAnchor"
      :dominant-baseline="dominantBaseline"
    >
      <v-text
        :text="state.labelText"
        :x="labelX"
        :y="labelY"
        :config="state.label"
        :text-anchor="textAnchor"
        :dominant-baseline="dominantBaseline"
      />
    </slot>
  </g>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, watchEffect } from "vue"
import { Position } from "../common/types"
import { NodeState } from "../composables/state"
import { NodeLabelDirection } from "../common/configs"
import { useZoomLevel } from "../composables/zoom"
import { useNodeConfig } from "../composables/config"
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
    state: {
      type: Object as PropType<NodeState>,
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

    const config = useNodeConfig()
    const { scale } = useZoomLevel()

    const {
      handleNodePointerDownEvent,
      handleNodePointerOverEvent,
      handleNodePointerOutEvent,
      hoveredNodes,
    } = useMouseOperation()

    // for suppress reactive events
    const isHovered = ref(false)
    watchEffect(() => {
      const hovered = hoveredNodes.has(props.id)
      if (isHovered.value != hovered) {
        isHovered.value = hovered
      }
    })

    const labelVisibility = computed(() => {
      if (props.state.label.visible) {
        return props.state.labelText ?? false
      }
      return false
    })

    // ラベル
    const labelMargin = computed(() => {
      if (props.state.label.direction === NodeLabelDirection.CENTER) {
        return 0
      } else {
        return props.state.label.margin * scale.value
      }
    })

    // 円の場合のラベル位置計算用
    const labelShiftV = ref(0) // ラベルのシフト量(縦)
    const labelShiftH = ref(0) // ラベルのシフト量(横)
    const labelDiagonalShiftV = ref(0) // 斜め方向のシフト量(縦)
    const labelDiagonalShiftH = ref(0) // 斜め方向のシフト量(横)

    watchEffect(() => {
      const s = scale.value
      const shape = props.state.shape
      if (shape.type == "circle") {
        const radius = shape.radius * s
        const m = radius + labelMargin.value
        const diagonalMargin = Math.sqrt(m ** 2 / 2)
        labelShiftV.value = radius + labelMargin.value
        labelShiftH.value = radius + labelMargin.value
        labelDiagonalShiftV.value = diagonalMargin
        labelDiagonalShiftH.value = diagonalMargin
      } else {
        const borderRadius = shape.borderRadius * s
        const width = shape.width * s
        const height = shape.height * s
        const m = borderRadius + labelMargin.value
        const diagonalMargin = Math.sqrt(m ** 2 / 2)
        labelShiftV.value = height / 2 + labelMargin.value
        labelShiftH.value = width / 2 + labelMargin.value
        labelDiagonalShiftV.value = height / 2 - borderRadius + diagonalMargin
        labelDiagonalShiftH.value = width / 2 - borderRadius + diagonalMargin
      }
    })

    const textAnchor = computed(() => {
      switch (props.state.label.direction) {
        case NodeLabelDirection.CENTER:
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
      switch (props.state.label.direction) {
        case NodeLabelDirection.NORTH:
        case NodeLabelDirection.NORTH_EAST:
        case NodeLabelDirection.NORTH_WEST:
          return "auto"
        case NodeLabelDirection.SOUTH:
        case NodeLabelDirection.SOUTH_EAST:
        case NodeLabelDirection.SOUTH_WEST:
          return "hanging"
        case NodeLabelDirection.CENTER:
        case NodeLabelDirection.EAST:
        case NodeLabelDirection.WEST:
        default:
          return "central"
      }
    })
    const labelX = computed(() => {
      switch (props.state.label.direction) {
        case NodeLabelDirection.CENTER:
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
      switch (props.state.label.direction) {
        case NodeLabelDirection.NORTH:
          return -labelShiftV.value
        case NodeLabelDirection.SOUTH:
          return labelShiftV.value
        case NodeLabelDirection.CENTER:
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
      config,
      labelVisibility,
      handleNodePointerDownEvent,
      handleNodePointerOverEvent,
      handleNodePointerOutEvent,
      textAnchor,
      dominantBaseline,
      labelX,
      labelY,
      scale,
    }
  },
})
</script>

<style lang="scss" scoped>
$transition: 0.1s linear;

.v-shape-circle {
  pointer-events: none;
  transition: fill $transition, stroke $transition, stroke-width $transition,
  r $transition;
}
.v-shape-rect {
  pointer-events: none;
  transition: fill $transition, stroke $transition, stroke-width $transition,
    x $transition, y $transition, width $transition, height $transition;
}
.draggable,
.selectable {
  pointer-events: all;
  cursor: pointer;
}

.dragging circle,
.dragging rect {
  cursor: inherit;
}
.v-text {
  pointer-events: none;
  user-select: none;
  cursor: default;
  transition: x $transition, y $transition;
}
</style>
