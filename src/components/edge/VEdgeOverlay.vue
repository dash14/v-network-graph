<script setup lang="ts">
import { computed } from "vue"
import { Config, StrokeStyle } from "@/common/configs"
import { Edge, EdgePosition, Edges, LinePosition, Point } from "@/common/types"
import { useEdgeConfig } from "@/composables/config"
import { useSummarizedEdgesState } from "@/composables/state"
import { useZoomLevel } from "@/composables/zoom"
import { EdgeState } from "@/models/edge"
import { edgeLengthOf, pointAlongEdge } from "@/modules/edge/geometry"

interface Props {
  edgeId?: string
  edge?: Edge
  edges?: Edges
  state: EdgeState
  isSummarized: boolean
}

interface BaseEdgeSlotProps {
  edges: Edges
  stroke: StrokeStyle
  position: EdgePosition
  center: Point
  hovered: boolean
  selected: boolean
  scale: number
  length: number
  pointAtLength: (distance: number) => Point
}

interface SingleEdgeSlotProps {
  isSummarized: false
  edgeId: string
  edge: Edge
}

interface SummarizedEdgeSlotProps {
  isSummarized: true
}

export type EdgeOverlaySlotProps = BaseEdgeSlotProps &
  (SingleEdgeSlotProps | SummarizedEdgeSlotProps)

defineSlots<{ default: (props: EdgeOverlaySlotProps) => any }>()

const props = withDefaults(defineProps<Props>(), {
  edgeId: undefined,
  edge: undefined,
  edges: () => ({}),
})

const { scale } = useZoomLevel()
const edgeConfig = useEdgeConfig()
const { hovered: summarizedHovered, selected: summarizedSelected } = useSummarizedEdgesState(
  () => props.edges
)

const stroke = computed(() =>
  props.isSummarized
    ? Config.values(edgeConfig.summarized.stroke, props.edges)
    : props.state.line.stroke
)

function toEdgePosition(line: LinePosition): EdgePosition {
  return { source: line.p1, target: line.p2 }
}

function calculateCenterPoint(state: EdgeState): Point {
  if (state.curve) {
    return state.curve.center
  } else {
    const p1 = state.origin.p1
    const p2 = state.origin.p2
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    }
  }
}

// Summarized edges are drawn as a straight line, even between the ends of a self-loop.
const drawnEdge = computed(() =>
  props.isSummarized ? { position: props.state.position } : props.state
)

const position = computed(() => toEdgePosition(props.state.origin))
const center = computed(() => calculateCenterPoint(props.state))
const length = computed(() => edgeLengthOf(drawnEdge.value))

function calculatePointAtLength(distance: number): Point {
  if (Number.isNaN(distance)) return props.state.position.p1
  return pointAlongEdge(drawnEdge.value, distance)
}
</script>

<template>
  <g class="v-ng-edge-overlay">
    <slot
      v-if="isSummarized"
      :edges="edges"
      :is-summarized="isSummarized"
      :stroke="stroke"
      :position="position"
      :center="center"
      :hovered="summarizedHovered"
      :selected="summarizedSelected"
      :scale="scale"
      :length="length"
      :point-at-length="calculatePointAtLength"
    />
    <slot
      v-else
      :edge-id="edgeId!"
      :edge="edge!"
      :edges="{ [edgeId!]: edge! }"
      :is-summarized="isSummarized"
      :stroke="stroke"
      :position="position"
      :center="center"
      :hovered="state.hovered"
      :selected="state.selected"
      :scale="scale"
      :length="length"
      :point-at-length="calculatePointAtLength"
    />
  </g>
</template>
