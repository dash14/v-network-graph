<script setup lang="ts">
import { computed } from "vue"
import { Position } from "../common/types"
import { useStates } from "../composables/state"
import { AnyShapeStyle, StrokeStyle } from "../common/configs"
import { useEdgeConfig } from "../composables/config"
import { useZoomLevel } from "../composables/zoom"
import * as v2d from "../common/2d"

interface NodeShape {
  pos: Position
  shape: AnyShapeStyle
}

const edgeConfig = useEdgeConfig()
const { nodeStates, edgeStates, edgeGroupStates, layouts } = useStates()
const { scale } = useZoomLevel()

// not summarized
const indivisualEdgeGroups = computed(() =>
  Object.fromEntries(
    Object.entries(edgeGroupStates.edgeGroups).filter(
      ([_, group]) => !group.summarize && Object.keys(group.edges).length > 0
    )
  )
)

const labelAreaPosition = computed(
  () => (edgeId: string, source: NodeShape, target: NodeShape, edgeStyle: StrokeStyle) => {
    return v2d.calculateEdgeLabelArea(
      edgeStates[edgeId].labelPosition,
      edgeStyle,
      edgeConfig.label.margin,
      edgeConfig.label.padding,
      scale.value
    )
  }
)

const nodeShape = computed(() => (node: string) => {
  return {
    pos: layouts.nodes[node] ?? { x: 0, y: 0 },
    shape: nodeStates[node].shape,
  }
})

defineExpose({
  indivisualEdgeGroups,
  labelAreaPosition,
  nodeShape,
  edgeStates,
  edgeConfig,
  scale,
})
</script>

<template>
  <g class="v-edge-labels">
    <template v-for="(group, id) in indivisualEdgeGroups" :key="id">
      <template v-for="(edge, edgeId) in group.edges" :key="edgeId">
        <slot
          name="edge-label"
          :edge-id="edgeId"
          :edge="edge"
          :config="edgeConfig.label"
          :area="
            labelAreaPosition(
              edgeId,
              nodeShape(edge.source),
              nodeShape(edge.target),
              edgeStates[edgeId].line.stroke
            )
          "
          :hovered="edgeStates[edgeId].hovered"
          :selected="edgeStates[edgeId].selected"
          :scale="scale"
        />
      </template>
    </template>
  </g>
</template>

<style lang="scss" scoped>
.v-edge-labels {
  :deep(.v-text),
  :deep(.v-text-background) {
    pointer-events: none;
  }
}
</style>
