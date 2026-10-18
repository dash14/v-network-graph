<script setup lang="ts">
import * as vNG from "v-network-graph"
import { reactive, ref } from "vue"
import data, { Node, Edge } from "./data"

const nodes = reactive({ ...data.nodes })
const edges = reactive({ ...data.edges })

const configs = reactive(
  vNG.defineConfigs<Node, Edge>({
    node: {
      normal: {
        type: "circle",
        radius: node => node.size,
        color: node => node.color,
      },
      hover: {
        radius: node => node.size + 2,
        color: node => node.color,
      },
      selectable: true,
      label: {
        visible: node => !!node.label,
      },
      focusring: {
        color: "darkgray",
      },
    },
    edge: {
      normal: {
        width: edge => edge.width,
        color: edge => edge.color,
        dasharray: edge => (edge.dashed ? "4" : "0"),
      },
    },
  })
)

const selectedNodes = ref<string[]>([])
const selectedEdges = ref<string[]>([])
</script>

<template>
  <v-network-graph
    v-model:selected-nodes="selectedNodes"
    v-model:selected-edges="selectedEdges"
    :nodes="nodes"
    :edges="edges"
    :layouts="data.layouts"
    :configs="configs"
  />
</template>
