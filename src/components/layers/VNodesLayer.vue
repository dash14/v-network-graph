<script setup lang="ts">
import { computed } from "vue"
import VRenderSlot from "@/components/base/VRenderSlot"
import VNode, { NodeSlotProps } from "@/components/node/VNode.vue"
import { useNodeConfig } from "@/composables/config"
import { useLayouts } from "@/composables/layout"
import { useStates } from "@/composables/state"

// The root's slots come as props: forwarded as slots, they would re-render every node with the root.
const props = defineProps<{ overrideNode?: (props: NodeSlotProps) => any }>()

const hasOverrideNodeSlot = computed(() => !!props.overrideNode)
const { nodeZOrderedList } = useStates()

const configs = useNodeConfig()
const layouts = useLayouts()
</script>

<template>
  <template v-if="hasOverrideNodeSlot">
    <transition-group
      :name="configs.transition"
      :css="!!configs.transition"
      tag="g"
      class="v-ng-layer-nodes v-ng-graph-objects"
    >
      <v-node
        v-for="nodeState in nodeZOrderedList"
        :id="nodeState.id"
        :key="nodeState.id"
        :state="nodeState"
        :pos="layouts.nodes[nodeState.id]"
      >
        <!-- override the node -->
        <template #override-node="slotProps">
          <v-render-slot :render="overrideNode" :slot-props="slotProps" />
        </template>
      </v-node>
    </transition-group>
  </template>
  <template v-else>
    <!--
      If a `v-node` contains a slot and no external slot is specified,
      `v-ng-layer-nodes` element will be needlessly redrawn and all
      `v-node` components get update notifications. Therefore, if there is
      no external slot, do not specify a slot in the `v-node` component. -->
    <transition-group
      :name="configs.transition"
      :css="!!configs.transition"
      tag="g"
      class="v-ng-layer-nodes v-ng-graph-objects"
    >
      <v-node
        v-for="nodeState in nodeZOrderedList"
        :id="nodeState.id"
        :key="nodeState.id"
        :state="nodeState"
        :pos="layouts.nodes[nodeState.id]"
      />
    </transition-group>
  </template>
</template>
