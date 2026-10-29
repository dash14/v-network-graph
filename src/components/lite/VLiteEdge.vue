<script setup lang="ts">
import { computed } from "vue"
import { useMouseOperation } from "@/composables/mouse"
import { usePositionWriter } from "@/composables/positionWriter"
import { useStrokeAttributes } from "@/composables/stroke"
import { EdgeState } from "@/models/edge"

interface Props {
  id: string
  state: EdgeState
}

const props = defineProps<Props>()

const { strokeWidth, strokeDasharray, animationSpeed } = useStrokeAttributes(
  () => props.state.line.stroke
)
const setElement = usePositionWriter().edgeRef(props.id)
// Computed, so that the edge re-renders only when its kind changes, not when its loop moves.
const isLoop = computed(() => !!props.state.loop)

const {
  handleEdgePointerDownEvent,
  handleEdgePointerOverEvent,
  handleEdgePointerOutEvent,
  handleEdgeClickEvent,
  handleEdgeDoubleClickEvent,
  handleEdgeContextMenu,
} = useMouseOperation()
</script>

<template>
  <!-- Hit-tested on the stroke itself. Self-loops are drawn as a path. -->
  <component
    :is="isLoop ? 'path' : 'line'"
    :ref="setElement"
    :class="{
      'v-ng-edge': true,
      'v-ng-line': true,
      'v-ng-lite-edge': true,
      animate: state.line.stroke.animate,
      selectable: state.selectable,
      hover: state.hovered,
      selected: state.selected,
    }"
    :fill="isLoop ? 'none' : undefined"
    :stroke="state.line.stroke.color"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
    :stroke-linecap="state.line.stroke.linecap"
    :style="animationSpeed"
    :data-edge-id="id"
    :marker-start="state.sourceMarkerId ? `url('#${state.sourceMarkerId}')` : undefined"
    :marker-end="state.targetMarkerId ? `url('#${state.targetMarkerId}')` : undefined"
    @pointerdown.stop="handleEdgePointerDownEvent(id, $event)"
    @pointerenter.passive="handleEdgePointerOverEvent(id, $event)"
    @pointerleave.passive="handleEdgePointerOutEvent(id, $event)"
    @click.stop="handleEdgeClickEvent(id, $event)"
    @dblclick.stop="handleEdgeDoubleClickEvent(id, $event)"
    @contextmenu="handleEdgeContextMenu(id, $event)"
  />
</template>

<style lang="scss">
// Over the rule of `.v-ng-edge`, which leaves the hits to a line behind the edge.
.v-ng-edge.v-ng-lite-edge {
  pointer-events: stroke;
  &.selectable {
    cursor: pointer;
  }
}
</style>
