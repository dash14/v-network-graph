<script setup lang="ts">
import data from "./data"

// additional layers definition
const layers = {
  // {layername}: {position}
  worldmap: "base",
}

// Bound rather than static, so that the build does not resolve it as a module.
const mapUrl = "/worldmap.svg"
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="data.configs"
    :layers="layers"
  >
    <!-- Additional layer -->
    <template #worldmap>
      <image :href="mapUrl" x="0" y="0" width="1000px" />
    </template>
  </v-network-graph>
</template>
