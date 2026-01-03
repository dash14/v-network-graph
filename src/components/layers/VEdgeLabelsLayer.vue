<script setup lang="ts">
import VEdgeLabels from "@/components/edge/VEdgeLabels.vue"
import { EdgeLabelSlotProps } from "@/components/edge/VEdgeLabelPlace.vue"
import { EdgeLabelsSlotProps } from "@/components/edge/VEdgeLabelsPlace.vue"

interface Props {
  enableEdgeLabel: boolean
  enableEdgesLabel: boolean
}

withDefaults(defineProps<Props>(), {
  enableEdgeLabel: false,
  enableEdgesLabel: false,
})

defineSlots<{
  "edge-label": (props: EdgeLabelSlotProps) => any
  "edges-label": (props: EdgeLabelsSlotProps) => any
}>()
</script>

<template>
  <!-- edge labels -->
  <v-edge-labels
    :enable-edge-label="enableEdgeLabel"
    :enable-edges-label="enableEdgesLabel"
    class="v-ng-layer-edge-labels v-ng-graph-objects"
  >
    <template v-if="enableEdgeLabel" #edge-label="slotProps">
      <slot name="edge-label" v-bind="slotProps" />
    </template>
    <template v-if="enableEdgesLabel" #edges-label="slotProps">
      <slot name="edges-label" v-bind="slotProps" />
    </template>
  </v-edge-labels>
</template>
