import { ComputedRef, UnwrapRef } from "vue"
import { Edge, Path } from "@/common/types"
import { VectorLine } from "@/modules/calculation/line"
import { Curve } from "@/models/edge"

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

  path: Path
  edges: ComputedRef<EdgeObject[]>
}

export type PathState = UnwrapRef<PathStateDatum>

export interface EdgeLine {
  edgeId: string
  source: string
  target: string
  line: VectorLine
  curve?: Curve
}
