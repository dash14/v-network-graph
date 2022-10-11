<script setup lang="ts">
import { Position } from "@/common/types"
import { EdgeState } from "@/models/edge"
import { useEdgeConfig } from "@/composables/config"
import VLine from "@/components/base/VLine.vue"
import VArc from "@/components/base/VArc.vue"
import VEdgeCurved from "./VEdgeCurved.vue"

interface Props {
  id: string
  state: EdgeState
  sourcePos?: Position
  targetPos?: Position
}

withDefaults(defineProps<Props>(), {
  sourcePos: undefined,
  targetPos: undefined,
})

const config = useEdgeConfig()

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
  />
  <v-line
    v-else-if="config.type == 'straight' || !state.curve"
    :data-edge-id="id"
    v-bind="state.position"
    :class="{ selectable: state.selectable, hover: state.hovered, selected: state.selected }"
    :config="state.line.stroke"
    :marker-start="state.sourceMarkerId ? `url('#${state.sourceMarkerId}')` : undefined"
    :marker-end="state.targetMarkerId ? `url('#${state.targetMarkerId}')` : undefined"
  />
  <v-edge-curved
    v-else
    :data-edge-id="id"
    :class="{ selectable: state.selectable, hover: state.hovered, selected: state.selected }"
    :state="state"
    :config="state.line.stroke"
    :marker-start="state.sourceMarkerId ? `url('#${state.sourceMarkerId}')` : undefined"
    :marker-end="state.targetMarkerId ? `url('#${state.targetMarkerId}')` : undefined"
  />
</template>

<style lang="scss" scoped>
$transition: 0.1s linear;

:where(.v-line) {
  transition: stroke $transition, stroke-width $transition;
  pointer-events: none;
}
</style>
