<script setup lang="ts">
import { computed } from "vue"
import { Position } from "@/common/types"
import { NodeState } from "@/models/node"
import { useMouseOperation } from "@/composables/mouse"
import { useZoomLevel } from "@/composables/zoom"
import VShape from "@/components/base/VShape.vue"

interface Props {
  id: string
  state: NodeState
  pos?: Position
}

const props = withDefaults(defineProps<Props>(), {
  pos: undefined,
})

const x = computed(() => props.pos?.x || 0)
const y = computed(() => props.pos?.y || 0)

const { scale } = useZoomLevel()

const {
  handleNodePointerDownEvent,
  handleNodePointerOverEvent,
  handleNodePointerOutEvent,
  handleNodeClickEvent,
  handleNodeDoubleClickEvent,
  handleNodeContextMenu,
} = useMouseOperation()
</script>

<template>
  <g
    :class="{ 'v-ng-node': true, hover: state.hovered, selected: state.selected }"
    :transform="`translate(${x} ${y})`"
    @pointerdown.stop="handleNodePointerDownEvent(id, $event)"
    @pointerenter.passive="handleNodePointerOverEvent(id, $event)"
    @pointerleave.passive="handleNodePointerOutEvent(id, $event)"
    @click.stop="handleNodeClickEvent(id, $event)"
    @dblclick.stop="handleNodeDoubleClickEvent(id, $event)"
    @contextmenu="handleNodeContextMenu(id, $event)"
  >
    <slot
      name="override-node"
      :node-id="id"
      :scale="scale"
      :config="state.shape"
      :class="{ draggable: state.draggable, selectable: state.selectable }"
    >
      <v-shape
        :config="state.shape"
        :class="{
          'v-ng-node-default': true,
          draggable: state.draggable,
          selectable: state.selectable,
        }"
      />
    </slot>
  </g>
</template>

<style lang="scss">
$transition: 0.1s linear;

.v-ng-node {
  :where(.v-ng-shape-circle) {
    transition: fill $transition, stroke $transition, stroke-width $transition, r $transition;
  }
  :where(.v-ng-shape-rect) {
    transition: fill $transition, stroke $transition, stroke-width $transition, x $transition,
      y $transition, width $transition, height $transition;
  }

  :where(.v-ng-node-default.v-ng-shape-circle) {
    pointer-events: none;
  }
  :where(.v-ng-node-default.v-ng-shape-rect) {
    pointer-events: none;
  }

  .draggable,
  .selectable {
    pointer-events: all;
    cursor: pointer;
  }
}
</style>
