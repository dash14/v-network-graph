<!--
  When using slots in v-for, unnecessary update hooks are called,
  resulting in performance degradation.
  This can be avoided by placing a component inside the v-for and
  placing a fixed number of slots inside that component.
  ref: https://github.com/vuejs/core/issues/6833
-->
<script setup lang="ts">
import { computed } from "vue"
import { Edge } from "@/common/types"
import { EdgeState } from "@/models/edge"
import { useZoomLevel } from "@/composables/zoom"
import * as v2d from "@/modules/calculation/2d"

interface Props {
  edgeId: string
  edge: Edge
  state: EdgeState
}

const props = defineProps<Props>()
const { scale } = useZoomLevel()

const area = computed(() => {
  return v2d.calculateEdgeLabelArea(
    props.state.labelPosition,
    props.state.line.stroke,
    props.state.label.margin,
    props.state.label.padding,
    scale.value
  )
})
</script>
<template>
  <slot
    v-if="!state.loop"
    :edge-id="edgeId"
    :edge="edge"
    :config="state.label"
    :area="area"
    :hovered="state.hovered"
    :selected="state.selected"
    :scale="scale"
  />
</template>
