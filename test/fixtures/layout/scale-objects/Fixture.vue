<script setup lang="ts">
import * as vNG from "v-network-graph"
import { ref } from "vue"
import data from "./data"

const configs = vNG.defineConfigs({
  view: {
    scalingObjects: true,
    minZoomLevel: 0.1,
    maxZoomLevel: 16,
  },
})

const zoomLevel = ref(1.5)
</script>

<template>
  <v-network-graph
    v-model:zoom-level="zoomLevel"
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="configs"
  />
</template>
