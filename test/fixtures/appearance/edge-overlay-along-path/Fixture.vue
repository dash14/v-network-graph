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
    <!-- Vue templates cannot contain <style>, so it is rendered as a component. -->
    <defs>
      <component is="style"> .edge-icon { pointer-events: none; } </component>
    </defs>
    <template #edge-overlay="{ edge, scale, length, pointAtLength }">
      <g class="edge-icon">
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
      <g class="edge-icon">
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
