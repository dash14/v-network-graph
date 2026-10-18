<script setup lang="ts">
import ColorConvert from "color-convert"
import * as vNG from "v-network-graph"
import { reactive } from "vue"
import data from "./data"

const configs = reactive(
  vNG.defineConfigs({
    edge: {
      selectable: true,
      normal: {
        color: e => e.color,
        width: 6,
      },
      hover: {
        color: e => darker(e.color, 10),
        width: 8,
      },
      selected: {
        dasharray: "4 2",
        width: 6,
      },
      zOrder: {
        enabled: true,
        zIndex: n => n.zIndex,
        bringToFrontOnHover: true,
        bringToFrontOnSelected: true,
      },
    },
  })
)

function darker(hex: string, level: number) {
  const hsv = ColorConvert.hex.hsv(hex)
  hsv[2] -= level
  return "#" + ColorConvert.hsv.hex(hsv)
}
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="configs"
  />
</template>
