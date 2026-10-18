<script setup lang="ts">
import { reactive } from "vue"
import data from "./data"

type TrafficData = Record<string, Record<string, number>>

const traffics = reactive<TrafficData>({
  node1: { node2: 120 },
  node2: { node1: 340, node3: 560, node4: 780 },
  node3: { node2: 910, node4: 25 },
  node4: { node2: 470, node3: 8 },
})
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="data.configs"
  >
    <template #edge-label="{ edgeId, edge, scale, ...slotProps }">
      <v-edge-label :text="edgeId" align="center" vertical-align="below" v-bind="slotProps" />
      <v-edge-label
        :text="`${traffics[edge.source][edge.target]} k`"
        align="source"
        vertical-align="above"
        v-bind="slotProps"
        fill="#ff5500"
        :font-size="12 * scale"
      />
      <v-edge-label
        :text="`${traffics[edge.target][edge.source]} k`"
        align="target"
        vertical-align="above"
        v-bind="slotProps"
        fill="#ff5500"
        :font-size="12 * scale"
      />
    </template>
  </v-network-graph>
</template>
