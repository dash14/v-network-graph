import { ComputedRef, UnwrapRef } from "vue"
import { ShapeStyle, NodeLabelStyle } from "@/common/configs"

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
}

export type NodeState = UnwrapRef<NodeStateDatum>
export type NodeStates = Record<string, NodeState>
