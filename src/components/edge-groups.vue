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
  <template v-for="([_, item]) in edgeZOrderedList">
    <template v-if="isSummarizedEdges(item)">
      <v-edge-summarized
        :key="item.key"
        :edges="item.group.edges"
        :layouts="layouts.nodes"
      />
    </template>
    <template v-else>
      <v-edge
        :key="item.key"
        :id="item.key"
        :state="edgeStates[item.key]"
        :source-pos="layouts.nodes[item.edge.source]"
        :target-pos="layouts.nodes[item.edge.target]"
      />
    </template>
  </template>
</template>
