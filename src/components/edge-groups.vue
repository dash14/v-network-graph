<template>
  <template v-for="({ summarize, edges }, key) in state.edgeGroups">
    <template v-if="summarize">
      <v-summarized-edge
        :key="key"
        :edges="edges"
        :layouts="nodeLayouts"
      />
    </template>
    <template v-for="(edge, id) in edges" v-else :key="id">
      <v-edge
        :id="id"
        :edge="edge"
        :source-pos="nodeLayouts[edge.source]"
        :target-pos="nodeLayouts[edge.target]"
        :selected="selectedEdges.has(id.toString())"
      />
    </template>
  </template>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import { useEdgePositions } from "../composables/edge"
import { useMouseOperation } from "../composables/mouse"
import { NodePositions } from "../common/types"
import VEdge from "./edge.vue"
import VSummarizedEdge from "./summarized-edge.vue"

export default defineComponent({
  components: { VEdge, VSummarizedEdge },
  props: {
    nodeLayouts: {
      type: Object as PropType<NodePositions>,
      required: true
    }
  },
  setup() {
    const { state } = useEdgePositions()
    const { selectedEdges } = useMouseOperation()

    return { state, selectedEdges }
  }
})

</script>
