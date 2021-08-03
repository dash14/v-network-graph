<template>
  <template v-for="[key, group] in Array.from(edgeMap)">
    <template v-if="checkEdgeSummarize(group.edges)">
      <v-summarized-edge
        :key="key"
        :edges="group.edges"
        :layouts="nodeLayouts"
      />
    </template>
    <template v-for="(layout, id) in group.points" v-else :key="`${id}`">
      <v-edge
        :id="id.toString()"
        :edge="layout.edge"
        :source-pos="nodeLayouts[layout.edge.source]"
        :target-pos="nodeLayouts[layout.edge.target]"
        :point-in-group="layout.pointInGroup"
        :group-width="group.groupWidth"
        :selected="selectedEdges.has(id.toString())"
      />
    </template>
  </template>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from "vue"
import { Config, Configs } from "../common/configs"
import { useAllConfigs } from "../composables/style"
import { useMouseOperation } from "../composables/mouse"
import { Edge, Edges, NodePositions, Nodes } from "../common/types"
import VEdge from "./edge.vue"
import VSummarizedEdge from "./summarized-edge.vue"

interface EdgePoint {
  edge: Edge
  pointInGroup: number
}

interface EdgeLayout {
  edges: Edges
  points: { [name: string]: EdgePoint }
  groupWidth: number
}

export default defineComponent({
  components: { VEdge, VSummarizedEdge },
  props: {
    nodes: {
      type: Object as PropType<Nodes>,
      required: true
    },
    edges: {
      type: Object as PropType<Edges>,
      required: true
    },
    nodeLayouts: {
      type: Object as PropType<NodePositions>,
      required: true
    }
  },
  setup(props) {
    const configs = useAllConfigs()
    const { selectedEdges } = useMouseOperation()

    const edgeMap = computed(() => {
      // make edge groups that between same nodes
      const map: { [name: string]: Edges } = {}
      for (const [id, edge] of Object.entries(props.edges)) {
        if (!(edge.source in props.nodes && edge.target in props.nodes)) {
          // reject if no node ID is found on the nodes
          continue
        }
        const key = [edge.source, edge.target].sort().join("<=>")
        const values = map[key] || {}
        values[id] = edge
        map[key] = values
      }

      // Calculate the following:
      // - the starting point of each line
      // - the width between the centers of the lines at both ends
      // *Note*: the drawing position of the line is the center of the line.
      const layouts = new Map<string, EdgeLayout>()
      const gap = configs.edge.gap
      for (const [key, edges] of Object.entries(map)) {
        let pointInGroup = 0
        const lineHalfWidths = Object.values(edges).map(edge => {
          return Config.value(configs.edge.normal.width, edge) / 2
        })
        const points = Object.fromEntries(
          Object.entries(edges).map(([key, edge], i) => {
            if (i > 0) {
              pointInGroup += lineHalfWidths[i - 1] + gap + lineHalfWidths[i]
            }
            return [key, { edge, pointInGroup }]
          })
        )
        layouts.set(key, {
          edges,
          points,
          groupWidth: pointInGroup,
        })
      }

      return layouts
    })

    const defaultCheckSummarize = (edges: Edges, configs: Configs) => {
      // aggregate if the edge width and gap width exceed the size of the node
      const edgeCount = Object.entries(edges).length
      if (edgeCount === 1) return false

      const width =
        Object.values(edges)
          .map(e => Config.value(configs.edge.normal.width, e))
          .reduce((sum, v) => sum + v, 0) +
        configs.edge.gap * (edgeCount - 1)

      const minWidth = Math.min(
        ...Object.values(edges)
          .flatMap(e => [props.nodes[e.source], props.nodes[e.target]])
          .filter(v => v)
          .map(node => {
            const shape = Config.values(configs.node.normal, node)
            if (shape.type === "circle") {
              return shape.radius * 2
            } else {
              return Math.min(shape.width, shape.height)
            }
          })
      )
      return width > minWidth
    }

    const checkEdgeSummarize = computed(() => {
      return (edges: Edges) => {
        if (configs.edge.summarize instanceof Function) {
          return configs.edge.summarize(edges, configs)
        } else if (configs.edge.summarize) {
            return defaultCheckSummarize(edges, configs)
        } else {
          return false
        }
      }
    })

    return { selectedEdges, edgeMap, checkEdgeSummarize }
  }
})

</script>
