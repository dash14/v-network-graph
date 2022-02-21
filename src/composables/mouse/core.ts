import { Ref } from "vue"
import { Position } from "@/common/types"

export const MOVE_DETECTION_THRESHOLD = 3 // Sensitivity to start dragging

export type ViewMode = "default" | "node" | "edge" | "path"
export type SelectionMode = "container" | "node" | "edge" | "path"

// state for each pointer of multi touch
export interface NodePointerState {
  pointerId: number // pointer ID provided by the event
  nodeId: string // pointer down node ID
  moveCounter: number // count for pointermove event occurred
  dragBasePosition: Position // drag started position
  nodeBasePosition: Position // node position at drag started
  latestPosition: Position // latest position
}

export interface EdgePointerState {
  pointerId: number // pointer ID provided by the event
  id: string | string[] // pointer down edge ID
}

export interface PathPointerState {
  pointerId: number // pointer ID provided by the event
  id: string // pointer down path ID
}

export interface InteractionModes {
  selectionMode: Ref<SelectionMode>
  viewMode: Ref<ViewMode>
}
