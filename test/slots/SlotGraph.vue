<script setup lang="ts">
import { VNetworkGraph } from "@/index"

defineProps<{ color: string; withNodeSlot: boolean }>()

const nodes = { node1: { name: "Node 1" } }
const layouts = { nodes: { node1: { x: 0, y: 0 } } }
</script>

<template>
  <!-- The first graph has a fixed slot that reads the color, the second a slot that comes and goes. -->
  <v-network-graph class="stable" :nodes="nodes" :layouts="layouts">
    <template #override-node-label="{ nodeId }">
      <text :data-node="nodeId" :fill="color">label</text>
    </template>
  </v-network-graph>
  <v-network-graph class="dynamic" :nodes="nodes" :layouts="layouts">
    <template v-if="withNodeSlot" #override-node="{ nodeId }">
      <rect :data-node="nodeId" width="10" height="10" />
    </template>
  </v-network-graph>
</template>
