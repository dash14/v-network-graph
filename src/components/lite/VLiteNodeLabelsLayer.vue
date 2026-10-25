<script setup lang="ts">
import { computed } from "vue"
import { useStates } from "@/composables/state"
import VLiteNodeLabel from "./VLiteNodeLabel.vue"

const { nodeZOrderedList } = useStates()

const labeled = computed(() =>
  nodeZOrderedList.value.filter(state => state.label.visible && (state.labelText ?? false))
)
</script>

<template>
  <g class="v-ng-layer-node-labels v-ng-graph-objects">
    <v-lite-node-label
      v-for="nodeState in labeled"
      :id="nodeState.id"
      :key="nodeState.id"
      :state="nodeState"
    />
  </g>
</template>
