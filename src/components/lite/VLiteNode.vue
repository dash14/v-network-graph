<script setup lang="ts">
import { computed } from "vue"
import { useMouseOperation } from "@/composables/mouse"
import { usePositionWriter } from "@/composables/positionWriter"
import { useShapeAttributes } from "@/composables/shape"
import { NodeState } from "@/models/node"

interface Props {
  id: string
  state: NodeState
}

const props = defineProps<Props>()

const writer = usePositionWriter()
const setElement = writer.nodeRef(props.id)

// Around the origin, as the position writer moves the shape itself, with no group around it.
const { x, y, strokeWidth, strokeColor, strokeDasharray, radius, width, height, borderRadius } =
  useShapeAttributes({
    get config() {
      return props.state.shape
    },
    baseX: 0,
    baseY: 0,
  })

const classes = computed(() => ({
  "v-ng-node": true,
  "v-ng-lite-node": true,
  hover: props.state.hovered,
  selected: props.state.selected,
  draggable: props.state.draggable,
  selectable: props.state.selectable,
}))

const {
  handleNodePointerDownEvent,
  handleNodePointerOverEvent,
  handleNodePointerOutEvent,
  handleNodeClickEvent,
  handleNodeDoubleClickEvent,
  handleNodeContextMenu,
} = useMouseOperation()
</script>

<template>
  <circle
    v-if="state.shape.type === 'circle'"
    :ref="setElement"
    :class="classes"
    :cx="x"
    :cy="y"
    :r="radius"
    :fill="state.shape.color"
    :stroke="strokeColor"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
    @pointerdown.stop="handleNodePointerDownEvent(id, $event)"
    @pointerenter.passive="handleNodePointerOverEvent(id, $event)"
    @pointerleave.passive="handleNodePointerOutEvent(id, $event)"
    @click.stop="handleNodeClickEvent(id, $event)"
    @dblclick.stop="handleNodeDoubleClickEvent(id, $event)"
    @contextmenu="handleNodeContextMenu(id, $event)"
  />
  <rect
    v-else
    :ref="setElement"
    :class="classes"
    :x="x"
    :y="y"
    :width="width"
    :height="height"
    :rx="borderRadius"
    :ry="borderRadius"
    :fill="state.shape.color"
    :stroke="strokeColor"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
    @pointerdown.stop="handleNodePointerDownEvent(id, $event)"
    @pointerenter.passive="handleNodePointerOverEvent(id, $event)"
    @pointerleave.passive="handleNodePointerOutEvent(id, $event)"
    @click.stop="handleNodeClickEvent(id, $event)"
    @dblclick.stop="handleNodeDoubleClickEvent(id, $event)"
    @contextmenu="handleNodeContextMenu(id, $event)"
  />
</template>

<style lang="scss">
:where(.v-ng-lite-node) {
  pointer-events: none;
}
.v-ng-lite-node {
  &.draggable,
  &.selectable {
    pointer-events: all;
    cursor: pointer;
  }
}
</style>
