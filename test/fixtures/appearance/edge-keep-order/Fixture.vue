<script setup lang="ts">
import * as vNG from "v-network-graph"
import { reactive } from "vue"
import data from "./data"

const initialConfigs = vNG.defineConfigs({
  node: {
    normal: {
      color: "#aabbff",
    },
  },
  edge: {
    normal: {
      color: (edge: vNG.Edge) => edge.color,
    },
    hover: {
      color: (edge: vNG.Edge) => edge.color,
    },
    margin: 4,
    marker: {
      source: { type: "arrow" },
    },
    gap: 10,
    keepOrder: "clock",
  },
})
const configs = reactive(initialConfigs)
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="configs"
  />
</template>
