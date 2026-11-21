<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watchEffect } from "vue"
import { Config } from "@/common/configs"
import { Edges, NodePositions, LinePosition, Position } from "@/common/types"
import VText from "@/components/base/VLabelText.vue"
import VLine from "@/components/base/VLine.vue"
import VShape from "@/components/base/VShape.vue"
import { useEdgeConfig } from "@/composables/config"
import { useMarker } from "@/composables/marker"
import { useMouseOperation } from "@/composables/mouse"
import { drawnStateOf, useStates, useSummarizedEdgesState } from "@/composables/state"
import { Arc } from "@/models/edge"
import { loopApexOf } from "@/modules/edge/geometry"

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

const { edgeStates, markers } = useStates()

// Since the specified edges are in the same pair,
// get the first one and draw it.
const pos = ref<LinePosition>({ p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } })
const loop = shallowRef<Arc>()
const centerPos = ref<Position>({ x: 0, y: 0 })

watchEffect(() => {
  const state = drawnStateOf(edgeStates, props.edges)
  // drawnStateOf finds none only for a group drawn ahead of the states, which are made before it.
  /* v8 ignore else */
  if (state) {
    pos.value = state.position
    loop.value = state.loop
    // The far side of a loop from the node, which its ends, moved by the markers, do not shift.
    centerPos.value = state.loop
      ? loopApexOf(state.loop, state.origin.p1)
      : {
          x: (pos.value.p1.x + pos.value.p2.x) / 2,
          y: (pos.value.p1.y + pos.value.p2.y) / 2,
        }
  }
})

const edgeIds = computed(() => Object.keys(props.edges))
const labelConfig = computed(() => Config.values(config.summarized.label, props.edges))
const shapeConfig = computed(() => Config.values(config.summarized.shape, props.edges))
const strokeConfig = computed(() => Config.values(config.summarized.stroke, props.edges))

const { hovered, selectable, selected } = useSummarizedEdgesState(() => props.edges)

const { makeMarker, clearMarker } = useMarker(markers.state)
// Kept out of the effect's dependencies, as the effect replaces them.
let madeMarkers: { source?: string; target?: string } = {}
const markerIds = shallowRef(madeMarkers)
watchEffect(() => {
  const stroke = strokeConfig.value
  const marker = config.summarized.marker
  // The drawn edge is the first one, as the states are made before the group is drawn.
  const source = Config.values(marker.source, [props.edges, stroke])
  const target = Config.values(marker.target, [props.edges, stroke])
  const { instanceId } = markers
  const previous = madeMarkers
  madeMarkers = {
    source: makeMarker(source, true, previous.source, stroke.color, instanceId),
    target: makeMarker(target, false, previous.target, stroke.color, instanceId),
  }
  if (madeMarkers.source !== previous.source || madeMarkers.target !== previous.target) {
    markerIds.value = madeMarkers
  }
})
onUnmounted(() => {
  clearMarker(madeMarkers.source)
  clearMarker(madeMarkers.target)
})
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
    <v-line
      v-bind="pos"
      :loop="loop"
      :config="strokeConfig"
      :marker-start="markerIds.source"
      :marker-end="markerIds.target"
      :data-edge-id="edgeIds[0]"
    />
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
