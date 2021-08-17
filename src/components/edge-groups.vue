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

<script lang="ts">
import { defineComponent } from "vue"
import { useStates } from "../composables/state"
import VEdge from "./edge.vue"
import VEdgeSummarized from "./edge-summarized.vue"

export default defineComponent({
  components: { VEdge, VEdgeSummarized },
  setup() {
    const { edgeStates, edgeGroupStates, layouts } = useStates()

    return { edgeStates, edgeGroupStates, layouts }
  }
})
</script>
