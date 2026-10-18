<script setup lang="ts">
import * as vNG from "v-network-graph"
import { reactive } from "vue"
import data from "./data"

const initialConfigs = vNG.defineConfigs({
  node: {
    normal: {
      radius: 20,
    },
    label: {
      visible: false,
    },
  },
  edge: {
    marker: {
      target: { type: "arrow" },
    },
    selfLoop: {
      radius: 14,
      offset: 16,
      angle: 180,
      isClockwise: true,
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
