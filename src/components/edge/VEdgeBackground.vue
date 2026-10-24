<script setup lang="ts">
import { computed } from "vue"
import { useMouseOperation } from "@/composables/mouse"
import { usePositionWriter } from "@/composables/positionWriter"
import { useZoomLevel } from "@/composables/zoom"
import { EdgeState } from "@/models/edge"

interface Props {
  id: string
  state: EdgeState
}

const props = defineProps<Props>()

const { scale } = useZoomLevel()

const {
  handleEdgePointerDownEvent,
  handleEdgePointerOverEvent,
  handleEdgePointerOutEvent,
  handleEdgeClickEvent,
  handleEdgeDoubleClickEvent,
  handleEdgeContextMenu,
} = useMouseOperation()

const setPathElement = usePositionWriter().edgeRef(props.id)

const strokeWidth = computed(() => (props.state.line.stroke.width + 10) * scale.value)
</script>

<template>
  <path
    :ref="setPathElement"
    :class="{ 'v-ng-line-background': true, selectable: state.selectable }"
    stroke="transparent"
    :stroke-width="strokeWidth"
    fill="none"
    @pointerdown.stop="handleEdgePointerDownEvent(id, $event)"
    @pointerenter.passive="handleEdgePointerOverEvent(id, $event)"
    @pointerleave.passive="handleEdgePointerOutEvent(id, $event)"
    @click.stop="handleEdgeClickEvent(id, $event)"
    @dblclick.stop="handleEdgeDoubleClickEvent(id, $event)"
    @contextmenu="handleEdgeContextMenu(id, $event)"
  />
</template>

<style lang="scss">
.v-ng-line-background {
  // Hit by its stroke without being painted.
  visibility: hidden;
  pointer-events: stroke;
  &.selectable {
    cursor: pointer;
  }
}
</style>
