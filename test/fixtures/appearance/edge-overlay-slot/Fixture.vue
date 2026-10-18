<script setup lang="ts">
import * as vNG from "v-network-graph"
import data from "./data"

const configs = vNG.defineConfigs({
  node: {
    selectable: true,
  },
  edge: {
    selectable: true,
    normal: { color: "#5555dd" },
    hover: { color: "#dd5555" },
    selected: { color: "#dddd55" },
    gap: 10,
  },
})

function makeTransform(center: vNG.Point, edgePos: vNG.EdgePosition, scale: number) {
  const radian = Math.atan2(
    edgePos.target.y - edgePos.source.y,
    edgePos.target.x - edgePos.source.x
  )
  const degree = (radian * 180.0) / Math.PI

  return [
    `translate(${center.x} ${center.y})`,
    `scale(${scale}, ${scale})`,
    `rotate(${degree})`,
  ].join(" ")
}
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="configs"
  >
    <!-- Vue templates cannot contain <style>, so it is rendered as a component. -->
    <defs>
      <component is="style">
        .marker { fill: {{ configs.edge.normal.color }}; transition: fill 0.1s linear;
        pointer-events: none; } .marker.hovered { fill: {{ configs.edge.hover.color }}; }
        .marker.selected { fill: {{ configs.edge.selected.color }}; }
      </component>
    </defs>
    <template #edge-overlay="{ scale, center, position, hovered, selected }">
      <path
        class="marker"
        :class="{ hovered, selected }"
        d="M-5 -5 L5 0 L-5 5 Z"
        :transform="makeTransform(center, position, scale)"
      />
    </template>
  </v-network-graph>
</template>
