import { ComputedRef, UnwrapRef } from "vue"
import { Edge, Path } from "@/common/types"
import { VectorLine } from "@/modules/calculation/line"
import { Arc, Curve } from "@/models/edge"

export interface EdgeObject {
  edgeId: string
  edge: Edge
}

export interface PathStateDatum {
  id: string
  selected: boolean
  hovered: boolean
  selectable: ComputedRef<boolean | number>
  zIndex: ComputedRef<number>

  clickable: ComputedRef<boolean>
  hoverable: ComputedRef<boolean>
  path: Path
  edges: ComputedRef<EdgeObject[]>
}

export type PathState = UnwrapRef<PathStateDatum>
export type PathStates = Record<string, PathState>

export interface EdgeLine {
  edgeId: string
  source: string
  target: string
  line: VectorLine
  direction: boolean
  curve?: Curve
  loop?: Arc
}
