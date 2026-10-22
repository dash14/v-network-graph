<script setup lang="ts">
import { computed, ref, watchEffect } from "vue"
import { NodeLabelDirection, NodeLabelStyle, ShapeStyle } from "@/common/configs"
import VLabelText from "@/components/base/VLabelText.vue"
import VRenderSlot from "@/components/base/VRenderSlot"
import { useNodeConfig } from "@/composables/config"
import { useLayouts } from "@/composables/layout"
import { useMouseOperation } from "@/composables/mouse"
import { usePositionWriter } from "@/composables/positionWriter"
import { useStates } from "@/composables/state"
import { useZoomLevel } from "@/composables/zoom"
import { NodeState } from "@/models/node"
import { handleNodeLabelAutoAdjustment } from "@/modules/node/label"

interface Props {
  id: string
  state: NodeState
  overrideNodeLabel?: (props: NodeLabelSlotProps) => any
}

export interface NodeLabelSlotProps {
  nodeId: string
  scale: number
  text: string
  x: number
  y: number
  config: NodeLabelStyle
  shape: ShapeStyle
  textAnchor: string
  dominantBaseline: string
}

const props = withDefaults(defineProps<Props>(), {
  overrideNodeLabel: undefined,
})

const configs = useNodeConfig()
const { edgeStates } = useStates()
const { scale } = useZoomLevel()
const layouts = useLayouts()

const {
  handleNodePointerDownEvent,
  handleNodePointerOverEvent,
  handleNodePointerOutEvent,
  handleNodeClickEvent,
  handleNodeDoubleClickEvent,
  handleNodeContextMenu,
} = useMouseOperation()

const setElement = usePositionWriter().nodeRef(props.id)

// The DOM gets the position from the position writer; it is read here only to adjust the direction.
const x = computed(() => layouts.nodes[props.id]?.x || 0)
const y = computed(() => layouts.nodes[props.id]?.y || 0)

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

const slotProps = computed<NodeLabelSlotProps & { class: object }>(() => ({
  nodeId: props.id,
  scale: scale.value,
  text: props.state.labelText,
  x: labelX.value,
  y: labelY.value,
  config: props.state.label,
  shape: props.state.shape,
  textAnchor: textAnchor.value,
  dominantBaseline: dominantBaseline.value,
  class: labelClasses.value,
}))

const labelTextProps = computed(() => ({
  text: props.state.labelText,
  config: props.state.label,
  "text-anchor": textAnchor.value,
  dominantBaseline: dominantBaseline.value,
  class: labelClasses.value,
  transform: `translate(${labelX.value} ${labelY.value})`,
}))
</script>

<template>
  <g :ref="setElement" :class="groupClasses" v-on="eventHandlers(id)">
    <!-- Without the user's slot, no component is put in between. -->
    <v-render-slot v-if="overrideNodeLabel" :render="overrideNodeLabel" :slot-props="slotProps">
      <v-label-text v-bind="labelTextProps" />
    </v-render-slot>
    <v-label-text v-else v-bind="labelTextProps" />
  </g>
</template>

<style lang="scss">
$transition: 0.1s linear;

:where(.v-ng-node-label) {
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
</style>
