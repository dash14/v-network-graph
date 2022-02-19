import { Ref, watch } from "vue"
import { Reactive } from "@/common/common"
import { Events, PathEvent } from "@/common/types"
import { PathStates } from "@/models/path"
import { InteractionModes, PathPointerState } from "./core"
import { entriesOf } from "@/utils/object"
import { MapUtil } from "@/utils/map"
import { Emitter } from "mitt"

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
    pointerPeekCount: 0,
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
    event.preventDefault()
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
      state.pointerPeekCount = 0
    }

    state.pointerPeekCount++

    // Create new pointer state
    const pointerState: PathPointerState = {
      pointerId: event.pointerId,
      id: path,
    }
    state.pointers.set(event.pointerId, pointerState)

    emitter.emit("path:pointerdown", _makePathEventObject(path, event))
  }

  function handlePathPointerUpEvent(event: PointerEvent) {
    const pointerState = state.pointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    state.pointers.delete(event.pointerId)

    const path = pointerState.id
    emitter.emit("path:pointerup", _makePathEventObject(path, event))

    if (state.pointers.size === 0) {
      // reset state
      state.pointerPeekCount = 0
      entriesOf(pathPointerHandlers).forEach(([ev, handler]) => {
        document.removeEventListener(ev, handler)
      })
      modes.viewMode.value = "default"
    }
  }

  function handlePathPointerCancelEvent(event: PointerEvent) {
    const pointerState = state.pointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    for (const pointerState of state.pointers.values()) {
      const path = pointerState.id
      emitter.emit("path:pointerup", _makePathEventObject(path, event))
    }

    // reset state
    state.pointers.clear()
    state.pointerPeekCount = 0
    entriesOf(pathPointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
    emitter.emit("view:mode", "default")
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
    if (!pathStates[path]?.clickable) {
      return
    }
    if (state.pointers.size > 0 || state.pointerPeekCount > 0) {
      return // ignore
    }

    if (event.shiftKey && !["container", "path"].includes(modes.selectionMode.value)) {
      return
    }
    modes.selectionMode.value = "path"

    const selectable = pathStates[path]?.selectable ?? false
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
    if (!pathStates[path]?.clickable) {
      return
    }
    emitter.emit("path:dblclick", _makePathEventObject(path, event))
  }

  function handlePathContextMenu(path: string, event: PointerEvent) {
    if (!pathStates[path]?.clickable) {
      return
    }
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
