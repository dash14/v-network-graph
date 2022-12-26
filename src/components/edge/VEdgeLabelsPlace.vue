<!--
  When using slots in v-for, unnecessary update hooks are called,
  resulting in performance degradation.
  This can be avoided by placing a component inside the v-for and
  placing a fixed number of slots inside that component.
  ref: https://github.com/vuejs/core/issues/6833
-->
<script setup lang="ts">
import { computed } from "vue"
import { EdgeLabelStyle } from "@/common/configs"
import { Edges } from "@/common/types"
import { EdgeState, SummarizedEdgeState } from "@/models/edge"
import { useZoomLevel } from "@/composables/zoom"
import * as v2d from "@/modules/calculation/2d"

interface Props {
  edges: Edges
  config: EdgeLabelStyle
  state: EdgeState
  summarizeState?: SummarizedEdgeState
}

const props = defineProps<Props>()
const { scale } = useZoomLevel()

const area = computed(() => {
  return v2d.calculateEdgeLabelArea(
    props.state.labelPosition,
    props.summarizeState?.stroke ?? props.state.line.stroke,
    props.config.margin,
    props.config.padding,
    scale.value
  )
})
</script>
<template>
  <slot
    v-if="!state.loop"
    :edges="edges"
    :config="config"
    :area="area"
    :hovered="state.hovered"
    :selected="state.selected"
    :scale="scale"
  />
</template>
