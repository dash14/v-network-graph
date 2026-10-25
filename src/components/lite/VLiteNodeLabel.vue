<script setup lang="ts">
import { computed } from "vue"
import { useNodeConfig } from "@/composables/config"
import { useLabelTextLines } from "@/composables/labelText"
import { useMouseOperation } from "@/composables/mouse"
import { useNodeLabelPlacement } from "@/composables/nodeLabelPlacement"
import { usePositionWriter } from "@/composables/positionWriter"
import { NodeState } from "@/models/node"

interface Props {
  id: string
  state: NodeState
}

const props = defineProps<Props>()

const configs = useNodeConfig()
const writer = usePositionWriter()
const setElement = writer.nodeRef(props.id)

// Offset by the attributes, as the position writer moves the text itself to the node.
const { textAnchor, dominantBaseline, labelX, labelY } = useNodeLabelPlacement(props)
const { texts, fontSize, lineHeight, topDeltaY } = useLabelTextLines({
  get text() {
    return props.state.labelText
  },
  get config() {
    return props.state.label
  },
  get dominantBaseline() {
    return dominantBaseline.value
  },
})

const {
  handleNodePointerDownEvent,
  handleNodePointerOverEvent,
  handleNodePointerOutEvent,
  handleNodeClickEvent,
  handleNodeDoubleClickEvent,
  handleNodeContextMenu,
} = useMouseOperation()

const eventHandlers = computed(() => {
  if (!configs.label.handleNodeEvents) return {}
  const id = props.id
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
    contextmenu: (e: MouseEvent) => handleNodeContextMenu(id, e),
  }
})

const classes = computed(() => {
  const handleEvents = configs.label.handleNodeEvents
  return {
    "v-ng-node-label": true,
    "v-ng-lite-node-label": true,
    "v-ng-text": true,
    hover: handleEvents && props.state.hovered,
    selected: handleEvents && props.state.selected,
    draggable: handleEvents && props.state.draggable,
    selectable: handleEvents && props.state.selectable,
  }
})
</script>

<template>
  <text
    :ref="setElement"
    :class="classes"
    :x="labelX"
    :y="labelY"
    :text-anchor="textAnchor"
    :dominant-baseline="dominantBaseline"
    :font-family="state.label.fontFamily"
    :font-size="fontSize"
    :fill="state.label.color"
    v-on="eventHandlers"
  >
    <template v-if="texts.length <= 1">
      {{ state.labelText }}
    </template>
    <template v-else>
      <!-- With the baseline on each `<tspan>`, which Safari does not inherit from the `<text>`. -->
      <tspan
        v-for="(t, i) in texts"
        :key="i"
        :x="labelX"
        :dy="i == 0 ? topDeltaY : lineHeight"
        :dominant-baseline="dominantBaseline"
        >{{ t }}</tspan
      >
    </template>
  </text>
</template>

<style lang="scss">
:where(.v-ng-lite-node-label) {
  cursor: default;
  user-select: none;
}
.v-ng-lite-node-label {
  &.draggable,
  &.selectable {
    pointer-events: all;
    cursor: pointer;
  }
}
</style>
