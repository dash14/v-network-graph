<script setup lang="ts">
import { computed, useSlots } from "vue"

import VEdgeBackgrounds from "../edge/VEdgeBackgrounds.vue"
import VEdgeGroups from "../edge/VEdgeGroups.vue"
import { EdgeOverlaySlotProps } from "../edge/VEdgeOverlay.vue"

defineSlots<{ "edge-overlay": (props: EdgeOverlaySlotProps) => any }>()

const slots = useSlots()

const hasEdgeOverlaySlot = computed(() => "edge-overlay" in slots)
</script>

<template>
  <!-- edges -->
  <g class="v-ng-layer-edges v-ng-graph-objects">
    <v-edge-backgrounds />
    <v-edge-groups :has-edge-overlay-slot="hasEdgeOverlaySlot">
      <template v-if="hasEdgeOverlaySlot" #default="slotProps">
        <slot name="edge-overlay" v-bind="slotProps" />
      </template>
    </v-edge-groups>
  </g>
</template>
