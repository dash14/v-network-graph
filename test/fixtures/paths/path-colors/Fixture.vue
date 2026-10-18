<script setup lang="ts">
import * as vNG from "v-network-graph"
import data from "./data"

const paths: vNG.Paths = {
  path1: {
    edges: ["edge1", "edge3", "edge5", "edge7"],
    color: "#ff00ff66", // #rrggbbaa <- with alpha
  },
  path2: {
    edges: ["edge2", "edge4", "edge6", "edge10"],
    color: "#00aa0066", // #rrggbbaa <- with alpha
  },
}

const configs = vNG.defineConfigs({
  node: {
    normal: { type: "circle", radius: 20, color: "#99ccff" },
    hover: { color: "#88bbff" },
    label: { visible: false, fontSize: 8 },
  },
  edge: {
    gap: 12,
    normal: { color: "#6699cc" },
  },
  path: {
    visible: true,
    normal: {
      width: 10,
      color: p => p.color,
    },
  },
})
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :paths="paths"
    :configs="configs"
  />
</template>
