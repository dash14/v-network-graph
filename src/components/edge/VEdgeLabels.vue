<script setup lang="ts">
import { computed } from "vue"
import { EdgeGroup } from "@/models/edge"
import { useStates } from "@/composables/state"
import { useEdgeConfig } from "@/composables/config"
import VEdgeLabelPlace from "./VEdgeLabelPlace.vue"
import VEdgeLabelsPlace from "./VEdgeLabelsPlace.vue"

interface Props {
  enableEdgeLabel: boolean
  enableEdgesLabel: boolean
}

withDefaults(defineProps<Props>(), {
  enableEdgeLabel: false,
  enableEdgesLabel: false,
})

const edgeConfig = useEdgeConfig()
const { edgeStates, edgeGroupStates, summarizedEdgeStates } = useStates()

const edgeGroups = computed(() => {
  const individual: Record<string, EdgeGroup> = {}
  const summarized: Record<string, EdgeGroup> = {}
  Object.entries(edgeGroupStates.edgeGroups).forEach(([id, group]) => {
    if (Object.keys(group.edges).length > 0) {
      if (group.summarize) {
        summarized[id] = group
      } else {
        individual[id] = group
      }
    }
  })
  return { individual, summarized }
})

function getRepresentativeEdgeKey(group: EdgeGroup) {
  return Object.keys(group.edges)[0]
}
</script>

<template>
  <g class="v-ng-edge-labels">
    <template v-if="enableEdgeLabel">
      <template v-for="(group, id) in edgeGroups.individual" :key="id">
        <template v-for="(edge, edgeId) in group.edges" :key="edgeId">
          <v-edge-label-place
            :edge-id="edgeId"
            :edge="edge"
            :config="edgeConfig.label"
            :state="edgeStates[edgeId]"
          >
            <template #default="slotProps">
              <slot name="edge-label" v-bind="slotProps" />
            </template>
          </v-edge-label-place>
        </template>
      </template>
    </template>
    <template v-if="enableEdgesLabel">
      <template v-for="(group, id) in edgeGroups.summarized" :key="id">
        <v-edge-labels-place
          :edges="group.edges"
          :config="edgeConfig.label"
          :state="edgeStates[getRepresentativeEdgeKey(group)]"
          :summarize-state="summarizedEdgeStates[getRepresentativeEdgeKey(group)]"
        >
          <template #default="slotProps">
            <slot name="edges-label" v-bind="slotProps" />
          </template>
        </v-edge-labels-place>
      </template>
    </template>
  </g>
</template>

<style lang="scss">
.v-ng-edge-labels {
  .v-ng-text,
  .v-ng-text-background {
    pointer-events: none;
  }
}
</style>
