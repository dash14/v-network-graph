<script setup lang="ts">
import { useStates } from "@/composables/state"
import VLiteNode from "./VLiteNode.vue"

const { nodeZOrderedList } = useStates()
</script>

<template>
  <g class="v-ng-layer-nodes v-ng-graph-objects">
    <v-lite-node
      v-for="nodeState in nodeZOrderedList"
      :id="nodeState.id"
      :key="nodeState.id"
      :state="nodeState"
    />
  </g>
</template>
