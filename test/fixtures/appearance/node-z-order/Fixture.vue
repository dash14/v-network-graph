<script setup lang="ts">
import ColorConvert from "color-convert"
import * as vNG from "v-network-graph"
import { reactive, ref } from "vue"
import data from "./data"

const configs = reactive(
  vNG.defineConfigs({
    node: {
      selectable: true,
      normal: {
        radius: n => n.radius,
        color: n => n.color,
        strokeWidth: 3,
        strokeColor: n => darker(n.color, 20),
      },
      hover: {
        color: n => darker(n.color, 10),
        strokeColor: n => darker(n.color, 30),
      },
      label: {
        text: n => `z-index: ${n.zIndex}`,
        fontSize: 12,
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
