<script setup lang="ts">
import VNodeFocusRing from "@/components/node/VNodeFocusRing.vue"
import { useStates } from "@/composables/state"
import { useSelections } from "@/composables/selection"
import { useLayouts } from "@/composables/layout"

const { nodeStates } = useStates()
const { selectedNodes } = useSelections()
const layouts = useLayouts()
</script>

<template>
  <!-- node selections (focus ring) -->
  <g class="v-ng-layer-nodes-selections">
    <v-node-focus-ring
      v-for="nodeId in selectedNodes"
      :id="nodeId"
      :key="nodeId"
      :state="nodeStates[nodeId]"
      :pos="layouts.nodes[nodeId]"
    />
  </g>
</template>
