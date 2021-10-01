<script setup lang="ts">
import { useStates } from "../composables/state"
import VEdge from "./edge.vue"
import VEdgeSummarized from "./edge-summarized.vue"

const { edgeStates, edgeGroupStates, layouts } = useStates()

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

defineExpose({ edgeStates, edgeGroupStates, layouts })
</script>

<template>
  <template v-for="({ summarize, edges }, key) in edgeGroupStates.edgeGroups">
    <template v-if="summarize">
      <v-edge-summarized
        :key="key"
        :edges="edges"
        :layouts="layouts.nodes"
      />
    </template>
    <template v-for="(edge, id) in edges" v-else :key="id">
      <v-edge
        :id="id"
        :state="edgeStates[id]"
        :source-pos="layouts.nodes[edge.source]"
        :target-pos="layouts.nodes[edge.target]"
      />
    </template>
  </template>
</template>
