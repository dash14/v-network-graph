<script setup lang="ts">
import { computed } from "vue"
import VTransitionGroup from "@/components/base/VTransitionGroup.vue"
import VNodeLabel, { NodeLabelSlotProps } from "@/components/node/VNodeLabel.vue"
import { useNodeConfig } from "@/composables/config"
import { useStates } from "@/composables/state"
import { NodeState } from "@/models/node"

// The root's slots come as props: forwarded as slots, they would re-render every label with the root.
defineProps<{ overrideNodeLabel?: (props: NodeLabelSlotProps) => any }>()
const { nodeZOrderedList } = useStates()

const configs = useNodeConfig()

const nodeStates = computed(() => onlyHasDisplayLabel(nodeZOrderedList.value))

function onlyHasDisplayLabel(nodeZOrderedList: NodeState[]): NodeState[] {
  return nodeZOrderedList.filter(state => {
    return state.label.visible && (state.labelText ?? false)
  })
}
</script>

<template>
  <v-transition-group :name="configs.transition" class="v-ng-layer-node-labels v-ng-graph-objects">
    <v-node-label
      v-for="nodeState in nodeStates"
      :id="nodeState.id"
      :key="nodeState.id"
      :state="nodeState"
      :override-node-label="overrideNodeLabel"
    />
  </v-transition-group>
</template>
