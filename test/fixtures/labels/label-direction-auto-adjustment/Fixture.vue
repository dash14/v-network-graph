<script setup lang="ts">
import * as vNG from "v-network-graph"
import { reactive } from "vue"
import data from "./data"

const initialConfigs = vNG.defineConfigs({
  node: {
    label: {
      visible: true,
      direction: "south",
      directionAutoAdjustment: true,
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
    :configs="configs"
  />
</template>
