<script setup lang="ts">
import { isSummarizedEdges, useStates } from "@/composables/state"
import { EdgeEntry } from "@/models/edge"
import VLiteEdge from "./VLiteEdge.vue"

const { edgeStates, edgeZOrderedList } = useStates()

// A lite graph does not summarize edges, which leaves every entry a single edge.
function isDrawn(entry: EdgeEntry) {
  return !isSummarizedEdges(entry)
}
</script>

<template>
  <g class="v-ng-layer-edges v-ng-graph-objects">
    <template v-for="entry in edgeZOrderedList" :key="entry.key">
      <v-lite-edge v-if="isDrawn(entry)" :id="entry.key" :state="edgeStates[entry.key]" />
    </template>
  </g>
</template>
