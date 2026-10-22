<script setup lang="ts">
import { computed } from "vue"
import { ShapeStyle } from "@/common/configs"
import VRenderSlot from "@/components/base/VRenderSlot"
import VShape from "@/components/base/VShape.vue"
import { useMouseOperation } from "@/composables/mouse"
import { usePositionWriter } from "@/composables/positionWriter"
import { useZoomLevel } from "@/composables/zoom"
import { NodeState } from "@/models/node"

interface Props {
  id: string
  state: NodeState
  overrideNode?: (props: NodeSlotProps) => any
}

export interface NodeSlotProps {
  nodeId: string
  scale: number
  config: ShapeStyle
}

const props = withDefaults(defineProps<Props>(), {
  overrideNode: undefined,
})

const setElement = usePositionWriter().nodeRef(props.id)

const { scale } = useZoomLevel()

const classes = computed(() => ({
  draggable: props.state.draggable,
  selectable: props.state.selectable,
}))

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
    :ref="setElement"
    :class="{ 'v-ng-node': true, hover: state.hovered, selected: state.selected }"
    @pointerdown.stop="handleNodePointerDownEvent(id, $event)"
    @pointerenter.passive="handleNodePointerOverEvent(id, $event)"
    @pointerleave.passive="handleNodePointerOutEvent(id, $event)"
    @click.stop="handleNodeClickEvent(id, $event)"
    @dblclick.stop="handleNodeDoubleClickEvent(id, $event)"
    @contextmenu="handleNodeContextMenu(id, $event)"
  >
    <!-- Without the user's slot, no component is put in between. -->
    <v-render-slot
      v-if="overrideNode"
      :render="overrideNode"
      :slot-props="{ nodeId: id, scale, config: state.shape, class: classes }"
    >
      <v-shape :config="state.shape" :class="['v-ng-node-default', classes]" />
    </v-render-slot>
    <v-shape v-else :config="state.shape" :class="['v-ng-node-default', classes]" />
  </g>
</template>

<style lang="scss">
$transition: 0.1s linear;

.v-ng-node {
  :where(.v-ng-shape-circle) {
    transition:
      fill $transition,
      stroke $transition,
      stroke-width $transition,
      r $transition;
  }
  :where(.v-ng-shape-rect) {
    transition:
      fill $transition,
      stroke $transition,
      stroke-width $transition,
      x $transition,
      y $transition,
      width $transition,
      height $transition;
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
