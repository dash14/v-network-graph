import { watch } from "vue"
import { Emitter } from "mitt"
import { Reactive } from "@/common/common"
import { Events, EdgeEvent } from "@/common/types"
import { EdgeStates } from "@/models/edge"
import { entriesOf } from "@/utils/object"
import { MapUtil } from "@/utils/map"
import {
  cleanClickState,
  ClickState,
  createClickEvents,
  EdgePointerState,
  InteractionModes,
} from "./core"

export function makeEdgeInteractionHandlers(
  edgeStates: EdgeStates,
  modes: InteractionModes,
  hoveredEdges: Reactive<Set<string>>,
  selectedEdges: Reactive<Set<string>>,
  emitter: Emitter<Events>
) {
  const state = {
    pointers: new Map<number, EdgePointerState>(), // <PointerId, ...>
    pointerPeekCount: 0,
    clicks: new Map<number, ClickState>(),
  }

  const edgePointerHandlers = {
    pointerup: handleEdgePointerUpEvent,
    pointercancel: handleEdgePointerCancelEvent,
  }

  watch(selectedEdges, selected => {
    if (selected.size > 0 && modes.selectionMode.value !== "edge") {
      modes.selectionMode.value = "edge"
    } else if (selected.size === 0 && modes.selectionMode.value === "edge") {
      modes.selectionMode.value = "container"
    }
  })

  watch(modes.selectionMode, mode => {
    if (mode !== "edge") {
      selectedEdges.clear()
    }
  })

  function handleEdgePointerDownEvent(edge: string, event: PointerEvent) {
    if (event.button == 2 /* right button */) {
      return
    }
    event.preventDefault()
    event.stopPropagation()

    if (!["default", "edge"].includes(modes.viewMode.value)) {
      return
    }

    if (state.pointers.size == 0) {
      // Add event listeners
      modes.viewMode.value = "edge"
      entriesOf(edgePointerHandlers).forEach(([ev, handler]) => {
        document.addEventListener(ev, handler)
      })
      state.pointerPeekCount = 0
    }

    state.pointerPeekCount++

    // Create new pointer state
    const pointerState: EdgePointerState = {
      pointerId: event.pointerId,
      id: edge,
      eventTarget: event.currentTarget,
    }
    state.pointers.set(event.pointerId, pointerState)

    emitter.emit("edge:pointerdown", _makeEdgeEventObject(edge, event))
  }

  function handleEdgePointerUpEvent(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()

    const pointerState = state.pointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    state.pointers.delete(event.pointerId)

    const edge = pointerState.id
    emitter.emit("edge:pointerup", _makeEdgeEventObject(edge, event))

    // click handling
    const [clickState, clickEvent, doubleClickEvent] = createClickEvents(
      state.clicks.get(pointerState.pointerId),
      event
    )
    state.clicks.set(pointerState.pointerId, clickState)
    pointerState.eventTarget?.dispatchEvent(clickEvent)
    if (doubleClickEvent) {
      pointerState.eventTarget?.dispatchEvent(doubleClickEvent)
    }

    if (state.pointers.size === 0) {
      // reset state
      state.pointerPeekCount = 0
      entriesOf(edgePointerHandlers).forEach(([ev, handler]) => {
        document.removeEventListener(ev, handler)
      })
      cleanClickState(state.clicks)
      modes.viewMode.value = "default"
    }
  }

  function handleEdgePointerCancelEvent(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()

    const pointerState = state.pointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    for (const pointerState of state.pointers.values()) {
      const edge = pointerState.id
      emitter.emit("edge:pointerup", _makeEdgeEventObject(edge, event))
    }

    // reset state
    state.pointers.clear()
    state.pointerPeekCount = 0
    entriesOf(edgePointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
    emitter.emit("view:mode", "default")
  }

  function handleEdgeClickEvent(edge: string | string[], event: MouseEvent) {
    if (event.isTrusted) return // native event
    // When a finger is placed on any object and another object is tapped,
    // no click event is fired. Thus, click events are emulated by using
    // pointerdown/up. The following is processing for emulated events only.

    if (event.shiftKey && !["container", "edge"].includes(modes.selectionMode.value)) {
      return
    }
    modes.selectionMode.value = "edge"

    const edges = edge instanceof Array ? edge : [edge]

    const isTouchAnySelectedEdge =
      MapUtil.valueOf(state.pointers).filter(p => {
        const edges = p.id instanceof Array ? p.id : [p.id]
        return edges.every(edge => selectedEdges.has(edge))
      }).length > 0

    if (edge instanceof Array) {
      // select only selectable edge
      const selectableEdges = edges.find(edge => edgeStates[edge]?.selectable)
      if (selectableEdges) {
        if (event.shiftKey || isTouchAnySelectedEdge) {
          if (edges.some(edge => selectedEdges.has(edge))) {
            edges.forEach(edge => selectedEdges.delete(edge))
          } else {
            edges.forEach(edge => {
              const selectable = edgeStates[edge]?.selectable
              if (!(typeof selectable === "number" && selectedEdges.size >= selectable)) {
                selectedEdges.add(edge)
              }
            })
          }
        } else {
          // make the selectedEdges the clicked summarized one
          selectedEdges.clear()
          edges.forEach(edge => selectedEdges.add(edge))
        }
      }
    } else {
      const selectable = edgeStates[edge]?.selectable
      if (selectable) {
        if (event.shiftKey || isTouchAnySelectedEdge) {
          if (selectedEdges.has(edge)) {
            selectedEdges.delete(edge)
          } else if (!(typeof selectable === "number" && selectedEdges.size >= selectable)) {
            selectedEdges.add(edge)
          }
        } else {
          // make the selectedEdges the clicked one
          selectedEdges.clear()
          selectedEdges.add(edge)
        }
      }
    }
    emitter.emit("edge:click", _makeEdgeEventObject(edge, event))
  }

  function handleEdgeDoubleClickEvent(edge: string | string[], event: MouseEvent) {
    if (event.isTrusted) return // native event
    emitter.emit("edge:dblclick", _makeEdgeEventObject(edge, event))
  }

  function handleEdgePointerOverEvent(edge: string, event: PointerEvent) {
    hoveredEdges.add(edge)
    emitter.emit("edge:pointerover", _makeEdgeEventObject(edge, event))
  }

  function handleEdgePointerOutEvent(edge: string, event: PointerEvent) {
    hoveredEdges.delete(edge)
    emitter.emit("edge:pointerout", _makeEdgeEventObject(edge, event))
  }

  function handleEdgeContextMenu(edge: string, event: MouseEvent) {
    emitter.emit("edge:contextmenu", _makeEdgeEventObject(edge, event))
  }

  function handleEdgesPointerDownEvent(edges: string[], event: PointerEvent) {
    if (event.button == 2 /* right button */) {
      return
    }
    event.preventDefault()
    event.stopPropagation()

    if (!["default", "edge"].includes(modes.viewMode.value)) {
      return
    }

    if (state.pointers.size == 0) {
      // Add event listeners
      modes.viewMode.value = "edge"
      entriesOf(edgePointerHandlers).forEach(([ev, handler]) => {
        document.addEventListener(ev, handler)
      })
      state.pointerPeekCount = 0
    }

    state.pointerPeekCount++

    // Create new pointer state
    const pointerState: EdgePointerState = {
      pointerId: event.pointerId,
      id: edges,
      eventTarget: event.currentTarget,
    }
    state.pointers.set(event.pointerId, pointerState)
    emitter.emit("edge:pointerdown", _makeEdgeEventObject(edges, event))
  }

  function handleEdgesPointerOverEvent(edges: string[], event: PointerEvent) {
    edges.forEach(edge => hoveredEdges.add(edge))
    emitter.emit("edge:pointerover", _makeEdgeEventObject(edges, event))
  }

  function handleEdgesPointerOutEvent(edges: string[], event: PointerEvent) {
    edges.forEach(edge => hoveredEdges.delete(edge))
    emitter.emit("edge:pointerout", _makeEdgeEventObject(edges, event))
  }

  function handleEdgesClickEvent(edges: string[], event: MouseEvent) {
    handleEdgeClickEvent(edges, event)
  }

  function handleEdgesDoubleClickEvent(edges: string[], event: MouseEvent) {
    handleEdgeDoubleClickEvent(edges, event)
  }

  function handleEdgesContextMenu(edges: string[], event: MouseEvent) {
    emitter.emit("edge:contextmenu", _makeEdgeEventObject(edges, event))
  }

  return {
    handleEdgePointerDownEvent,
    handleEdgePointerOverEvent,
    handleEdgePointerOutEvent,
    handleEdgeClickEvent,
    handleEdgeDoubleClickEvent,
    handleEdgeContextMenu,
    handleEdgesPointerDownEvent,
    handleEdgesPointerOverEvent,
    handleEdgesPointerOutEvent,
    handleEdgesClickEvent,
    handleEdgesDoubleClickEvent,
    handleEdgesContextMenu,
  }
}

function _makeEdgeEventObject<T extends Event>(edge: string | string[], event: T): EdgeEvent<T> {
  if (edge instanceof Array) {
    return {
      edges: edge,
      event,
      summarized: true,
    }
  } else {
    return {
      edge,
      edges: [edge],
      event,
      summarized: false,
    }
  }
}
