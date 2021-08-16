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
              edgeStates[edgeId].stroke
            )
          "
          :scale="scale"
        />
      </template>
    </template>
  </g>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue"
import { useEdgePositions } from "../composables/edge"
import { Position } from "../common/types"
import { useStates } from "../composables/state"
import { AnyShapeStyle, StrokeStyle } from "../common/configs"
import { useEdgeConfig } from "../composables/style"
import { useZoomLevel } from "../composables/zoom"
import * as v2d from "../common/2d"

interface NodeShape {
  pos: Position
  shape: AnyShapeStyle
}

export default defineComponent({
  setup() {
    const { state, edgePositions } = useEdgePositions()
    const edgeConfig = useEdgeConfig()
    const { nodeStates, edgeStates, layouts } = useStates()
    const { scale } = useZoomLevel()

    // not summarized
    const indivisualEdgeGroups = computed(() =>
      Object.fromEntries(
        Object.entries(state.edgeGroups).filter(
          ([_, group]) => !group.summarize && Object.keys(group.edges).length > 0
        )
      )
    )

    const labelAreaPosition = computed(
      () => (edgeId: string, source: NodeShape, target: NodeShape, edgeStyle: StrokeStyle) => {
        const line = edgePositions.value(edgeId, source.pos, target.pos)
        return v2d.calculateEdgeLabelArea(
          line,
          edgeStyle,
          source.pos,
          target.pos,
          source.shape,
          target.shape,
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

    return { indivisualEdgeGroups, labelAreaPosition, nodeShape, edgeStates, edgeConfig, scale }
  },
})
</script>
