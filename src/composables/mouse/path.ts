import { Emitter } from "mitt"
import { onUnmounted, Ref, watch } from "vue"
import { Reactive } from "@/common/common"
import { Events, PathEvent } from "@/common/types"
import { PathStates } from "@/models/path"
import { MapUtil } from "@/utils/map"
import {
  cleanClickState,
  ClickState,
  detectClicks,
  InteractionModes,
  PathPointerState,
  isPrimaryButton,
  isMovedReleased,
  isShiftClickOnOtherKind,
  makePressListeners,
  pointersReleasedBy,
} from "./core"

export function makePathInteractionHandlers(
  pathStates: PathStates,
  modes: InteractionModes,
  hoveredPaths: Reactive<Set<string>>,
  selectedPaths: Reactive<Set<string>>,
  isInCompatibilityModeForPath: Ref<boolean>,
  emitter: Emitter<Events>
) {
  const state = {
    pointers: new Map<number, PathPointerState>(), // <PointerId, ...>
    clicks: new Map<number, ClickState>(),
  }

  function _makePathEventObject<T extends Event>(path: string, event: T): PathEvent<T> {
    if (isInCompatibilityModeForPath.value) {
      return { path: (pathStates[path]?.path ?? path) as any, event }
    } else {
      return { path, event }
    }
  }

  const pressListeners = makePressListeners(
    {
      pointermove: event => {
        if (state.pointers.has(event.pointerId) && isMovedReleased(event)) {
          endUnseenReleases([event.pointerId], event)
        }
      },
      pointerup: handlePathPointerUpEvent,
      pointercancel: handlePathPointerCancelEvent,
    },
    // Before an object ignores the press, as one does while paths are pressed.
    event => endUnseenReleases(pointersReleasedBy(state.pointers, event), event)
  )

  // A pointer still pressed when the graph unmounts is released after it is gone.
  onUnmounted(pressListeners.remove)

  watch(selectedPaths, selected => {
    if (selected.size > 0 && modes.selectionMode.value !== "path") {
      modes.selectionMode.value = "path"
    } else if (selected.size === 0 && modes.selectionMode.value === "path") {
      modes.selectionMode.value = "container"
    }
  })

  watch(modes.selectionMode, mode => {
    if (mode !== "path") {
      selectedPaths.clear()
    }
  })

  function handlePathPointerDownEvent(path: string, event: PointerEvent) {
    if (!pathStates[path]?.clickable) {
      return
    }

    if (!isPrimaryButton(event)) return
    event.stopPropagation()

    if (!["default", "path"].includes(modes.viewMode.value)) {
      return
    }

    if (state.pointers.size == 0) {
      // Add event listeners
      modes.viewMode.value = "path"
      pressListeners.add()
    }

    // Create new pointer state
    const pointerState: PathPointerState = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      id: path,
      eventTarget: event.currentTarget,
    }
    state.pointers.set(event.pointerId, pointerState)

    emitter.emit("path:pointerdown", _makePathEventObject(path, event))
  }

  /** Ends without a click the presses released where the document did not hear it. */
  function endUnseenReleases(pointerIds: number[], event: PointerEvent) {
    for (const pointerId of pointerIds) {
      const pointerState = state.pointers.get(pointerId)!
      state.pointers.delete(pointerId)
      emitter.emit("path:pointerup", _makePathEventObject(pointerState.id, event))
    }
    if (state.pointers.size === 0) endPress()
  }

  function endPress() {
    pressListeners.remove()
    cleanClickState(state.clicks)
    modes.viewMode.value = "default"
  }

  function handlePathPointerUpEvent(event: PointerEvent) {
    const pointerState = state.pointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    event.stopPropagation()

    state.pointers.delete(event.pointerId)

    const path = pointerState.id
    emitter.emit("path:pointerup", _makePathEventObject(path, event))

    // click handling
    if (!isShiftClickOnOtherKind(modes, "path", event)) {
      const [clickEvent, doubleClickEvent] = detectClicks(
        state.clicks,
        pointerState.pointerId,
        path,
        event
      )
      pointerState.eventTarget?.dispatchEvent(clickEvent)
      if (doubleClickEvent) {
        pointerState.eventTarget?.dispatchEvent(doubleClickEvent)
      }
    }

    if (state.pointers.size === 0) endPress()
  }

  function handlePathPointerCancelEvent(event: PointerEvent) {
    const pointerState = state.pointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    event.stopPropagation()

    for (const pointerState of state.pointers.values()) {
      const path = pointerState.id
      emitter.emit("path:pointerup", _makePathEventObject(path, event))
    }

    state.pointers.clear()
    endPress()
  }

  function handlePathPointerOverEvent(path: string, event: PointerEvent) {
    if (!pathStates[path]?.hoverable) {
      return
    }
    hoveredPaths.add(path)
    emitter.emit("path:pointerover", _makePathEventObject(path, event))
  }

  function handlePathPointerOutEvent(path: string, event: PointerEvent) {
    if (!pathStates[path]?.hoverable) {
      return
    }
    hoveredPaths.delete(path)
    emitter.emit("path:pointerout", _makePathEventObject(path, event))
  }

  function handlePathClickEvent(path: string, event: MouseEvent) {
    if (event.isTrusted) return // native event
    // When a finger is placed on any object and another object is tapped,
    // no click event is fired. Thus, click events are emulated by using
    // pointerdown/up. The following is processing for emulated events only.

    // A path removed while pressed is still clicked, as nodes and edges are.
    if (pathStates[path]?.clickable === false) {
      return
    }

    modes.selectionMode.value = "path"

    const selectable = pathStates[path]?.selectable
    if (selectable) {
      const isTouchAnySelectedPath =
        MapUtil.valueOf(state.pointers).filter(p => selectedPaths.has(p.id)).length > 0
      if (event.shiftKey || isTouchAnySelectedPath) {
        // select multiple nodes
        if (selectedPaths.has(path)) {
          selectedPaths.delete(path)
        } else if (!(typeof selectable === "number" && selectedPaths.size >= selectable)) {
          selectedPaths.add(path)
        }
      } else if (!selectedPaths.has(path)) {
        // make the selectedPaths the clicked one
        selectedPaths.clear()
        selectedPaths.add(path)
      }
    }
    emitter.emit("path:click", _makePathEventObject(path, event))
  }

  function handlePathDoubleClickEvent(path: string, event: MouseEvent) {
    if (event.isTrusted) return // native event
    if (pathStates[path]?.clickable === false) {
      return
    }
    emitter.emit("path:dblclick", _makePathEventObject(path, event))
  }

  function handlePathContextMenu(path: string, event: MouseEvent) {
    if (!pathStates[path]?.clickable) {
      return
    }
    event.stopPropagation()
    emitter.emit("path:contextmenu", _makePathEventObject(path, event))
  }

  return {
    handlePathPointerDownEvent,
    handlePathPointerOverEvent,
    handlePathPointerOutEvent,
    handlePathClickEvent,
    handlePathDoubleClickEvent,
    handlePathContextMenu,
  }
}
