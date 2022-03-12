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
  eventTarget: EventTarget | null // event target
}

export interface EdgePointerState {
  pointerId: number // pointer ID provided by the event
  id: string | string[] // pointer down edge ID
  eventTarget: EventTarget | null // event target
}

export interface PathPointerState {
  pointerId: number // pointer ID provided by the event
  id: string // pointer down path ID
  eventTarget: EventTarget | null // event target
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
  event: MouseEvent,
): [ClickState, MouseEvent, MouseEvent | undefined] {
  const now = Date.now()
  if (clickState && now - clickState.lastTime <= DOUBLE_CLICK_THRESHOLD) {
    // continuous clicked
    clickState.count++
    clickState.lastTime = now
  } else {
    // single clicked
    clickState = { count: 1, lastTime: now }
  }

  const initDict = {
    view: window,
    screenX: event.screenX,
    screenY: event.screenY,
    clientX: event.clientX,
    clientY: event.clientY,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
    button: event.button,
    buttons: event.buttons,
    detail: clickState.count,
  }

  let clickEvent: MouseEvent
  let doubleClickEvent: MouseEvent | undefined = undefined
  if (event instanceof PointerEvent) {
    Object.assign(initDict, {
      pointerId: event.pointerId,
      width: event.width,
      height: event.height,
      pressure: event.pressure,
      tangentialPressure: event.tangentialPressure,
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      twist: event.twist,
      pointerType: event.pointerType,
      isPrimary: event.isPrimary,
    })
    clickEvent = new PointerEvent("click", initDict)
    if (clickState.count === 2) {
      doubleClickEvent = new PointerEvent("dblclick", initDict)
    }
  } else {
    clickEvent = new MouseEvent("click", initDict)
    if (clickState.count === 2) {
      doubleClickEvent = new MouseEvent("dblclick", initDict)
    }
  }

  return [clickState, clickEvent, doubleClickEvent]
}

export function cleanClickState(states: Map<number, ClickState>) {
  const now = Date.now()
  Array.from(states.entries())
    .filter(([_, state]) => (now - state.lastTime) > DOUBLE_CLICK_THRESHOLD)
    .map(([pointerId, _]) => states.delete(pointerId))
}
