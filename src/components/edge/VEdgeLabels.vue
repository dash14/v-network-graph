<script setup lang="ts">
import { computed } from "vue"
import { StrokeStyle } from "@/common/configs"
import { EdgeGroup } from "@/models/edge"
import { useStates } from "@/composables/state"
import { useEdgeConfig } from "@/composables/config"
import { useZoomLevel } from "@/composables/zoom"
import * as v2d from "@/modules/calculation/2d"

const edgeConfig = useEdgeConfig()
const { nodeStates, edgeStates, edgeGroupStates, summarizedEdgeStates, layouts } = useStates()
const { scale } = useZoomLevel()

// not summarized
const individualEdgeGroups = computed(() =>
  Object.fromEntries(
    Object.entries(edgeGroupStates.edgeGroups).filter(
      ([_, group]) => !group.summarize && Object.keys(group.edges).length > 0
    )
  )
)

const edgeGroups = computed(() => {
  const individual: Record<string, EdgeGroup> = {}
  const summarized: Record<string, EdgeGroup> = {}
  Object.entries(edgeGroupStates.edgeGroups).forEach(([id, group]) => {
    if (Object.keys(group.edges).length > 0) {
      if (group.summarize) {
        summarized[id] = group
      } else {
        individual[id] = group
      }
    }
  })
  return { individual, summarized }
})

const nodeShape = computed(() => (node: string) => {
  return {
    pos: layouts.nodes[node] ?? { x: 0, y: 0 },
    shape: nodeStates[node].shape,
  }
})

const labelAreaPosition = computed(() => (edgeId: string, edgeStyle: StrokeStyle) => {
  return v2d.calculateEdgeLabelArea(
    edgeStates[edgeId].labelPosition,
    edgeStyle,
    edgeConfig.label.margin,
    edgeConfig.label.padding,
    scale.value
  )
})

const groupLabelAreaPosition = computed(() => (id: string, group: EdgeGroup) => {
  const edgeId = Object.keys(group.edges)[0]
  return v2d.calculateEdgeLabelArea(
    edgeStates[edgeId].labelPosition,
    summarizedEdgeStates[id]?.stroke ?? edgeStates[edgeId].line.stroke,
    edgeConfig.label.margin,
    edgeConfig.label.padding,
    scale.value
  )
})

const representativeEdgeState = computed(() => (group: EdgeGroup) => {
  return edgeStates[Object.keys(group.edges)[0]]
})

</script>

<template>
  <g class="v-ng-edge-labels">
    <template v-for="(group, id) in edgeGroups.individual" :key="id">
      <template v-for="(edge, edgeId) in group.edges" :key="edgeId">
        <slot
          v-if="!edgeStates[edgeId].loop"
          name="edge-label"
          :edge-id="edgeId"
          :edge="edge"
          :config="edgeConfig.label"
          :area="labelAreaPosition(edgeId, edgeStates[edgeId].line.stroke)"
          :hovered="edgeStates[edgeId].hovered"
          :selected="edgeStates[edgeId].selected"
          :scale="scale"
        />
      </template>
    </template>
    <template v-for="(group, id) in edgeGroups.summarized" :key="id">
      <slot
        v-if="!representativeEdgeState(group).loop"
        name="edges-label"
        :edges="group.edges"
        :config="edgeConfig.label"
        :area="groupLabelAreaPosition(id, group)"
        :hovered="representativeEdgeState(group).hovered"
        :selected="representativeEdgeState(group).selected"
        :scale="scale"
      />
    </template>
  </g>
</template>

<style lang="scss">
.v-ng-edge-labels {
  .v-ng-text,
  .v-ng-text-background {
    pointer-events: none;
  }
}
</style>
