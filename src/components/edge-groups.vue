<template>
  <template v-for="({ summarize, edges }, key) in state.edgeGroups">
    <template v-if="summarize">
      <v-summarized-edge
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

<script lang="ts">
import { defineComponent } from "vue"
import { useEdgePositions } from "../composables/edge"
import { useStates } from "../composables/state"
import VEdge from "./edge.vue"
import VSummarizedEdge from "./summarized-edge.vue"

export default defineComponent({
  components: { VEdge, VSummarizedEdge },
  setup() {
    const { state } = useEdgePositions()
    const { edgeStates, layouts } = useStates()

    return { state, edgeStates, layouts }
  }
})

</script>
