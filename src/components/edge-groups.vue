<script setup lang="ts">
import { useStates, isSummarizedEdges } from "../composables/state"
import VEdge from "./edge.vue"
import VEdgeSummarized from "./edge-summarized.vue"

const { edgeStates, edgeZOrderedList, edgeGroupStates, layouts } = useStates()

// type FlattenEdge = {
//     key: string
//     summarize: true
//     edges: Edges
//     id?: undefined
//     edge?: undefined
// } | {
//     key: string
//     summarize: false
//     edges?: undefined
//     id: string
//     edge: Edge
// }

// const flattenEdges = computed(() => {
//   const results: FlattenEdge[] = []
//   for (const [key, {summarize, edges}] of Object.entries(edgeGroupStates.edgeGroups)) {
//     if (summarize) {
//       results.push({ key, summarize, edges })
//     } else {
//       results.push(...Object.entries(edges).map(([id, edge]) => ({ key, summarize, id, edge })))
//     }
//   }
//   return results
// })

defineExpose({ edgeStates, edgeZOrderedList, edgeGroupStates, layouts })
</script>

<template>
  <template v-for="entry in edgeZOrderedList">
    <template v-if="isSummarizedEdges(entry)">
      <v-edge-summarized
        :key="entry.key"
        :edges="entry.group.edges"
        :layouts="layouts.nodes"
      />
    </template>
    <template v-else>
      <v-edge
        :key="entry.key"
        :id="entry.key"
        :state="edgeStates[entry.key]"
        :source-pos="layouts.nodes[entry.edge.source]"
        :target-pos="layouts.nodes[entry.edge.target]"
      />
    </template>
  </template>
</template>
