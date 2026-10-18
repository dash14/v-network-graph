<script setup lang="ts">
import { Nodes } from "v-network-graph"
import data from "./data"

// icon code point searched from: https://fonts.google.com/icons
const nodes: Nodes = {
  node1: { name: "N1", icon: "&#xe320" /* Laptop Mac */ },
  node2: { name: "N2", icon: "&#xe328" /* Router */ },
  node3: { name: "N3", icon: "&#xe331" /* Tablet Mac */ },
  node4: { name: "N4", icon: "&#xe2bd" /* Cloud */ },
  node5: { name: "N5", icon: "&#xf0e2" /* Support Agent */ },
  node6: { name: "N6", icon: "&#xea75" /* Video Settings */ },
}
</script>

<template>
  <v-network-graph
    :nodes="nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="data.configs"
  >
    <!-- Use CSS to define references to external fonts.
         To use CSS within SVG, use <defs>. -->
    <defs>
      <!-- Cannot use <style> directly due to restrictions of Vue. -->
      <component is="style">
        @font-face { font-family: 'Material Icons'; font-style: normal; font-weight: 400; src:
        url(https://fonts.gstatic.com/s/materialicons/v97/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2)
        format('woff2'); }
      </component>
    </defs>

    <!-- Replace the node component -->
    <template #override-node="{ nodeId, scale, config, ...slotProps }">
      <circle :r="config.radius * scale" :fill="config.color" v-bind="slotProps" />
      <!-- Use v-html to interpret escape sequences for icon characters. -->
      <text
        font-family="Material Icons"
        :font-size="22 * scale"
        fill="#ffffff"
        text-anchor="middle"
        dominant-baseline="central"
        style="pointer-events: none"
        v-html="nodes[nodeId].icon"
      />
    </template>
  </v-network-graph>
</template>
