<script setup lang="ts">
import * as vNG from "v-network-graph"
import data from "../../../../fixtures/misc/grid/data"

const configs = vNG.defineConfigs({
  view: {
    grid: {
      visible: true,
      interval: 10,
      thickIncrements: 5,
      line: {
        color: "#e0e0e0",
        width: 1,
        dasharray: 1,
      },
      thick: {
        color: "#cccccc",
        width: 1,
        dasharray: 0,
      },
    },
    layoutHandler: new vNG.GridLayout({ grid: 10 }),
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
