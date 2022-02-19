import { Reactive } from "@/common/common"
import { Position } from "@/common/types"

export const MOVE_DETECTION_THRESHOLD = 3 // Sensitivity to start dragging

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

export interface InteractionState {
  container: {
    moveCounter: number
    pointerCounter: number
    allowClickEvent: boolean
  }
  nodePointers: Map<number, NodePointerState> // <PointerId, ...>
  prevNodePointers: Map<number, NodePointerState> // <PointerId, ...>
  follow: {
    followedPointerId: number
    nodeBasePositions: { [name: string]: Position }
  }
  hoveredNodes: Reactive<Set<string>>
  hoveredNodesPre: Set<string> // to keep the hover state while dragging
  hoveredEdges: Reactive<Set<string>>
  hoveredPaths: Reactive<Set<string>>
  edgePointers: Map<number, EdgePointerState> // <PointerId, ...>
  edgePointerPeekCount: number
  pathPointers: Map<number, PathPointerState> // <PointerId, ...>
  pathPointerPeekCount: number
}
