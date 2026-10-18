<script setup lang="ts">
import { ref } from "vue"
import data from "./data"

// additional layers definition
const layers = {
  // {layername}: {position}
  badge: "nodes",
}

// wrap with ref() for immediate response to value changes
const layouts = ref(data.layouts)
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="layouts"
    :configs="data.configs"
    :layers="layers"
  >
    <!-- Additional layer -->
    <template #badge="{ scale }">
      <!--
        If the `view.scalingObjects` config is `false`(default),
        scaling does not change the display size of the nodes/edges.
        The `scale` is passed as a scaling factor to implement
        this behavior. -->
      <circle
        v-for="(pos, node) in layouts.nodes"
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
