<script setup lang="ts">
import { defineConfigs, Edges } from "v-network-graph"
import data from "./data"

const edges: Edges = {
  edge1: { source: "node0", target: "node1", sourceState: "off", targetState: "on" },
  edge2: { source: "node1", target: "node2", sourceState: "off", targetState: "on" },
  edge3: { source: "node1", target: "node2", sourceState: "on", targetState: "on" },
  edge4: { source: "node2", target: "node3", sourceState: "on", targetState: "off" },
}

const configs = defineConfigs({
  edge: {
    type: "curve",
    gap: 40,
  },
})

const icons = {
  on: "&#xe63e", // wifi
  off: "&#xe648", // wifi off
} as Record<string, string>
</script>

<template>
  <v-network-graph :nodes="data.nodes" :edges="edges" :layouts="data.layouts" :configs="configs">
    <!-- Use CSS to define references to external fonts.
         To use CSS within SVG, use <defs>. -->
    <defs>
      <!-- Cannot use <style> directly due to restrictions of Vue. -->
      <component is="style">
        @font-face { font-family: 'Material Icons'; font-style: normal; font-weight: 400; src:
        url(https://fonts.gstatic.com/s/materialicons/v97/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2)
        format('woff2'); } .edge-icon { pointer-events: none; }
      </component>
    </defs>
    <template #edge-overlay="{ edge, scale, length, pointAtLength }">
      <!-- source side -->
      <g class="edge-icon">
        <!-- pointAtLength():Calculate the coordinates advanced
             the specified length from the source side. -->
        <circle
          :cx="pointAtLength(40 * scale).x"
          :cy="pointAtLength(40 * scale).y"
          :r="10 * scale"
          stroke="#444"
          :stroke-width="1 * scale"
          :fill="edge.sourceState === 'off' ? '#fcc' : '#fff'"
        />
        <text
          v-bind="pointAtLength(40 * scale)"
          font-family="Material Icons"
          text-anchor="middle"
          dominant-baseline="central"
          :font-size="16 * scale"
          v-html="icons[edge.sourceState]"
        />
      </g>
      <!-- target side -->
      <g class="edge-icon">
        <!-- length: The total length of the edge. -->
        <circle
          :cx="pointAtLength(length - 40 * scale).x"
          :cy="pointAtLength(length - 40 * scale).y"
          :r="10 * scale"
          stroke="#444"
          :stroke-width="1 * scale"
          :fill="edge.targetState === 'off' ? '#fcc' : '#fff'"
        />
        <text
          v-bind="pointAtLength(length - 40 * scale)"
          font-family="Material Icons"
          text-anchor="middle"
          dominant-baseline="central"
          :font-size="16 * scale"
          v-html="icons[edge.targetState]"
        />
      </g>
    </template>
  </v-network-graph>
</template>
