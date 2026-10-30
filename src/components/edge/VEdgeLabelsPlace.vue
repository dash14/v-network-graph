<!--
  When using slots in v-for, unnecessary update hooks are called,
  resulting in performance degradation.
  This can be avoided by placing a component inside the v-for and
  placing a fixed number of slots inside that component.
  ref: https://github.com/vuejs/core/issues/6833
-->
<script setup lang="ts">
import { computed } from "vue"
import { Config, EdgeLabelStyle } from "@/common/configs"
import { EdgeLabelArea, Edges } from "@/common/types"
import { useEdgeConfig } from "@/composables/config"
import { useStates } from "@/composables/state"
import { useZoomLevel } from "@/composables/zoom"
import { EdgeState } from "@/models/edge"
import * as v2d from "@/modules/calculation/2d"

interface Props {
  edges: Edges
  state: EdgeState
}

export interface EdgeLabelsSlotProps {
  edges: Edges
  config: EdgeLabelStyle
  area: EdgeLabelArea
  hovered: boolean
  selected: boolean
  scale: number
}

defineSlots<{ default: (props: EdgeLabelsSlotProps) => any }>()

const props = defineProps<Props>()
const config = useEdgeConfig()
const { scale } = useZoomLevel()
const { edgeStates } = useStates()

const stroke = computed(() => Config.values(config.summarized.stroke, props.edges))
// As the summarized line is, when any of the edges is.
const hovered = computed(() => Object.keys(props.edges).some(id => edgeStates[id]?.hovered))
const selected = computed(() => Object.keys(props.edges).some(id => edgeStates[id]?.selected))

const area = computed(() => {
  return v2d.calculateEdgeLabelArea(
    props.state.labelPosition,
    stroke.value,
    props.state.label.margin,
    props.state.label.padding,
    scale.value
  )
})
</script>
<template>
  <slot
    v-if="!state.loop"
    :edges="edges"
    :config="state.label"
    :area="area"
    :hovered="hovered"
    :selected="selected"
    :scale="scale"
  />
</template>
