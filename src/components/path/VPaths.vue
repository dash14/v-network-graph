<script setup lang="ts">
import VTransitionGroup from "@/components/base/VTransitionGroup.vue"
import { usePathConfig } from "@/composables/config"
import { useMouseOperation } from "@/composables/mouse"
import { useStates } from "@/composables/state"
import VPath from "./VPath.vue"

const { pathZOrderedList } = useStates()
const pathConfig = usePathConfig()

const {
  handlePathPointerDownEvent,
  handlePathPointerOverEvent,
  handlePathPointerOutEvent,
  handlePathClickEvent,
  handlePathDoubleClickEvent,
  handlePathContextMenu,
} = useMouseOperation()
</script>

<template>
  <v-transition-group
    :name="pathConfig.transition"
    class="v-ng-paths v-ng-layer-paths v-ng-graph-objects"
  >
    <template v-for="path in pathZOrderedList" :key="path.id">
      <v-path
        :path="path"
        @pointerdown="handlePathPointerDownEvent(path.id, $event)"
        @pointerenter.passive="handlePathPointerOverEvent(path.id, $event)"
        @pointerleave.passive="handlePathPointerOutEvent(path.id, $event)"
        @click.stop="handlePathClickEvent(path.id, $event)"
        @dblclick.stop="handlePathDoubleClickEvent(path.id, $event)"
        @contextmenu="handlePathContextMenu(path.id, $event)"
      />
    </template>
  </v-transition-group>
</template>
