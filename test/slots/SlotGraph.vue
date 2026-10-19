<script setup lang="ts">
import { VNetworkGraph } from "@/index"

defineProps<{ color: string; withSlots: boolean }>()

const nodes = { node1: { name: "Node 1" }, node2: { name: "Node 2" } }
const edges = { edge1: { source: "node1", target: "node2" } }
const layouts = { nodes: { node1: { x: 0, y: 0 }, node2: { x: 100, y: 0 } } }
</script>

<template>
  <!-- The first graph has a fixed slot that reads the color, the second slots that come and go. -->
  <v-network-graph class="stable" :nodes="nodes" :layouts="layouts">
    <template #override-node-label="{ nodeId }">
      <text :data-node="nodeId" :fill="color">label</text>
    </template>
  </v-network-graph>
  <v-network-graph class="dynamic" :nodes="nodes" :edges="edges" :layouts="layouts">
    <!-- Renders nothing for node2, which then gets the default shape and label. -->
    <template v-if="withSlots" #override-node="{ nodeId }">
      <rect v-if="nodeId === 'node1'" :data-node="nodeId" width="10" height="10" />
    </template>
    <template v-if="withSlots" #override-node-label="{ nodeId }">
      <text v-if="nodeId === 'node1'" :data-node="nodeId">custom</text>
    </template>
    <template v-if="withSlots" #edge-overlay>
      <circle class="custom-edge-overlay" r="2" />
    </template>
  </v-network-graph>
</template>
