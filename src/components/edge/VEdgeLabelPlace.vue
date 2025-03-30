<!--
  When using slots in v-for, unnecessary update hooks are called,
  resulting in performance degradation.
  This can be avoided by placing a component inside the v-for and
  placing a fixed number of slots inside that component.
  ref: https://github.com/vuejs/core/issues/6833
-->
<script setup lang="ts">
import { computed } from "vue"
import { Edge, EdgeLabelArea } from "@/common/types"
import { EdgeState } from "@/models/edge"
import { useZoomLevel } from "@/composables/zoom"
import * as v2d from "@/modules/calculation/2d"
import { EdgeLabelStyle } from "@/index.umd"

interface Props {
  edgeId: string
  edge: Edge
  state: EdgeState
}

const props = defineProps<Props>()

export interface EdgeLabelSlotProps {
  edgeId: string
  edge: Edge
  config: EdgeLabelStyle
  area: EdgeLabelArea
  hovered: boolean
  selected: boolean
  scale: number
}

defineSlots<{ default: (props: EdgeLabelSlotProps) => any }>()

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
