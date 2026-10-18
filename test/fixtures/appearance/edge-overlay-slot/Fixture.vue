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

/**
 * Make `transform` value of the object placing on the edge.
 * @param center - center position
 * @param edgePos - edge source and target positions
 * @param scale - zooming scale
 */
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
    <!-- To use CSS within SVG, use <defs>. -->
    <defs>
      <!-- Cannot use <style> directly due to restrictions of Vue. -->
      <component is="style">
        <!-- prettier-ignore -->
        .marker {
        fill: {{ configs.edge.normal.color }}; transition: fill 0.1s linear; pointer-events: none; }
        .marker.hovered { fill: {{ configs.edge.hover.color }}; } .marker.selected { fill:
        {{ configs.edge.selected.color }}; }
      </component>
    </defs>
    <template #edge-overlay="{ scale, center, position, hovered, selected }">
      <!-- Place the triangle at the center of the edge -->
      <path
        class="marker"
        :class="{ hovered, selected }"
        d="M-5 -5 L5 0 L-5 5 Z"
        :transform="makeTransform(center, position, scale)"
      />
    </template>
  </v-network-graph>
</template>
