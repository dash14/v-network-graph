import { Emitter } from "mitt"
import { onUnmounted, Ref, watch } from "vue"
import { Reactive } from "@/common/common"
import { Events, PathEvent } from "@/common/types"
import { PathStates } from "@/models/path"
import { MapUtil } from "@/utils/map"
import { entriesOf } from "@/utils/object"
import {
  cleanClickState,
  ClickState,
  detectClicks,
  InteractionModes,
  PathPointerState,
  isShiftClickOnOtherKind,
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

  const pathPointerHandlers = {
    pointerup: handlePathPointerUpEvent,
    pointercancel: handlePathPointerCancelEvent,
  }

  // A pointer still pressed when the graph unmounts is released after it is gone.
  onUnmounted(() => {
    entriesOf(pathPointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
  })

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

    if (event.button == 2 /* right button */) {
      return
    }
    event.stopPropagation()

    if (!["default", "path"].includes(modes.viewMode.value)) {
      return
    }

    if (state.pointers.size == 0) {
      // Add event listeners
      modes.viewMode.value = "path"
      entriesOf(pathPointerHandlers).forEach(([ev, handler]) => {
        document.addEventListener(ev, handler)
      })
    }

    // Create new pointer state
    const pointerState: PathPointerState = {
      pointerId: event.pointerId,
      id: path,
      eventTarget: event.currentTarget,
    }
    state.pointers.set(event.pointerId, pointerState)

    emitter.emit("path:pointerdown", _makePathEventObject(path, event))
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

    if (state.pointers.size === 0) {
      // reset state
      entriesOf(pathPointerHandlers).forEach(([ev, handler]) => {
        document.removeEventListener(ev, handler)
      })
      cleanClickState(state.clicks)
      modes.viewMode.value = "default"
    }
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

    // reset state
    state.pointers.clear()
    entriesOf(pathPointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
    modes.viewMode.value = "default"
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

    if (!pathStates[path]?.clickable) {
      return
    }

    if (isShiftClickOnOtherKind(modes, "path", event)) return
    modes.selectionMode.value = "path"

    const selectable = pathStates[path].selectable
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
    if (isShiftClickOnOtherKind(modes, "path", event)) return
    if (!pathStates[path]?.clickable) {
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
