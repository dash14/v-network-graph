<script setup lang="ts">
import { Edge } from "v-network-graph"
import data from "./data"

function summarizedEdgeLabel(edges: Record<string, Edge>) {
  const edgeList = Object.values(edges)
  return `${edgeList[0].label}~${edgeList[edgeList.length - 1].label}`
}
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="data.configs"
  >
    <template #edge-label="{ edge, ...slotProps }">
      <v-edge-label :text="edge.label" align="center" vertical-align="above" v-bind="slotProps" />
    </template>
    <template #edges-label="{ edges, ...slotProps }">
      <v-edge-label
        :text="summarizedEdgeLabel(edges)"
        align="center"
        vertical-align="above"
        v-bind="slotProps"
      />
    </template>
  </v-network-graph>
</template>
