<script setup lang="ts">
import { computed, useSlots } from "vue"
import { useNodeConfig } from "@/composables/config"
import { useLayouts } from "@/composables/layout"
import { useStates } from "@/composables/state"
import VNode from "@/components/node/VNode.vue"

const slots = useSlots()
const hasOverrideNodeSlot = computed(() => "override-node" in slots)
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
      class="v-ng-layer-nodes"
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
          <slot name="override-node" v-bind="slotProps" />
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
      class="v-ng-layer-nodes"
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
