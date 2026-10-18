<script setup lang="ts">
import * as vNG from "v-network-graph"
import data from "./data"

const configs = vNG.defineConfigs({
  node: {
    selectable: true,
    normal: {
      radius: 16,
      color: "#6013ad",
    },
    hover: {
      color: "#430d78",
    },
    label: {
      fontSize: 11,
      color: "#ffffff",
      direction: "center",
    },
  },
  edge: {
    normal: {
      width: 3,
      color: "#58139c",
    },
    hover: {
      color: "#3a0d66",
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
