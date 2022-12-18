<script setup lang="ts">
import { useNodeConfig } from "@/composables/config"
import { useLayouts } from "@/composables/layout"
import { useStates } from "@/composables/state"
import VNodeLabel from "@/components/node/VNodeLabel.vue"

const { nodeZOrderedList } = useStates()

const configs = useNodeConfig()
const layouts = useLayouts()

</script>

<template>
  <transition-group
    :name="configs.transition"
    :css="!!configs.transition"
    tag="g"
    class="v-ng-layer-node-labels"
  >
    <template v-for="nodeState in nodeZOrderedList" :key="nodeState.id">
      <v-node-label
        v-if="nodeState.label.visible && (nodeState.labelText ?? false)"
        :id="nodeState.id"
        :state="nodeState"
        :pos="layouts.nodes[nodeState.id]"
      >
        <!-- override the node label -->
        <template #override-node-label="slotProps">
          <slot name="override-node-label" v-bind="slotProps" />
        </template>
      </v-node-label>
    </template>
  </transition-group>
</template>
