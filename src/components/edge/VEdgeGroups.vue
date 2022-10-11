<script setup lang="ts">
import { useStates, isSummarizedEdges } from "@/composables/state"
import VEdge from "./VEdge.vue"
import VEdgeSummarized from "./VEdgeSummarized.vue"
import VEdgeOverlay from "./VEdgeOverlay.vue"

defineProps<{
  hasEdgeOverlaySlot: boolean
}>()

const { edgeStates, edgeZOrderedList, layouts } = useStates()

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
</script>

<template>
  <template v-for="entry in edgeZOrderedList">
    <template v-if="isSummarizedEdges(entry)">
      <v-edge-summarized
        :key="entry.key"
        :edges="entry.group.edges"
        :layouts="layouts.nodes"
      />
      <v-edge-overlay
        v-if="hasEdgeOverlaySlot"
        :key="entry.key"
        :edges="entry.group.edges"
        :state="edgeStates[Object.keys(entry.group.edges)[0]]"
        :is-summarized="true"
      >
        <template #default="slotProps">
          <slot v-bind="slotProps" />
        </template>
      </v-edge-overlay>
    </template>
    <template v-else>
      <v-edge
        :key="entry.key"
        :id="entry.key"
        :state="edgeStates[entry.key]"
        :source-pos="layouts.nodes[entry.edge.source]"
        :target-pos="layouts.nodes[entry.edge.target]"
      />
      <v-edge-overlay
        v-if="hasEdgeOverlaySlot"
        :key="entry.key"
        :edge-id="entry.key"
        :edge="entry.edge"
        :state="edgeStates[entry.key]"
        :is-summarized="false"
      >
        <template #default="slotProps">
          <slot v-bind="slotProps" />
        </template>
      </v-edge-overlay>
    </template>
  </template>
</template>
