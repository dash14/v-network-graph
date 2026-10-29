<script setup lang="ts">
import { isSummarizedEdges, useStates } from "@/composables/state"
import VLiteEdge from "./VLiteEdge.vue"

const { edgeStates, edgeZOrderedList } = useStates()
</script>

<template>
  <g class="v-ng-layer-edges v-ng-graph-objects">
    <!-- Edges are never summarized in a lite graph. -->
    <template v-for="entry in edgeZOrderedList" :key="entry.key">
      <v-lite-edge
        v-if="!isSummarizedEdges(entry)"
        :id="entry.key"
        :state="edgeStates[entry.key]"
      />
    </template>
  </g>
</template>
