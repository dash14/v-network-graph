<script setup lang="ts">
import { computed, useSlots } from "vue"
import { useNodeConfig } from "@/composables/config"
import { useLayouts } from "@/composables/layout"
import { useStates } from "@/composables/state"
import { NodeState } from "@/models/node"
import VNodeLabel from "@/components/node/VNodeLabel.vue"

const slots = useSlots()
const hasOverrideNodeLabelSlot = computed(() => "override-node-label" in slots)
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
          <slot name="override-node-label" v-bind="slotProps" />
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
