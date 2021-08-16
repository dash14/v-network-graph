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
              edgeStroke(edgeId, edge)
            )
          "
          :scale="scale"
        />
      </template>
    </template>
  </g>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue"
import { useEdgePositions } from "../composables/edge"
import { Edge, NodePositions, Nodes, Position } from "../common/types"
import { AnyShapeStyle, Config, StrokeStyle } from "../common/configs"
import { useEdgeConfig, useNodeConfig } from "../composables/style"
import { useMouseOperation } from "../composables/mouse"
import { useZoomLevel } from "../composables/zoom"
import * as v2d from "../common/2d"

interface NodeShape {
  pos: Position
  shape: AnyShapeStyle
}

export default defineComponent({
  props: {
    nodes: {
      type: Object as PropType<Nodes>,
      required: true,
    },
    nodeLayouts: {
      type: Object as PropType<NodePositions>,
      required: true,
    },
  },
  setup(props) {
    const { state, edgePositions } = useEdgePositions()
    const nodeConfig = useNodeConfig()
    const edgeConfig = useEdgeConfig()
    const { hoveredNodes, selectedNodes, selectedEdges } = useMouseOperation()
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

    const shape = computed(() => (nodeId: string) => {
      if (hoveredNodes.has(nodeId) && nodeConfig.hover) {
        return Config.values(nodeConfig.hover, props.nodes[nodeId])
      } else if (selectedNodes.has(nodeId) && nodeConfig.selected) {
        return Config.values(nodeConfig.selected, props.nodes[nodeId])
      } else {
        return Config.values(nodeConfig.normal, props.nodes[nodeId])
      }
    })

    const nodeShape = computed(() => (node: string) => {
      // TODO: 呼び出し回数をへらす
      return {
        pos: props.nodeLayouts[node] ?? { x: 0, y: 0 },
        shape: shape.value(node),
      }
    })

    // TODO: nodeIdごとのhoverを独立させる

    const edgeStroke = computed(() => (edgeId: string, edge: Edge) => {
      if (selectedEdges.has(edgeId)) {
        return Config.values(edgeConfig.selected, edge)
        // } else if (hover.value && config.hover) {
        //   return Config.values(edgeConfig.hover, edge)
      } else {
        return Config.values(edgeConfig.normal, edge)
      }
    })

    return { indivisualEdgeGroups, labelAreaPosition, nodeShape, edgeStroke, edgeConfig, scale }
  },
})
</script>
