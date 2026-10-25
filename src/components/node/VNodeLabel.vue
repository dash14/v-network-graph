<script setup lang="ts">
import { computed } from "vue"
import { NodeLabelStyle, ShapeStyle } from "@/common/configs"
import VLabelText from "@/components/base/VLabelText.vue"
import VRenderSlot from "@/components/base/VRenderSlot"
import { useNodeConfig } from "@/composables/config"
import { useMouseOperation } from "@/composables/mouse"
import { useNodeLabelPlacement } from "@/composables/nodeLabelPlacement"
import { usePositionWriter } from "@/composables/positionWriter"
import { useZoomLevel } from "@/composables/zoom"
import { NodeState } from "@/models/node"

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
const { scale } = useZoomLevel()

const {
  handleNodePointerDownEvent,
  handleNodePointerOverEvent,
  handleNodePointerOutEvent,
  handleNodeClickEvent,
  handleNodeDoubleClickEvent,
  handleNodeContextMenu,
} = useMouseOperation()

const setElement = usePositionWriter().nodeRef(props.id)

const { textAnchor, dominantBaseline, labelX, labelY } = useNodeLabelPlacement(props)

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
