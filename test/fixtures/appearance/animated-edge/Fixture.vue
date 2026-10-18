<script setup lang="ts">
import * as vNG from "v-network-graph"
import data from "./data"

const configs = vNG.defineConfigs({
  node: {
    selectable: true,
    normal: {
      radius: 10,
      color: "#ffffff",
      strokeColor: "#ff00dd",
      strokeWidth: 3,
    },
    hover: {
      radius: 14,
      color: "#ffffff",
      strokeColor: "#ff00dd",
      strokeWidth: 3,
    },
    label: {
      visible: false,
    },
    focusring: {
      color: "#ff00dd30", // alpha
    },
  },
  edge: {
    normal: {
      width: edge => (edge.animate ? 2 : 1),
      color: "#ff00dd",
      dasharray: edge => (edge.animate ? "4" : "0"),
      animate: edge => !!edge.animate,
    },
    hover: {
      color: "#ff00dd",
    },
  },
})
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="configs"
  />
</template>
