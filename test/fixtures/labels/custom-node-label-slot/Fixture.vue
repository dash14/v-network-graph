<script setup lang="ts">
import data from "./data"
</script>

<template>
  <v-network-graph :nodes="data.nodes" :edges="data.edges" :layouts="data.layouts">
    <template
      #override-node-label="{ nodeId, scale, text, x, y, config, textAnchor, dominantBaseline }"
    >
      <text
        x="0"
        y="0"
        :font-size="9 * scale"
        text-anchor="middle"
        dominant-baseline="central"
        fill="#ffffff"
        >{{ nodeId }}</text
      >
      <text
        x="0"
        y="0"
        :font-size="config.fontSize * scale"
        :text-anchor="textAnchor"
        :dominant-baseline="dominantBaseline"
        :fill="config.color"
        :transform="`translate(${x} ${y})`"
        >{{ text }}</text
      >
    </template>
  </v-network-graph>
</template>
