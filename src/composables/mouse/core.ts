import { Ref } from "vue"
import { Position, ViewMode } from "@/common/types"

const MOUSE_MOVE_DETECTION_THRESHOLD = 3 // Sensitivity to start dragging
const TOUCH_MOVE_DETECTION_THRESHOLD = 6 // Sensitivity to start dragging in touches
export const DOUBLE_CLICK_THRESHOLD = 500

export type SelectionMode = "container" | "node" | "edge" | "path"

// state for each pointer of multi touch
export interface NodePointerState {
  pointerId: number // pointer ID provided by the event
  nodeId: string // pointer down node ID
  moveCounter: number // count for pointermove event occurred
  isDragging: boolean // whether node:dragstart was emitted for the press
  dragBasePosition: Position // drag started position
  nodeBasePosition: Position // node position at drag started
  latestPosition: Position // latest position
  draggedPosition: Position // position of the last pointermove emitted
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
  id: string // clicked object ID
}

export interface InteractionModes {
  selectionMode: Ref<SelectionMode>
  viewMode: Ref<ViewMode>
  isMultipleSelectable: Ref<boolean> // whether the selection may have more than one
}

/**
 * A click with the shift key adds to a selection that allows more than one, so it ignores another
 * kind than the one selected.
 */
export function isShiftClickOnOtherKind(
  modes: InteractionModes,
  kind: SelectionMode,
  event: MouseEvent
): boolean {
  return event.shiftKey && modes.isMultipleSelectable.value && modes.selectionMode.value !== kind
}

/**
 * Only the primary button makes a click, like a native one. Touches and pen tips are primary too.
 */
export function isPrimaryButton(event: PointerEvent): boolean {
  return event.button === 0
}

export function getPointerMoveDetectionThreshold(type: string): number {
  return type === "touch" ? TOUCH_MOVE_DETECTION_THRESHOLD : MOUSE_MOVE_DETECTION_THRESHOLD
}

export function detectClicks(
  clickStates: Map<number, ClickState>,
  pointerId: number,
  id: string,
  event: PointerEvent
): [PointerEvent, PointerEvent | undefined] {
  // search click states
  let clickState = clickStates.get(pointerId)
  if (clickState) {
    if (clickState.id !== id) {
      // click an other object
      clickState = undefined
    }
  } else {
    const idAndState = Array.from(clickStates.entries()).find(([_, state]) => state.id === id)
    if (idAndState) {
      const [oldPointerId, state] = idAndState
      clickStates.delete(oldPointerId)
      clickState = state
    }
  }

  let clickEvent: PointerEvent, doubleClickEvent: PointerEvent | undefined
  ;[clickState, clickEvent, doubleClickEvent] = createClickEvents(clickState, event, id)

  // update
  clickStates.set(pointerId, clickState)

  return [clickEvent, doubleClickEvent]
}

export function createClickEvents(
  clickState: ClickState | undefined,
  event: PointerEvent,
  id: string
): [ClickState, PointerEvent, PointerEvent | undefined] {
  const now = Date.now()
  if (clickState && now - clickState.lastTime <= DOUBLE_CLICK_THRESHOLD) {
    // continuous clicked
    clickState.count++
    clickState.lastTime = now
  } else {
    // single clicked
    clickState = { count: 1, lastTime: now, id }
  }

  const initDict: PointerEventInit = {
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
  }
  const clickEvent = new PointerEvent("click", initDict)
  const doubleClickEvent =
    clickState.count === 2 ? new PointerEvent("dblclick", initDict) : undefined

  return [clickState, clickEvent, doubleClickEvent]
}

export function cleanClickState(states: Map<number, ClickState>) {
  const now = Date.now()
  Array.from(states.entries())
    .filter(([_, state]) => now - state.lastTime > DOUBLE_CLICK_THRESHOLD)
    .map(([pointerId, _]) => states.delete(pointerId))
}
