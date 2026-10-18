<script setup lang="ts">
import * as vNG from "v-network-graph"
import { ForceLayout, ForceNodeDatum, ForceEdgeDatum } from "v-network-graph/lib/force-layout"
import data from "./data"

const configs = vNG.defineConfigs({
  view: {
    autoPanAndZoomOnLoad: "fit-content",
    layoutHandler: new ForceLayout({
      // Keeps the positions ticked manually, without restarting the simulation.
      noAutoRestartSimulation: true,

      createSimulation: (d3, nodes, edges) => {
        const forceLink = d3
          .forceLink<ForceNodeDatum, ForceEdgeDatum>(edges)
          .id((d: ForceNodeDatum) => d.id)
        return d3
          .forceSimulation(nodes)
          .force("edge", forceLink.distance(10).strength(1))
          .force("charge", d3.forceManyBody().strength(-2000))
          .force("x", d3.forceX())
          .force("y", d3.forceY())
          .stop()
          .tick(100)
      },
    }),
  },
  node: {
    label: {
      visible: false,
    },
  },
})
</script>

<template>
  <v-network-graph :nodes="data.nodes" :edges="data.edges" :configs="configs" />
</template>
