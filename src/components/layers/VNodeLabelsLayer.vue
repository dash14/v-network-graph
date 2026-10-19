<script setup lang="ts">
import { computed } from "vue"
import VRenderSlot from "@/components/base/VRenderSlot"
import VNodeLabel, { NodeLabelSlotProps } from "@/components/node/VNodeLabel.vue"
import { useNodeConfig } from "@/composables/config"
import { useLayouts } from "@/composables/layout"
import { useStates } from "@/composables/state"
import { NodeState } from "@/models/node"

// The root's slots come as props: forwarded as slots, they would re-render every label with the root.
const props = defineProps<{ overrideNodeLabel?: (props: NodeLabelSlotProps) => any }>()

const hasOverrideNodeLabelSlot = computed(() => !!props.overrideNodeLabel)
const { nodeZOrderedList } = useStates()

const configs = useNodeConfig()
const layouts = useLayouts()

const nodeStates = computed(() => onlyHasDisplayLabel(nodeZOrderedList.value))

function onlyHasDisplayLabel(nodeZOrderedList: NodeState[]): NodeState[] {
  return nodeZOrderedList.filter(state => {
    return state.label.visible && (state.labelText ?? false)
  })
}
</script>

<template>
  <template v-if="hasOverrideNodeLabelSlot">
    <transition-group
      :name="configs.transition"
      :css="!!configs.transition"
      tag="g"
      class="v-ng-layer-node-labels v-ng-graph-objects"
    >
      <v-node-label
        v-for="nodeState in nodeStates"
        :id="nodeState.id"
        :key="nodeState.id"
        :state="nodeState"
        :pos="layouts.nodes[nodeState.id]"
      >
        <!-- override the node label -->
        <template #override-node-label="slotProps">
          <v-render-slot :render="overrideNodeLabel" :slot-props="slotProps" />
        </template>
      </v-node-label>
    </transition-group>
  </template>
  <template v-else>
    <transition-group
      :name="configs.transition"
      :css="!!configs.transition"
      tag="g"
      class="v-ng-layer-node-labels v-ng-graph-objects"
    >
      <v-node-label
        v-for="nodeState in nodeStates"
        :id="nodeState.id"
        :key="nodeState.id"
        :state="nodeState"
        :pos="layouts.nodes[nodeState.id]"
      />
    </transition-group>
  </template>
</template>
