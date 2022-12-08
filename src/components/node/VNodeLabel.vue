<script setup lang="ts">
import { computed, ref, watchEffect } from "vue"
import { Position } from "@/common/types"
import { NodeLabelDirection } from "@/common/configs"
import { NodeState } from "@/models/node"
import { useMouseOperation } from "@/composables/mouse"
import { useZoomLevel } from "@/composables/zoom"
import { useNodeConfig } from "@/composables/config"
import { useStates } from "@/composables/state"
import { handleNodeLabelAutoAdjustment } from "@/modules/node/label"
import VText from "@/components/base/VLabelText.vue"

interface Props {
  id: string
  state: NodeState
  pos?: Position
}

const props = withDefaults(defineProps<Props>(), {
  pos: undefined,
})

const configs = useNodeConfig()
const { edgeStates } = useStates()
const { scale } = useZoomLevel()

const {
  handleNodePointerDownEvent,
  handleNodePointerOverEvent,
  handleNodePointerOutEvent,
  handleNodeClickEvent,
  handleNodeDoubleClickEvent,
  handleNodeContextMenu,
} = useMouseOperation()

const x = computed(() => props.pos?.x || 0)
const y = computed(() => props.pos?.y || 0)

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

const labelDirection = computed(() => {
  const direction = props.state.label.direction
  const autoAdjustment = props.state.label.directionAutoAdjustment
  if (autoAdjustment === false) {
    return direction
  }

  const pos = { x: x.value, y: y.value }
  if (autoAdjustment === true) {
    return handleNodeLabelAutoAdjustment(
      props.state.id,
      pos,
      props.state.oppositeNodes,
      (edgeId: string) => edgeStates[edgeId]?.loop?.center,
      direction
    )
  } else {
    return (
      autoAdjustment({
        nodeId: props.state.id,
        pos,
        oppositeNodes: props.state.oppositeNodes,
      }) ?? direction
    )
  }
})

const textAnchor = computed(() => {
  switch (labelDirection.value) {
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
  switch (labelDirection.value) {
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
  switch (labelDirection.value) {
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
  switch (labelDirection.value) {
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

const eventHandlers = computed(() => (id: string) => {
  if (configs.label.handleNodeEvents) {
    return {
      pointerdown: (e: PointerEvent) => {
        e.stopPropagation()
        handleNodePointerDownEvent(id, e)
      },
      pointerenter: (e: PointerEvent) => handleNodePointerOverEvent(id, e),
      pointerleave: (e: PointerEvent) => handleNodePointerOutEvent(id, e),
      click: (e: MouseEvent) => {
        e.stopPropagation()
        handleNodeClickEvent(id, e)
      },
      dblclick: (e: MouseEvent) => {
        e.stopPropagation()
        handleNodeDoubleClickEvent(id, e)
      },
      contextmenu: (e: MouseEvent) => {
        handleNodeContextMenu(id, e)
      },
    }
  } else {
    return {}
  }
})

const groupClasses = computed(() => {
  const handleEvents = configs.label.handleNodeEvents
  return {
    "v-ng-node-label": true,
    hover: handleEvents && props.state.hovered,
    selected: handleEvents && props.state.selected,
  }
})

const labelClasses = computed(() => {
  const handleEvents = configs.label.handleNodeEvents
  return {
    draggable: handleEvents && props.state.draggable,
    selectable: handleEvents && props.state.selectable,
  }
})
</script>

<template>
  <g
    :class="groupClasses"
    :transform="`translate(${x} ${y})`"
    v-on="eventHandlers(id)"
  >
    <slot
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
      :class="labelClasses"
    >
      <v-text
        :text="state.labelText"
        :x="0"
        :y="0"
        :config="state.label"
        :text-anchor="textAnchor"
        :dominant-baseline="dominantBaseline"
        :class="labelClasses"
        :transform="`translate(${labelX} ${labelY})`"
      />
    </slot>
  </g>
</template>

<style lang="scss">
$transition: 0.1s linear;

:where(.v-ng-node-label) {
  transition: transform $transition;

  > :where(*) {
    cursor: default;
    user-select: none;
    transition: transform $transition;
  }

  .draggable,
  .selectable {
    pointer-events: all;
    cursor: pointer;
  }
}

:where(.dragging .v-ng-node-label),
:where(.v-ng-node-label.v-move) {
  transition: none;
}
</style>
