<script setup lang="ts">
import { isSummarizedEdges, useStates } from "@/composables/state"
import { EdgeEntry } from "@/models/edge"
import VLiteEdge from "./VLiteEdge.vue"

const { edgeStates, edgeZOrderedList } = useStates()

// A self-loop needs a curve, which a lite graph does not draw.
function isDrawn(entry: EdgeEntry) {
  return !isSummarizedEdges(entry) && entry.edge.source !== entry.edge.target
}
</script>

<template>
  <g class="v-ng-layer-edges v-ng-graph-objects">
    <template v-for="entry in edgeZOrderedList" :key="entry.key">
      <v-lite-edge v-if="isDrawn(entry)" :id="entry.key" :state="edgeStates[entry.key]" />
    </template>
  </g>
</template>
