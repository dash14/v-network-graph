<script setup lang="ts">
import VTransitionGroup from "@/components/base/VTransitionGroup.vue"
import VNode, { NodeSlotProps } from "@/components/node/VNode.vue"
import { useNodeConfig } from "@/composables/config"
import { useLayouts } from "@/composables/layout"
import { useStates } from "@/composables/state"

// The root's slots come as props: forwarded as slots, they would re-render every node with the root.
defineProps<{ overrideNode?: (props: NodeSlotProps) => any }>()
const { nodeZOrderedList } = useStates()

const configs = useNodeConfig()
const layouts = useLayouts()
</script>

<template>
  <v-transition-group :name="configs.transition" class="v-ng-layer-nodes v-ng-graph-objects">
    <v-node
      v-for="nodeState in nodeZOrderedList"
      :id="nodeState.id"
      :key="nodeState.id"
      :state="nodeState"
      :pos="layouts.nodes[nodeState.id]"
      :override-node="overrideNode"
    />
  </v-transition-group>
</template>
