<script setup lang="ts">
import { useStates } from "@/composables/state"
import VEdgeBackground from "./VEdgeBackground.vue"

const { edgeStates, edgeGroupStates } = useStates()
</script>

<template>
  <template v-for="{ summarize, edges } in edgeGroupStates.edgeGroups">
    <template v-if="!summarize">
      <template v-for="(edge, id) in edges" :key="id">
        <v-edge-background :id="id" :state="edgeStates[id]" />
      </template>
    </template>
  </template>
</template>
