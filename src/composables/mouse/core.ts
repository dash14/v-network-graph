import { Ref } from "vue"
import { Position } from "@/common/types"

export const MOVE_DETECTION_THRESHOLD = 3 // Sensitivity to start dragging
export const DOUBLE_CLICK_THRESHOLD = 500

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

export interface ClickState {
  lastTime: number
  count: number
}

export interface InteractionModes {
  selectionMode: Ref<SelectionMode>
  viewMode: Ref<ViewMode>
}

export function createClickEvents(
  clickState: ClickState | undefined,
  event: PointerEvent
): [ClickState, MouseEvent, MouseEvent | undefined] {
  const now = Date.now()
  if (clickState && now - clickState.lastTime < DOUBLE_CLICK_THRESHOLD) {
    // continuous clicked
    clickState.count++
    clickState.lastTime = now
  } else {
    // single clicked
    clickState = { count: 1, lastTime: now }
  }

  // create MouseEvent object for "click" event
  const fields: [string, any][] = []
  for (const k in event) {
    const v = (event as any)[k]
    if (typeof v !== "function" && typeof v !== "object") {
      fields.push([k, v])
    }
  }
  fields.push(["detail", clickState.count])
  const initDict = Object.fromEntries(fields)
  const clickEvent = new MouseEvent("click", initDict)

  // create MouseEvent object for "dblclick" event
  let doubleClickEvent = undefined
  if (clickState.count === 2) {
    doubleClickEvent = new MouseEvent("dblclick", initDict)
  }

  return [clickState, clickEvent, doubleClickEvent]
}
