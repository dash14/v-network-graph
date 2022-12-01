import { ComputedRef, UnwrapRef, Ref } from "vue"
import { ShapeStyle, NodeLabelStyle } from "@/common/configs"
import { Position } from "@/common/types"

export interface NodeStateDatum {
  id: string
  shape: ComputedRef<ShapeStyle>
  staticShape: ComputedRef<ShapeStyle>
  label: ComputedRef<NodeLabelStyle>
  labelText: ComputedRef<string>
  selected: boolean
  hovered: boolean
  draggable: ComputedRef<boolean>
  selectable: ComputedRef<boolean | number>
  zIndex: ComputedRef<number>
  opposingNodes: Ref<Record<string, string>>
  opposingLayouts: ComputedRef<Record<string, Position>>
}

export type NodeState = UnwrapRef<NodeStateDatum>
export type NodeStates = Record<string, NodeState>
