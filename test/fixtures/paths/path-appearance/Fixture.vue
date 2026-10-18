<script setup lang="ts">
import * as vNG from "v-network-graph"
import { reactive } from "vue"
import data from "./data"

const paths: vNG.Paths = {
  path1: { edges: ["edge1", "edge3", "edge5", "edge7"] },
  path2: { edges: ["edge2", "edge4", "edge6", "edge10"] },
}

const initialConfigs = vNG.defineConfigs({
  node: {
    normal: {
      type: "circle",
      radius: 20,
      color: "#99ccff",
    },
    hover: {
      color: "#88bbff",
    },
    label: {
      visible: false,
      fontSize: 8,
    },
  },
  edge: {
    gap: 12,
    normal: {
      color: "#6699cc",
    },
  },
  path: {
    visible: true,
    clickable: true,
    hoverable: true,
    selectable: true,
    curveInNode: false,
    end: "centerOfNode", // "centerOfNode" or "edgeOfNode"
    margin: 0,
    normal: {
      width: 10,
      color: "#ff800088",
      dasharray: "",
      linecap: "round",
      linejoin: "round",
      animate: false,
      animationSpeed: 50,
    },
    hover: {
      width: 12,
      color: "#ff000088",
      dasharray: "",
      linecap: "round",
      linejoin: "round",
      animate: false,
      animationSpeed: 50,
    },
    selected: {
      width: 12,
      color: "#ff000088",
      dasharray: "6 16",
      linecap: "round",
      linejoin: "round",
      animate: true,
      animationSpeed: 30,
    },
  },
})
const configs = reactive(initialConfigs)
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
