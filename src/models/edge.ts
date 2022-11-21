import { ComputedRef, Ref, UnwrapRef , WatchStopHandle } from "vue"
import { MarkerStyle , StrokeStyle } from "@/common/configs"
import { Edge, Edges , LinePosition, Position } from "@/common/types"
import { Vector2D } from "@/modules/vector2d"

export interface EdgeLayoutPoint {
  edge: Edge
  pointInGroup: number
  groupWidth: number
}

export interface EdgeGroup {
  edges: Edges
  groupWidth: number
  summarize: boolean
}

export interface EdgeGroupStates {
  edgeLayoutPoints: Record<string, EdgeLayoutPoint>
  edgeGroups: Record<string, EdgeGroup>
  summarizedEdges: Record<string, true>
}

// States of edges
export interface Line {
  stroke: StrokeStyle
  normalWidth: number // stroke width when not hovered
  source: MarkerStyle
  target: MarkerStyle
}

export interface Curve {
  center: Vector2D
  theta: number // theta: direction of source to center
  circle: {
    center: Vector2D
    radius: number
  }
  control: Position[]
}

export interface Arc {
  center: Vector2D
  radius: [number, number]
  isLargeArc: boolean
  isClockwise: boolean
}

export interface EdgeStateDatum {
  id: string
  line: Ref<Line>
  selectable: ComputedRef<boolean | number>
  selected: boolean
  hovered: boolean
  origin: LinePosition // line segment between center of nodes
  labelPosition: LinePosition // line segment between the outermost of the nodes for labels
  position: LinePosition // line segments to be displayed with margins applied
  curve?: Curve
  loop?: Arc
  sourceMarkerId?: string
  targetMarkerId?: string
  zIndex: ComputedRef<number>
  stopWatchHandle: WatchStopHandle
}

interface SummarizedEdgeStateDatum {
  stroke: Ref<StrokeStyle>
}

export type EdgeState = UnwrapRef<EdgeStateDatum>
export type EdgeStates = Record<string, EdgeState>
export type SummarizedEdgeState = UnwrapRef<SummarizedEdgeStateDatum>
export type SummarizedEdgeStates = Record<string, SummarizedEdgeState>

// Edge item for display (an edge or summarized edges)
export interface EdgeItem {
  id: string
  summarized: boolean
  key: string
  zIndex: number
}

export interface SummarizedEdgeItem extends EdgeItem {
  group: EdgeGroup
}

export interface SingleEdgeItem extends EdgeItem {
  edge: Edge
}

export type EdgeEntry = SummarizedEdgeItem | SingleEdgeItem
