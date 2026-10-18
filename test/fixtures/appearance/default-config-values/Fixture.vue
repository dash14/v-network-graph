<script setup lang="ts">
import * as vNG from "v-network-graph"
import { reactive } from "vue"
import data from "./data"

const initialConfigs = vNG.defineConfigs({
  node: {
    selectable: true,
    normal: {
      type: "circle",
      radius: 16,
      // Used when the type is "rect".
      width: 32,
      height: 32,
      borderRadius: 4,
      strokeWidth: 0,
      strokeColor: "#000000",
      strokeDasharray: "0",
      color: "#4466cc",
    },
    hover: {
      type: "circle",
      radius: 16,
      // Used when the type is "rect".
      width: 32,
      height: 32,
      borderRadius: 4,
      strokeWidth: 0,
      strokeColor: "#000000",
      strokeDasharray: "0",
      color: "#dd2288",
    },
    selected: {
      type: "circle",
      radius: 16,
      // Used when the type is "rect".
      width: 32,
      height: 32,
      borderRadius: 4,
      strokeWidth: 0,
      strokeColor: "#000000",
      strokeDasharray: "0",
      color: "#4466cc",
    },
    label: {
      visible: true,
      fontFamily: undefined,
      fontSize: 11,
      lineHeight: 1.1,
      color: "#000000",
      margin: 4,
      direction: "south",
      background: {
        visible: false,
        color: "#ffffff",
        padding: {
          vertical: 1,
          horizontal: 4,
        },
        borderRadius: 2,
      },
    },
    focusring: {
      visible: true,
      width: 4,
      padding: 3,
      color: "#eebb00",
      dasharray: "0",
    },
  },
  edge: {
    selectable: true,
    normal: {
      width: 3,
      color: "#4466cc",
      dasharray: "0",
      linecap: "butt",
      animate: false,
      animationSpeed: 50,
    },
    hover: {
      width: 4,
      color: "#3355bb",
      dasharray: "0",
      linecap: "butt",
      animate: false,
      animationSpeed: 50,
    },
    selected: {
      width: 3,
      color: "#dd8800",
      dasharray: "6",
      linecap: "round",
      animate: false,
      animationSpeed: 50,
    },
    gap: 3,
    type: "straight",
    summarize: true,
    summarized: {
      label: {
        fontSize: 10,
        color: "#4466cc",
      },
      shape: {
        type: "rect",
        radius: 6,
        width: 12,
        height: 12,
        borderRadius: 3,
        color: "#ffffff",
        strokeWidth: 1,
        strokeColor: "#4466cc",
        strokeDasharray: "0",
      },
      stroke: {
        width: 5,
        color: "#4466cc",
        dasharray: "0",
        linecap: "butt",
        animate: false,
        animationSpeed: 50,
      },
    },
  },
})
const configs = reactive(initialConfigs)
</script>

<template>
  <v-network-graph
    :nodes="data.nodes"
    :edges="data.edges"
    :layouts="data.layouts"
    :configs="configs"
  />
</template>
