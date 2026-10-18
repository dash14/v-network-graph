<script setup lang="ts">
import * as vNG from "v-network-graph"
import data from "./data"

const configs = vNG.defineConfigs({
  node: {
    label: {
      visible: false,
    },
  },
  edge: {
    selectable: true,
    hoverable: true,
    label: {
      fontSize: 11,
      color: "#000000",
    },
  },
})
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="configs"
  >
    <template #edge-label="{ edge, hovered, selected, ...slotProps }">
      <v-edge-label
        :class="{ hovered, selected }"
        :text="edge.label"
        align="center"
        vertical-align="above"
        v-bind="slotProps"
      />
    </template>
  </v-network-graph>
</template>

<style lang="css">
/* In some cases, :deep() selector may be necessary. */
.v-ng-edge-label {
  transition: fill 0.1s;
}
.v-ng-edge-label.hovered {
  fill: #3355bb;
  font-weight: bold;
}
.v-ng-edge-label.selected {
  fill: #dd8800;
  font-weight: bold;
}
</style>
