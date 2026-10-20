<script setup lang="ts">
import { computed } from "vue"
import { Position } from "@/common/types"
import { usePositionWriter } from "@/composables/positionWriter"
import { useStrokeAttributes } from "@/composables/stroke"
import { EdgeState } from "@/models/edge"

interface Props {
  id: string
  state: EdgeState
  sourcePos?: Position
  targetPos?: Position
}

const props = withDefaults(defineProps<Props>(), {
  sourcePos: undefined,
  targetPos: undefined,
})

// Drawn here rather than with a child per edge: a child costs more to update than the path itself.
const { strokeWidth, strokeDasharray, animationSpeed } = useStrokeAttributes(
  () => props.state.line.stroke
)
// Computed, so that the edge re-renders only when its kind changes, not when its curve moves.
const isLoop = computed(() => !!props.state.loop)
const isStraight = computed(() => !isLoop.value && !props.state.curve)
const setPathElement = usePositionWriter().edgeRef(props.id)
</script>

<template>
  <path
    :ref="setPathElement"
    :class="{
      'v-ng-line': true,
      animate: state.line.stroke.animate,
      selectable: state.selectable,
      hover: state.hovered,
      selected: state.selected,
    }"
    :fill="isStraight ? undefined : 'none'"
    :stroke="state.line.stroke.color"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
    :stroke-linecap="state.line.stroke.linecap"
    :style="animationSpeed"
    :data-edge-id="isLoop ? undefined : id"
    :marker-start="state.sourceMarkerId ? `url('#${state.sourceMarkerId}')` : undefined"
    :marker-end="state.targetMarkerId ? `url('#${state.targetMarkerId}')` : undefined"
    class="v-ng-edge"
  />
</template>

<style lang="scss">
$transition: 0.1s linear;

.v-ng-edge {
  transition:
    stroke $transition,
    stroke-width $transition;
  pointer-events: none;
}
</style>
