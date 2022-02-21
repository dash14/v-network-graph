<script setup lang="ts">
import { useStates } from "@/composables/state"
import VEdgeBackground from "./VEdgeBackground.vue"

const { edgeStates, edgeGroupStates, layouts } = useStates()

defineExpose({ edgeStates, edgeGroupStates, layouts })
</script>

<template>
  <template v-for="({ summarize, edges }) in edgeGroupStates.edgeGroups">
    <template v-if="!summarize">
      <template v-for="(edge, id) in edges" :key="id">
        <v-edge-background
          :id="id"
          :state="edgeStates[id]"
          :source-pos="layouts.nodes[edge.source]"
          :target-pos="layouts.nodes[edge.target]"
        />
      </template>
    </template>
  </template>
</template>
