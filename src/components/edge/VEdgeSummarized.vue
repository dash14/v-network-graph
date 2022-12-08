<script setup lang="ts">
import { computed, ref, watchEffect } from "vue"
import { Edges, NodePositions, LinePosition, Position } from "@/common/types"
import { Config } from "@/common/configs"
import { useEdgeConfig } from "@/composables/config"
import { useStates } from "@/composables/state"
import { useMouseOperation } from "@/composables/mouse"
import VLine from "@/components/base/VLine.vue"
import VShape from "@/components/base/VShape.vue"
import VText from "@/components/base/VLabelText.vue"

const props = defineProps<{
  edges: Edges
  layouts: NodePositions
}>()

const config = useEdgeConfig()
const {
  handleEdgesPointerDownEvent,
  handleEdgesPointerOverEvent,
  handleEdgesPointerOutEvent,
  handleEdgesClickEvent,
  handleEdgesDoubleClickEvent,
  handleEdgesContextMenu,
} = useMouseOperation()

const { edgeStates } = useStates()

// Since the specified edges are in the same pair,
// get the first one and draw it.
const pos = ref<LinePosition>({ p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } })
const centerPos = ref<Position>({ x: 0, y: 0 })

watchEffect(() => {
  const edgeId = Object.keys(props.edges).find(edgeId => edgeId in edgeStates)
  if (edgeId) {
    pos.value = edgeStates[edgeId].position
    centerPos.value = {
      x: (pos.value.p1.x + pos.value.p2.x) / 2,
      y: (pos.value.p1.y + pos.value.p2.y) / 2,
    }
  }
})

const edgeIds = computed(() => Object.keys(props.edges))
const labelConfig = computed(() => Config.values(config.summarized.label, props.edges))
const shapeConfig = computed(() => Config.values(config.summarized.shape, props.edges))
const strokeConfig = computed(() => Config.values(config.summarized.stroke, props.edges))

const hovered = computed(() => edgeIds.value.some(edge => edgeStates[edge].hovered))
const selectable = computed(() => edgeIds.value.some(edge => edgeStates[edge].selectable))
const selected = computed(() => edgeIds.value.some(edge => edgeStates[edge].selected))
</script>

<template>
  <g
    :class="{ 'v-ng-line-summarized': true, hovered, selectable, selected }"
    @pointerdown.stop="handleEdgesPointerDownEvent(edgeIds, $event)"
    @pointerenter.passive="handleEdgesPointerOverEvent(edgeIds, $event)"
    @pointerleave.passive="handleEdgesPointerOutEvent(edgeIds, $event)"
    @click.stop="handleEdgesClickEvent(edgeIds, $event)"
    @dblclick.stop="handleEdgesDoubleClickEvent(edgeIds, $event)"
    @contextmenu="handleEdgesContextMenu(edgeIds, $event)"
  >
    <v-line v-bind="pos" :config="strokeConfig" :data-edge-id="edgeIds[0]" />
    <v-shape :base-x="centerPos.x" :base-y="centerPos.y" :config="shapeConfig" />
    <v-text
      :text="Object.keys(edges).length.toString()"
      :x="centerPos.x"
      :y="centerPos.y"
      :config="labelConfig"
      text-anchor="middle"
      dominant-baseline="central"
    />
  </g>
</template>

<style lang="scss">
.v-ng-line-summarized {
  &.selectable {
    cursor: pointer;
  }
}
</style>
