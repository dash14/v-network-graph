import { Emitter } from "mitt"
import { onUnmounted, watch } from "vue"
import { Reactive } from "@/common/common"
import { Events, EdgeEvent } from "@/common/types"
import { selectableEdgesOf } from "@/composables/edgeState"
import { EdgeStates } from "@/models/edge"
import { MapUtil } from "@/utils/map"
import { entriesOf } from "@/utils/object"
import {
  cleanClickState,
  ClickState,
  detectClicks,
  EdgePointerState,
  InteractionModes,
  isShiftClickOnOtherKind,
  isPrimaryButton,
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
    clicks: new Map<number, ClickState>(),
  }

  const edgePointerHandlers = {
    pointerup: handleEdgePointerUpEvent,
    pointercancel: handleEdgePointerCancelEvent,
  }

  // A pointer still pressed when the graph unmounts is released after it is gone.
  onUnmounted(() => {
    entriesOf(edgePointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
  })

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

  function handleEdgePointerDownEvent(edge: string | string[], event: PointerEvent) {
    if (!isPrimaryButton(event)) return
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
    }

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
    event.stopPropagation()

    const pointerState = state.pointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    state.pointers.delete(event.pointerId)

    const edge = pointerState.id
    emitter.emit("edge:pointerup", _makeEdgeEventObject(edge, event))

    // click handling
    if (!isShiftClickOnOtherKind(modes, "edge", event)) {
      const [clickEvent, doubleClickEvent] = detectClicks(
        state.clicks,
        pointerState.pointerId,
        edge instanceof Array ? edge.join(",") : edge,
        event
      )
      pointerState.eventTarget?.dispatchEvent(clickEvent)
      if (doubleClickEvent) {
        pointerState.eventTarget?.dispatchEvent(doubleClickEvent)
      }
    }

    if (state.pointers.size === 0) {
      // reset state
      entriesOf(edgePointerHandlers).forEach(([ev, handler]) => {
        document.removeEventListener(ev, handler)
      })
      cleanClickState(state.clicks)
      modes.viewMode.value = "default"
    }
  }

  function handleEdgePointerCancelEvent(event: PointerEvent) {
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
    entriesOf(edgePointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
    modes.viewMode.value = "default"
  }

  // Leaves out the edges removed while pressed, which have no state.
  function existingOf(edge: string | string[]): string[] {
    const edges = edge instanceof Array ? edge : [edge]
    return edges.filter(edge => edge in edgeStates)
  }

  function handleEdgeClickEvent(edge: string | string[], event: MouseEvent) {
    if (event.isTrusted) return // native event
    // When a finger is placed on any object and another object is tapped,
    // no click event is fired. Thus, click events are emulated by using
    // pointerdown/up. The following is processing for emulated events only.

    modes.selectionMode.value = "edge"

    // Edges count as selected when no more of them can be selected.
    const isSelected = (edges: string[]) =>
      edges.some(edge => selectedEdges.has(edge)) &&
      edges.every(edge => selectedEdges.has(edge) || !edgeStates[edge].selectable)

    const isTouchAnySelectedEdge = MapUtil.valueOf(state.pointers).some(p =>
      isSelected(existingOf(p.id))
    )

    const edges = existingOf(edge)
    // A summarized edge is selected as a whole, so not when it outnumbers the limit.
    const { edges: selectableEdges, limit } = selectableEdgesOf(edgeStates, edges)
    if (selectableEdges.length > 0) {
      if (event.shiftKey || isTouchAnySelectedEdge) {
        if (edges.some(edge => selectedEdges.has(edge))) {
          edges.forEach(edge => selectedEdges.delete(edge))
        } else if (selectedEdges.size + selectableEdges.length <= limit) {
          selectableEdges.forEach(edge => selectedEdges.add(edge))
        }
      } else if (!isSelected(edges) && selectableEdges.length <= limit) {
        // make the selectedEdges the clicked ones
        selectedEdges.clear()
        selectableEdges.forEach(edge => selectedEdges.add(edge))
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

  function handleEdgeContextMenu(edge: string | string[], event: MouseEvent) {
    event.stopPropagation()
    emitter.emit("edge:contextmenu", _makeEdgeEventObject(edge, event))
  }

  function handleEdgesPointerOverEvent(edges: string[], event: PointerEvent) {
    edges.forEach(edge => hoveredEdges.add(edge))
    emitter.emit("edge:pointerover", _makeEdgeEventObject(edges, event))
  }

  function handleEdgesPointerOutEvent(edges: string[], event: PointerEvent) {
    edges.forEach(edge => hoveredEdges.delete(edge))
    emitter.emit("edge:pointerout", _makeEdgeEventObject(edges, event))
  }

  return {
    handleEdgePointerDownEvent,
    handleEdgePointerOverEvent,
    handleEdgePointerOutEvent,
    handleEdgeClickEvent,
    handleEdgeDoubleClickEvent,
    handleEdgeContextMenu,
    handleEdgesPointerDownEvent: handleEdgePointerDownEvent,
    handleEdgesPointerOverEvent,
    handleEdgesPointerOutEvent,
    handleEdgesClickEvent: handleEdgeClickEvent,
    handleEdgesDoubleClickEvent: handleEdgeDoubleClickEvent,
    handleEdgesContextMenu: handleEdgeContextMenu,
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
