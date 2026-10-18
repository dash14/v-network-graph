<script setup lang="ts">
import * as vNG from "v-network-graph"
import { ForceLayout, ForceNodeDatum, ForceEdgeDatum } from "v-network-graph/lib/force-layout"
import { reactive, ref } from "vue"

const NODE_COUNT = 20

const nodes = reactive({})
const edges = reactive({})

const layouts = ref({
  nodes: {
    node0: {
      x: 0,
      y: 0,
      fixed: true,
    },
  },
})

const configs = reactive(
  vNG.defineConfigs({
    view: {
      layoutHandler: new ForceLayout({
        createSimulation: (d3, nodes, edges) => {
          const forceLink = d3.forceLink<ForceNodeDatum, ForceEdgeDatum>(edges).id(d => d.id)
          return d3
            .forceSimulation(nodes)
            .force("edge", forceLink.distance(60).strength(0.2))
            .force("charge", d3.forceManyBody().strength(-120))
            .alphaMin(0.001)
        },
      }),
    },
    node: {
      normal: {
        color: n => (n.id === "node0" ? "#ff0000" : "#4466cc"),
      },
      label: {
        visible: false,
      },
    },
  })
)

buildNetwork(NODE_COUNT, nodes, edges)

function buildNetwork(count: number, nodes: vNG.Nodes, edges: vNG.Edges) {
  const idNums = [...Array(count)].map((_, i) => i)

  const newNodes = idNums.map(id => [`node${id}`, { id: `node${id}` }])
  Object.assign(nodes, Object.fromEntries(newNodes))

  const makeEdgeEntry = (id1: number, id2: number) => {
    return [`edge${id1}-${id2}`, { source: `node${id1}`, target: `node${id2}` }]
  }
  const newEdges = []
  for (let i = 1; i < count; i++) {
    newEdges.push(makeEdgeEntry(Math.floor(i / 4), i))
  }
  Object.assign(edges, Object.fromEntries(newEdges))
}
</script>

<template>
  <v-network-graph
    :zoom-level="0.5"
    :nodes="nodes"
    :edges="edges"
    :layouts="layouts"
    :configs="configs"
  />
</template>
