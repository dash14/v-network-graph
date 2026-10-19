<script setup lang="ts">
import { defineConfigs } from "v-network-graph"
import data from "../../../../fixtures/layers/built-in-layer-order/data"

const configs = defineConfigs({
  view: {
    builtInLayerOrder: ["node-labels", "paths"],
  },
  node: {
    selectable: true,
    label: {
      margin: 6,
      background: {
        visible: true,
        color: "#ccddff",
        padding: {
          vertical: 2,
          horizontal: 6,
        },
        borderRadius: 4,
      },
    },
  },
  path: {
    visible: true,
    path: {
      width: 10,
      color: "#eeaa88aa",
    },
    curveInNode: true,
  },
})
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :paths="data.paths"
    :layouts="data.layouts"
    :configs="configs"
  />
</template>
