import { Ref } from "vue"
import { Reactive } from "@/common/common"
import { Events, PathEvent } from "@/common/types"
import { PathStates } from "@/models/path"
import { InteractionState, PathPointerState } from "./core"
import { entriesOf } from "@/utils/object"
import { MapUtil } from "@/utils/map"
import { Emitter } from "mitt"

export function makePathInteractionHandlers(
  pathStates: PathStates,
  state: InteractionState,
  selectedNodes: Reactive<Set<string>>,
  selectedEdges: Reactive<Set<string>>,
  selectedPaths: Reactive<Set<string>>,
  isInCompatibilityModeForPath: Ref<boolean>,
  emitter: Emitter<Events>
) {
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

  function handlePathPointerDownEvent(path: string, event: PointerEvent) {
    if (!pathStates[path]?.clickable) {
      return
    }

    if (event.button == 2 /* right button */) {
      return
    }
    event.preventDefault()
    event.stopPropagation()

    if (state.nodePointers.size !== 0) {
      return
    }

    if (state.edgePointers.size !== 0) {
      return
    }

    if (state.pathPointers.size == 0) {
      // Add event listeners
      emitter.emit("view:mode", "path")
      entriesOf(pathPointerHandlers).forEach(([ev, handler]) => {
        document.addEventListener(ev, handler)
      })
      state.pathPointerPeekCount = 0
    }

    state.pathPointerPeekCount++

    // Create new pointer state
    const pointerState: PathPointerState = {
      pointerId: event.pointerId,
      id: path,
    }
    state.pathPointers.set(event.pointerId, pointerState)

    emitter.emit("path:pointerdown", _makePathEventObject(path, event))
  }

  function handlePathPointerUpEvent(event: PointerEvent) {
    const pointerState = state.pathPointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    state.pathPointers.delete(event.pointerId)

    const path = pointerState.id
    emitter.emit("path:pointerup", _makePathEventObject(path, event))

    if (state.pathPointers.size === 0) {
      // reset state
      state.pathPointerPeekCount = 0
      entriesOf(pathPointerHandlers).forEach(([ev, handler]) => {
        document.removeEventListener(ev, handler)
      })
      emitter.emit("view:mode", "default")
    }
  }

  function handlePathPointerCancelEvent(event: PointerEvent) {
    const pointerState = state.pathPointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    for (const pointerState of state.pathPointers.values()) {
      const path = pointerState.id
      emitter.emit("path:pointerup", _makePathEventObject(path, event))
    }

    // reset state
    state.pathPointers.clear()
    state.pathPointerPeekCount = 0
    entriesOf(pathPointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
    emitter.emit("view:mode", "default")
  }

  function handlePathPointerOverEvent(path: string, event: PointerEvent) {
    if (!pathStates[path]?.hoverable) {
      return
    }
    state.hoveredPaths.add(path)
    emitter.emit("path:pointerover", _makePathEventObject(path, event))
  }

  function handlePathPointerOutEvent(path: string, event: PointerEvent) {
    if (!pathStates[path]?.hoverable) {
      return
    }
    state.hoveredPaths.delete(path)
    emitter.emit("path:pointerout", _makePathEventObject(path, event))
  }

  function handlePathClickEvent(path: string, event: MouseEvent) {
    if (!pathStates[path]?.clickable) {
      return
    }
    if (state.pathPointers.size > 0 || state.pathPointerPeekCount > 0) {
      return // ignore
    }

    // TODO: check mode
    if (event.shiftKey && selectedNodes.size > 0) {
      return
    }
    selectedNodes.clear()
    selectedEdges.clear()

    const selectable = pathStates[path]?.selectable ?? false
    if (selectable) {
      const isTouchAnySelectedPath =
        MapUtil.valueOf(state.pathPointers).filter(p => selectedPaths.has(p.id)).length > 0
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
