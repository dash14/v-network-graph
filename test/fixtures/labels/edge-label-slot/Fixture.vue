<script setup lang="ts">
import data from "./data"
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
  </v-network-graph>
</template>
