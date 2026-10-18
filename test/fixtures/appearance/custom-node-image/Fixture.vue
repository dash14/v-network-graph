<script setup lang="ts">
import { Nodes } from "v-network-graph"
import data from "./data"

const nodes: Nodes = {
  node1: { name: "User 1", face: "0023286.png" },
  node2: { name: "User 2", face: "0700202.png" },
  node3: { name: "User 3", face: "0037725.png" },
  node4: { name: "User 4", face: "0062138.png" },
  node5: { name: "User 5", face: "0103755.png" },
  node6: { name: "User 6", face: "0092035.png" },
}
</script>

<template>
  <v-network-graph
    :nodes="nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="data.configs"
  >
    <defs>
      <clipPath id="faceCircle" clipPathUnits="objectBoundingBox">
        <circle cx="0.5" cy="0.5" r="0.5" />
      </clipPath>
    </defs>

    <template #override-node="{ nodeId, scale, config, ...slotProps }">
      <!-- Fill behind the image -->
      <circle class="face-circle" :r="config.radius * scale" fill="#ffffff" v-bind="slotProps" />
      <image
        class="face-picture"
        :x="-config.radius * scale"
        :y="-config.radius * scale"
        :width="config.radius * scale * 2"
        :height="config.radius * scale * 2"
        :xlink:href="`./faces/${nodes[nodeId].face}`"
        clip-path="url(#faceCircle)"
      />
      <!-- Border over the image -->
      <circle
        class="face-circle"
        :r="config.radius * scale"
        fill="none"
        stroke="#808080"
        :stroke-width="1 * scale"
        v-bind="slotProps"
      />
    </template>
  </v-network-graph>
</template>

<style lang="scss" scoped>
.face-circle,
.face-picture {
  transition: all 0.1s linear;
}

// Lets the circle behind receive the mouse events.
.face-picture {
  pointer-events: none;
}
</style>
