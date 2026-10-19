<script setup lang="ts">
import { Position } from "@/common/types"
import VArc from "@/components/base/VArc.vue"
import { useEdgeConfig } from "@/composables/config"
import { useStrokeAttributes } from "@/composables/stroke"
import { EdgeState } from "@/models/edge"
import VEdgeCurved from "./VEdgeCurved.vue"

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

const config = useEdgeConfig()

// Drawn here rather than with VLine: a child per edge costs more to update than the path itself.
const { strokeWidth, strokeDasharray, animationSpeed } = useStrokeAttributes(
  () => props.state.line.stroke
)
</script>

<template>
  <v-arc
    v-if="state.loop"
    v-bind="state.position"
    :radius="state.loop.radius"
    :is-large-arc="state.loop.isLargeArc"
    :is-clockwise="state.loop.isClockwise"
    :class="{ selectable: state.selectable, hover: state.hovered, selected: state.selected }"
    :config="state.line.stroke"
    :marker-start="state.sourceMarkerId ? `url('#${state.sourceMarkerId}')` : undefined"
    :marker-end="state.targetMarkerId ? `url('#${state.targetMarkerId}')` : undefined"
    class="v-ng-edge"
  />
  <path
    v-else-if="config.type == 'straight' || !state.curve"
    :class="{
      'v-ng-line': true,
      animate: state.line.stroke.animate,
      selectable: state.selectable,
      hover: state.hovered,
      selected: state.selected,
    }"
    :d="`M ${state.position.p1.x} ${state.position.p1.y} L ${state.position.p2.x} ${state.position.p2.y}`"
    :stroke="state.line.stroke.color"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
    :stroke-linecap="state.line.stroke.linecap"
    :style="animationSpeed"
    :data-edge-id="id"
    :marker-start="state.sourceMarkerId ? `url('#${state.sourceMarkerId}')` : undefined"
    :marker-end="state.targetMarkerId ? `url('#${state.targetMarkerId}')` : undefined"
    class="v-ng-edge"
  />
  <v-edge-curved
    v-else
    :data-edge-id="id"
    :class="{ selectable: state.selectable, hover: state.hovered, selected: state.selected }"
    :state="state"
    :config="state.line.stroke"
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
