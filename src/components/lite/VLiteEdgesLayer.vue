<script setup lang="ts">
import { isSummarizedEdges, useStates } from "@/composables/state"
import VLiteEdge from "./VLiteEdge.vue"

const { edgeStates, edgeZOrderedList } = useStates()
</script>

<template>
  <g class="v-ng-layer-edges v-ng-graph-objects">
    <!-- A lite graph does not summarize edges, which leaves every entry a single edge. -->
    <template v-for="entry in edgeZOrderedList" :key="entry.key">
      <v-lite-edge
        v-if="!isSummarizedEdges(entry)"
        :id="entry.key"
        :state="edgeStates[entry.key]"
      />
    </template>
  </g>
</template>
