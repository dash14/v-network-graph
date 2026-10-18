<script setup lang="ts">
import data from "./data"

const layers = {
  badge: "nodes",
}
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="data.configs"
    :layers="layers"
  >
    <template #badge="{ scale }">
      <!-- `scale` keeps the badge size constant while zooming, as with the nodes. -->
      <circle
        v-for="(pos, node) in data.layouts.nodes"
        :key="node"
        :cx="pos.x + 9 * scale"
        :cy="pos.y - 9 * scale"
        :r="4 * scale"
        :fill="data.nodes[node].active ? '#00cc00' : '#ff5555'"
        style="pointer-events: none"
      />
    </template>
  </v-network-graph>
</template>
