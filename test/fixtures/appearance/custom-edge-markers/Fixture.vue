<script setup lang="ts">
import * as vNG from "v-network-graph"
import { reactive } from "vue"
import data from "./data"

const configs = reactive(
  vNG.defineConfigs({
    edge: {
      selectable: true,
      margin: 1,
      marker: {
        source: {
          type: "custom",
          width: 4,
          height: 4,
          margin: -1,
          units: "strokeWidth",
          color: null,
          customId: "marker-custom-diamond",
        },
        target: {
          type: "custom",
          width: 4,
          height: 4,
          margin: -1,
          units: "strokeWidth",
          color: null,
          customId: "marker-custom-diamond",
        },
      },
    },
  })
)
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="configs"
  >
    <!-- The elements specified in the default slot
         will be placed in the root of <svg>. -->
    <defs>
      <marker
        id="marker-custom-diamond"
        markerWidth="6"
        markerHeight="6"
        refX="3"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <polygon points="0 3, 3 0, 6 3, 3 6" fill="#ff6666" />
      </marker>
    </defs>
  </v-network-graph>
</template>
