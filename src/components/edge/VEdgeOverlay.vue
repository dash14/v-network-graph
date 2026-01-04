<script setup lang="ts">
import { Edge, EdgePosition, Edges, LinePosition, Point } from "@/common/types"
import { EdgeState } from "@/models/edge"
import { useZoomLevel } from "@/composables/zoom"
import { useContainers } from "@/composables/container"
import { Config, StrokeStyle } from "@/common/configs"
import { useEdgeConfig } from "@/composables/config"

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

const { svg } = useContainers()
const { scale } = useZoomLevel()
const edgeConfig = useEdgeConfig()

function getStrokeConfig() {
  if (props.isSummarized) {
    return Config.values(edgeConfig.summarized.stroke, props.edges)
  } else {
    return props.state.line.stroke
  }
}

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

function getPathTotalLength() {
  if (!svg.value) return 0
  const edgeId = props.edgeId ?? Object.keys(props.edges)[0]
  const path = svg.value.querySelector<SVGPathElement>(`path[data-edge-id="${edgeId}"]`)
  if (!path) return 0
  return path.getTotalLength()
}

function calculatePointAtLength(distance: number): Point {
  if (!svg.value || !isFinite(distance)) return props.state.position.p1

  // for detecting changes and re-calculation
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  props.state

  const edgeId = props.edgeId ?? Object.keys(props.edges)[0]

  const path = svg.value.querySelector<SVGPathElement>(`path[data-edge-id="${edgeId}"]`)
  if (!path) return props.state.position.p1

  const p = path.getPointAtLength(distance)
  return { x: p.x, y: p.y }
}
</script>

<template>
  <g class="v-ng-edge-overlay">
    <slot
      v-if="isSummarized"
      :edges="edges"
      :is-summarized="isSummarized"
      :stroke="getStrokeConfig()"
      :position="toEdgePosition(state.origin)"
      :center="calculateCenterPoint(state)"
      :hovered="state.hovered"
      :selected="state.selected"
      :scale="scale"
      :length="getPathTotalLength()"
      :point-at-length="calculatePointAtLength"
    />
    <slot
      v-else
      :edge-id="edgeId!"
      :edge="edge!"
      :edges="{ [edgeId!]: edge! }"
      :is-summarized="isSummarized"
      :stroke="getStrokeConfig()"
      :position="toEdgePosition(state.origin)"
      :center="calculateCenterPoint(state)"
      :hovered="state.hovered"
      :selected="state.selected"
      :scale="scale"
      :length="getPathTotalLength()"
      :point-at-length="calculatePointAtLength"
    />
  </g>
</template>
