<script setup lang="ts">
import VRenderSlot from "@/components/base/VRenderSlot"
import { EdgeLabelSlotProps } from "@/components/edge/VEdgeLabelPlace.vue"
import VEdgeLabels from "@/components/edge/VEdgeLabels.vue"
import { EdgeLabelsSlotProps } from "@/components/edge/VEdgeLabelsPlace.vue"

// The root's slots come as props: forwarded as slots, they would re-render the labels with the root.
defineProps<{
  edgeLabel?: (props: EdgeLabelSlotProps) => any
  edgesLabel?: (props: EdgeLabelsSlotProps) => any
}>()
</script>

<template>
  <!-- edge labels -->
  <v-edge-labels
    :enable-edge-label="!!edgeLabel"
    :enable-edges-label="!!edgesLabel"
    class="v-ng-layer-edge-labels v-ng-graph-objects"
  >
    <template v-if="edgeLabel" #edge-label="slotProps">
      <v-render-slot :render="edgeLabel" :slot-props="slotProps" />
    </template>
    <template v-if="edgesLabel" #edges-label="slotProps">
      <v-render-slot :render="edgesLabel" :slot-props="slotProps" />
    </template>
  </v-edge-labels>
</template>
