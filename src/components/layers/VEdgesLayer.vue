<script setup lang="ts">
import VRenderSlot from "@/components/base/VRenderSlot"
import VEdgeBackgrounds from "../edge/VEdgeBackgrounds.vue"
import VEdgeGroups from "../edge/VEdgeGroups.vue"
import { EdgeOverlaySlotProps } from "../edge/VEdgeOverlay.vue"

// The root's slots come as props: forwarded as slots, they would re-render the edges with the root.
defineProps<{ edgeOverlay?: (props: EdgeOverlaySlotProps) => any }>()
</script>

<template>
  <!-- edges -->
  <g class="v-ng-layer-edges v-ng-graph-objects">
    <v-edge-backgrounds />
    <v-edge-groups :has-edge-overlay-slot="!!edgeOverlay">
      <template v-if="edgeOverlay" #default="slotProps">
        <v-render-slot :render="edgeOverlay" :slot-props="slotProps" />
      </template>
    </v-edge-groups>
  </g>
</template>
