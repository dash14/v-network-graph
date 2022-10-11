<script setup lang="ts">
import { computed, ref, watchEffect } from "vue"
import { Position } from "@/common/types"
import { NodeLabelDirection } from "@/common/configs"
import { NodeState } from "@/models/node"
import { useNodeConfig } from "@/composables/config"
import { useMouseOperation } from "@/composables/mouse"
import { useZoomLevel } from "@/composables/zoom"
import VShape from "@/components/base/VShape.vue"
import VText from "@/components/base/VLabelText.vue"

interface Props {
  id: string
  state: NodeState
  pos?: Position
}

const props = withDefaults(defineProps<Props>(), {
  pos: undefined
})

const x = computed(() => props.pos?.x || 0)
const y = computed(() => props.pos?.y || 0)

const config = useNodeConfig()
const { scale } = useZoomLevel()

const {
  handleNodePointerDownEvent,
  handleNodePointerOverEvent,
  handleNodePointerOutEvent,
  handleNodeClickEvent,
  handleNodeDoubleClickEvent,
  handleNodeContextMenu,
} = useMouseOperation()

const labelVisibility = computed(() => {
  if (props.state.label.visible) {
    return props.state.labelText ?? false
  }
  return false
})

const labelMargin = computed(() => {
  if (props.state.label.direction === NodeLabelDirection.CENTER) {
    return 0
  } else {
    return props.state.label.margin * scale.value
  }
})

const labelShiftV = ref(0) // Amount of label shift (vertical)
const labelShiftH = ref(0) // Amount of label shift (horizontal)
const labelDiagonalShiftV = ref(0) // Amount of shift in diagonal direction (vertical)
const labelDiagonalShiftH = ref(0) // Amount of shift in diagonal direction (horizontal)

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
      return "text-top"
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

</script>

<template>
  <g
    :class="{ 'v-node': true, hover: state.hovered, selected: state.selected }"
    :transform="`translate(${x} ${y})`"
    @pointerdown.stop="handleNodePointerDownEvent(id, $event)"
    @pointerenter.passive="handleNodePointerOverEvent(id, $event)"
    @pointerleave.passive="handleNodePointerOutEvent(id, $event)"
    @click.stop="handleNodeClickEvent(id, $event)"
    @dblclick.stop="handleNodeDoubleClickEvent(id, $event)"
    @contextmenu="handleNodeContextMenu(id, $event)"
  >
    <slot
      name="override-node"
      :node-id="id"
      :scale="scale"
      :config="state.shape"
      :class="{ draggable: state.draggable, selectable: state.selectable }"
    >
      <v-shape
        :config="state.shape"
        :class="{ draggable: state.draggable, selectable: state.selectable }"
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
      :shape="state.shape"
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

<style lang="scss" scoped>
$transition: 0.1s linear;

:where(.v-shape-circle) {
  pointer-events: none;
  transition: fill $transition, stroke $transition, stroke-width $transition,
  r $transition;
}
:where(.v-shape-rect) {
  pointer-events: none;
  transition: fill $transition, stroke $transition, stroke-width $transition,
    x $transition, y $transition, width $transition, height $transition;
}
.v-node {
  :deep(.draggable),
  :deep(.selectable) {
    pointer-events: all;
    cursor: pointer;
  }
  :deep(.v-text) {
    pointer-events: none;
    user-select: none;
    cursor: default;
  }
  :where(.v-text) {
    transition: x $transition, y $transition;
  }
}

</style>
