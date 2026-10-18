<script setup lang="ts">
import { defineConfigs } from "v-network-graph"
import data from "./data"

const configs = defineConfigs({
  view: {
    builtInLayerOrder: ["node-labels", "paths"],
  },
  node: {
    selectable: true,
    // The label background is left out, since its size depends on the fonts.
    label: {
      margin: 6,
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
