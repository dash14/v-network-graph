// Module responsible for selection state and mouse/touch operations

import { inject, InjectionKey, onMounted, onUnmounted, provide, Ref, watch } from "vue"
import { Emitter } from "mitt"
import { nonNull, Reactive, ReadonlyRef } from "@/common/common"
import { Events, NodePositions, Position, EdgeEvent } from "@/common/types"
import { entriesOf } from "@/utils/object"
import { MapUtil } from "@/utils/map"
import { EdgeStates, NodeStates } from "./state"

type NodeEventHandler<T extends Event = PointerEvent> = (node: string, event: T) => void
type EdgeEventHandler<T extends Event = PointerEvent> = (edge: string, event: T) => void
type EdgesEventHandler<T extends Event = PointerEvent> = (edges: string[], event: T) => void

interface MouseEventHandlers {
  selectedNodes: Reactive<Set<string>>
  hoveredNodes: Reactive<Set<string>>
  selectedEdges: Reactive<Set<string>>
  hoveredEdges: Reactive<Set<string>>
  handleNodePointerDownEvent: NodeEventHandler
  handleNodePointerOverEvent: NodeEventHandler
  handleNodePointerOutEvent: NodeEventHandler
  handleNodeClickEvent: NodeEventHandler<MouseEvent>
  handleNodeDoubleClickEvent: NodeEventHandler<MouseEvent>
  handleNodeContextMenu: NodeEventHandler<MouseEvent>
  handleEdgePointerDownEvent: EdgeEventHandler
  handleEdgePointerOverEvent: EdgeEventHandler
  handleEdgePointerOutEvent: EdgeEventHandler
  handleEdgeClickEvent: EdgeEventHandler<MouseEvent>
  handleEdgeDoubleClickEvent: EdgeEventHandler<MouseEvent>
  handleEdgeContextMenu: EdgeEventHandler<MouseEvent>
  handleEdgesPointerDownEvent: EdgesEventHandler
  handleEdgesPointerOverEvent: EdgesEventHandler
  handleEdgesPointerOutEvent: EdgesEventHandler
  handleEdgesClickEvent: EdgesEventHandler<MouseEvent>
  handleEdgesDoubleClickEvent: EdgesEventHandler<MouseEvent>
  handleEdgesContextMenu: EdgesEventHandler<MouseEvent>
}
const mouseEventHandlersKey = Symbol("mouseEventHandlers") as InjectionKey<MouseEventHandlers>

const MOVE_DETECTION_THRESHOLD = 3 // Sensitivity to start dragging

// state for each pointer of multi touch
interface NodePointerState {
  pointerId: number // pointer ID provided by the event
  nodeId: string // pointer down node ID
  moveCounter: number // count for pointermove event occurred
  dragBasePosition: Position // drag started position
  nodeBasePosition: Position // node position at drag started
  latestPosition: Position // latest position
}

interface EdgePointerState {
  pointerId: number // pointer ID provided by the event
  edgeId: string | string[] // pointer down edge ID
}

interface State {
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
  edgePointers: Map<number, EdgePointerState> // <PointerId, ...>
  edgePointerPeekCount: number
}

type PointerPosition = Pick<PointerEvent, "pageX" | "pageY" | "pointerId">

function _unwrapNodePosition(nodes: Readonly<NodePositions>, node: string) {
  const pos = nodes[node] ?? { x: 0, y: 0 }
  return { ...pos } // unwrap reactivity
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

export function provideMouseOperation(
  container: Ref<SVGSVGElement | undefined>,
  nodePositions: Readonly<NodePositions>,
  zoomLevel: ReadonlyRef<number>,
  nodeStates: NodeStates,
  edgeStates: EdgeStates,
  selectedNodes: Reactive<Set<string>>,
  selectedEdges: Reactive<Set<string>>,
  hoveredNodes: Reactive<Set<string>>,
  hoveredEdges: Reactive<Set<string>>,
  emitter: Emitter<Events>
): MouseEventHandlers {
  onMounted(() => {
    const c = container.value
    if (!c) return
    c.addEventListener("pointerdown", handleContainerPointerDownEvent, { passive: true })
    c.addEventListener("click", handleContainerClickEvent, { passive: false })
    c.addEventListener("dblclick", handleContainerDoubleClickEvent, { passive: false })
    c.addEventListener("contextmenu", handleContainerContextMenuEvent, { passive: false })
  })

  onUnmounted(() => {
    container.value?.removeEventListener("pointerdown", handleContainerPointerDownEvent)
    container.value?.removeEventListener("click", handleContainerClickEvent)
    container.value?.removeEventListener("dblclick", handleContainerDoubleClickEvent)
    container.value?.removeEventListener("contextmenu", handleContainerContextMenuEvent)
  })

  const state: State = {
    // measure the number of move events in the pointerdown state
    // and use it to determine the click when pointerup.
    container: {
      moveCounter: 0,
      pointerCounter: 0,
      allowClickEvent: false,
    },
    nodePointers: new Map(),
    prevNodePointers: new Map(),
    follow: {
      followedPointerId: -1,
      nodeBasePositions: {},
    },
    hoveredNodes,
    hoveredNodesPre: new Set(),
    hoveredEdges,
    edgePointers: new Map(),
    edgePointerPeekCount: 0,
  }

  const containerPointerHandlers = {
    pointermove: handleContainerPointerMoveEvent,
    pointerup: handleContainerPointerUpEvent,
    pointercancel: handleContainerPointerUpEvent,
  }
  const nodePointerHandlers = {
    pointermove: handleNodePointerMoveEvent,
    pointerup: handleNodePointerUpEvent,
    pointercancel: handleNodePointerCancelEvent,
  }
  const edgePointerHandlers = {
    pointerup: handleEdgePointerUpEvent,
    pointercancel: handleEdgePointerCancelEvent,
  }

  function handleContainerPointerDownEvent(_: PointerEvent) {
    state.container.allowClickEvent = false
    state.container.moveCounter = 0
    if (state.container.pointerCounter === 0) {
      // Add to event listener
      entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
        container.value?.addEventListener(ev, handler, { passive: true })
      })
    }
    state.container.pointerCounter++
  }

  function handleContainerPointerMoveEvent(_: PointerEvent) {
    state.container.moveCounter++
  }

  function handleContainerPointerUpEvent(event: PointerEvent) {
    state.container.pointerCounter--
    if (state.container.pointerCounter === 0) {
      // Remove from event listener
      entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
        container.value?.removeEventListener(ev, handler)
      })
      if (state.container.moveCounter <= MOVE_DETECTION_THRESHOLD) {
        // Click container (without mouse move)
        if (event.shiftKey && (selectedNodes.size > 0 || selectedEdges.size > 0)) {
          return
        }
        selectedNodes.clear()
        selectedEdges.clear()
        state.container.allowClickEvent = true
      }
    }
  }

  function handleContainerClickEvent(event: MouseEvent) {
    if (state.container.allowClickEvent) {
      emitter.emit("view:click", { event })
    }
  }

  function handleContainerDoubleClickEvent(event: MouseEvent) {
    if (state.container.allowClickEvent) {
      emitter.emit("view:dblclick", { event })
    }
  }

  function handleContainerContextMenuEvent(event: MouseEvent) {
    emitter.emit("view:contextmenu", { event })

    if (state.container.pointerCounter > 0) {
      // reset pointer down state
      state.container.pointerCounter = 0
      // Remove from event listener
      entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
        container.value?.removeEventListener(ev, handler)
      })
    }
  }

  // -----------------------------------------------------------------------
  // Event handler for nodes
  // -----------------------------------------------------------------------

  function _updateFollowNodes(pointerState: NodePointerState) {
    const isFollowed = state.follow.followedPointerId === pointerState.pointerId
    const isSelectedNode = selectedNodes.has(pointerState.nodeId)

    const removed = !(pointerState.pointerId in state.nodePointers)
    if ((isFollowed && removed) || (isFollowed && !isSelectedNode)) {
      // selected => unselected
      const candidate = MapUtil.valueOf(state.nodePointers).find(p => selectedNodes.has(p.nodeId))
      if (!candidate) {
        state.follow = { followedPointerId: -1, nodeBasePositions: {} }
        return
      }
      pointerState = candidate
      state.follow.followedPointerId = pointerState.pointerId
    } else {
      const followed = state.nodePointers.get(state.follow.followedPointerId)
      if (!followed) {
        state.follow = { followedPointerId: -1, nodeBasePositions: {} }
        return
      }
      pointerState = followed
    }

    if (isFollowed || isSelectedNode) {
      // reset state for following:
      // followed by selected nodes without user grabs
      const userGrabs = MapUtil.valueOf(state.nodePointers).map(n => n.nodeId)
      state.follow.nodeBasePositions = Object.fromEntries(
        Array.from(selectedNodes)
          .filter(n => !userGrabs.includes(n))
          .filter(n => nodeStates[n]?.draggable)
          .map(n => [n, _unwrapNodePosition(nodePositions, n)])
      )
      pointerState.dragBasePosition = { ...pointerState.latestPosition }
      pointerState.nodeBasePosition = _unwrapNodePosition(nodePositions, pointerState.nodeId)
    }
  }

  watch(selectedNodes, () => {
    const pointerState = state.nodePointers.get(state.follow.followedPointerId)
    if (pointerState) {
      _updateFollowNodes(pointerState)
    }
  })

  function _calculateNodeNewPosition(pointerState: NodePointerState, event: PointerPosition) {
    const dx = pointerState.dragBasePosition.x - event.pageX
    const dy = pointerState.dragBasePosition.y - event.pageY
    const positions =
      state.follow.followedPointerId == pointerState.pointerId
        ? {
            [pointerState.nodeId]: pointerState.nodeBasePosition,
            ...state.follow.nodeBasePositions,
          }
        : { [pointerState.nodeId]: pointerState.nodeBasePosition }
    const z = zoomLevel.value

    return Object.fromEntries(
      Object.entries(positions).map(([node, pos]) => [
        node,
        {
          x: pos.x - dx / z,
          y: pos.y - dy / z,
        },
      ])
    )
  }

  function handleNodeClickEvent(node: string, event: MouseEvent) {
    // Don't fire the click event if the node is being dragged
    const pointerState = Array.from(state.prevNodePointers.values()).find(s => s.nodeId === node)
    if (pointerState) {
      const isMoved = pointerState.moveCounter > MOVE_DETECTION_THRESHOLD
      if (isMoved) {
        return
      }
    }

    if (event.shiftKey && selectedEdges.size > 0) {
      return
    }

    selectedEdges.clear()

    const selectable = nodeStates[node]?.selectable ?? false
    if (selectable) {
      const isTouchAnySelectedNode =
        MapUtil.valueOf(state.nodePointers).filter(p => selectedNodes.has(p.nodeId)).length > 0
      if (event.shiftKey || isTouchAnySelectedNode) {
        // select multiple nodes
        if (selectedNodes.has(node)) {
          selectedNodes.delete(node)
        } else if (!(typeof selectable === "number" && selectedNodes.size >= selectable)) {
          selectedNodes.add(node)
        }
      } else if (!selectedNodes.has(node)) {
        // make the selectedNodes the clicked one
        selectedNodes.clear()
        selectedNodes.add(node)
      }
    }
    emitter.emit("node:click", { node, event })
  }

  function handleNodeDoubleClickEvent(node: string, event: MouseEvent) {
    emitter.emit("node:dblclick", { node, event })
  }

  function handleNodePointerMoveEvent(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()

    const pointerState = state.nodePointers.get(event.pointerId)
    if (!pointerState) {
      return
    }
    pointerState.latestPosition = { x: event.pageX, y: event.pageY }
    pointerState.moveCounter++

    if (pointerState.moveCounter <= MOVE_DETECTION_THRESHOLD) {
      return // pending for click and drag distinguish
    }

    if (!nodeStates[pointerState.nodeId]?.draggable) {
      return
    }

    if (pointerState.moveCounter === MOVE_DETECTION_THRESHOLD + 1) {
      const draggingNodes = _calculateNodeNewPosition(pointerState, {
        pointerId: pointerState.pointerId,
        pageX: pointerState.dragBasePosition.x,
        pageY: pointerState.dragBasePosition.y,
      })
      emitter.emit("node:dragstart", draggingNodes)
    }
    const draggingNodes = _calculateNodeNewPosition(pointerState, event)
    emitter.emit("node:pointermove", draggingNodes)
  }

  function handleNodePointerCancelEvent(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()

    let pointerState = state.nodePointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    for (pointerState of state.nodePointers.values()) {
      const node = pointerState.nodeId

      const isMoved = pointerState.moveCounter > MOVE_DETECTION_THRESHOLD
      if (isMoved) {
        // pageX/Y in cancel event are zero => use latest position
        const draggingNodes = _calculateNodeNewPosition(pointerState, {
          pointerId: pointerState.pointerId,
          pageX: pointerState.latestPosition.x,
          pageY: pointerState.latestPosition.y,
        })
        emitter.emit("node:dragend", draggingNodes)
      }
      emitter.emit("node:pointerup", { node, event })
    }

    // reset state
    state.nodePointers.clear()
    state.follow = { followedPointerId: -1, nodeBasePositions: {} }
    entriesOf(nodePointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
    emitter.emit("view:mode", "default")
  }

  function handleNodePointerUpEvent(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()

    const pointerState = state.nodePointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    state.nodePointers.delete(event.pointerId)
    state.prevNodePointers.set(event.pointerId, pointerState)

    const node = pointerState.nodeId

    const isMoved = pointerState.moveCounter > MOVE_DETECTION_THRESHOLD
    if (isMoved) {
      if (nodeStates[pointerState.nodeId]?.draggable) {
        const draggingNodes = _calculateNodeNewPosition(pointerState, event)
        emitter.emit("node:dragend", draggingNodes)
        emitter.emit("node:pointerup", { node, event })
      }
    } else {
      emitter.emit("node:pointerup", { node, event })
    }

    if (state.nodePointers.size == 0) {
      // re-initialize state
      state.follow = { followedPointerId: -1, nodeBasePositions: {} }
      entriesOf(nodePointerHandlers).forEach(([ev, handler]) => {
        document.removeEventListener(ev, handler)
      })
      emitter.emit("view:mode", "default")
    } else {
      _updateFollowNodes(pointerState)
    }

    // reflect changes while dragging.
    state.hoveredNodes.clear()
    state.hoveredNodesPre.forEach(state.hoveredNodes.add, state.hoveredNodes)
  }

  function handleNodePointerDownEvent(node: string, event: PointerEvent) {
    if (event.button == 2 /* right button */) {
      return
    }
    event.preventDefault()
    event.stopPropagation()

    if (state.edgePointers.size !== 0) {
      return
    }

    if (state.nodePointers.size == 0) {
      // Add event listeners
      emitter.emit("view:mode", "node")
      entriesOf(nodePointerHandlers).forEach(([ev, handler]) => {
        document.addEventListener(ev, handler)
      })
    }

    // Create new pointer state
    const pointerState: NodePointerState = {
      pointerId: event.pointerId,
      nodeId: node,
      moveCounter: 0,
      nodeBasePosition: _unwrapNodePosition(nodePositions, node),
      dragBasePosition: { x: event.pageX, y: event.pageY },
      latestPosition: { x: event.pageX, y: event.pageY },
    }
    state.nodePointers.set(event.pointerId, pointerState)

    if (selectedNodes.has(node)) {
      if (state.follow.followedPointerId < 0) {
        // pointer followed by selected nodes
        state.follow.followedPointerId = event.pointerId
        _updateFollowNodes(pointerState)
      } else {
        // current pointer is in charge of this node.
        // do not follow another node anymore.
        delete state.follow.nodeBasePositions[pointerState.nodeId]
      }
    }

    emitter.emit("node:pointerdown", { node, event })
  }

  function handleNodePointerOverEvent(node: string, event: PointerEvent) {
    state.hoveredNodesPre.add(node)
    if (state.nodePointers.size > 0) {
      return // dragging
    }
    state.hoveredNodes.add(node)
    emitter.emit("node:pointerover", { node, event })
  }

  function handleNodePointerOutEvent(node: string, event: PointerEvent) {
    state.hoveredNodesPre.delete(node)
    if (state.nodePointers.size > 0) {
      return // dragging
    }
    state.hoveredNodes.delete(node)
    emitter.emit("node:pointerout", { node, event })
  }

  function handleNodeContextMenu(node: string, event: PointerEvent) {
    emitter.emit("node:contextmenu", { node, event })
  }

  // -----------------------------------------------------------------------
  // Event handler for edges
  // -----------------------------------------------------------------------

  function handleEdgePointerDownEvent(edge: string, event: PointerEvent) {
    if (event.button == 2 /* right button */) {
      return
    }
    event.preventDefault()
    event.stopPropagation()

    if (state.nodePointers.size !== 0) {
      return
    }

    if (state.edgePointers.size == 0) {
      // Add event listeners
      emitter.emit("view:mode", "edge")
      entriesOf(edgePointerHandlers).forEach(([ev, handler]) => {
        document.addEventListener(ev, handler)
      })
      state.edgePointerPeekCount = 0
    }

    state.edgePointerPeekCount++

    // Create new pointer state
    const pointerState: EdgePointerState = {
      pointerId: event.pointerId,
      edgeId: edge,
    }
    state.edgePointers.set(event.pointerId, pointerState)

    emitter.emit("edge:pointerdown", _makeEdgeEventObject(edge, event))
  }

  function handleEdgePointerUpEvent(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()

    const pointerState = state.edgePointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    state.edgePointers.delete(event.pointerId)

    const edge = pointerState.edgeId
    emitter.emit("edge:pointerup", _makeEdgeEventObject(edge, event))

    if (state.edgePointers.size === 0) {
      // reset state
      state.edgePointerPeekCount = 0
      entriesOf(edgePointerHandlers).forEach(([ev, handler]) => {
        document.removeEventListener(ev, handler)
      })
      emitter.emit("view:mode", "default")
    }
  }

  function handleEdgePointerCancelEvent(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()

    const pointerState = state.edgePointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    for (const pointerState of state.edgePointers.values()) {
      const edge = pointerState.edgeId
      emitter.emit("edge:pointerup", _makeEdgeEventObject(edge, event))
    }

    // reset state
    state.edgePointers.clear()
    state.edgePointerPeekCount = 0
    entriesOf(edgePointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
    emitter.emit("view:mode", "default")
  }

  function handleEdgeClickEvent(edge: string | string[], event: MouseEvent) {
    if (state.edgePointers.size > 0 || state.edgePointerPeekCount > 0) {
      return // ignore
    }

    if (event.shiftKey && selectedNodes.size > 0) {
      return
    }

    selectedNodes.clear()

    const edges = edge instanceof Array ? edge : [edge]

    const isTouchAnySelectedEdge =
      MapUtil.valueOf(state.edgePointers).filter(p => {
        const edges = p.edgeId instanceof Array ? p.edgeId : [p.edgeId]
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
    emitter.emit("edge:dblclick", _makeEdgeEventObject(edge, event))
  }

  function handleEdgePointerOverEvent(edge: string, event: PointerEvent) {
    state.hoveredEdges.add(edge)
    emitter.emit("edge:pointerover", _makeEdgeEventObject(edge, event))
  }

  function handleEdgePointerOutEvent(edge: string, event: PointerEvent) {
    state.hoveredEdges.delete(edge)
    emitter.emit("edge:pointerout", _makeEdgeEventObject(edge, event))
  }

  function handleEdgeContextMenu(edge: string, event: PointerEvent) {
    emitter.emit("edge:contextmenu", _makeEdgeEventObject(edge, event))
  }

  function handleEdgesPointerDownEvent(edges: string[], event: PointerEvent) {
    if (event.button == 2 /* right button */) {
      return
    }
    event.preventDefault()
    event.stopPropagation()

    if (state.nodePointers.size !== 0) {
      return
    }

    if (state.edgePointers.size == 0) {
      // Add event listeners
      emitter.emit("view:mode", "edge")
      entriesOf(edgePointerHandlers).forEach(([ev, handler]) => {
        document.addEventListener(ev, handler)
      })
      state.edgePointerPeekCount = 0
    }

    state.edgePointerPeekCount++

    // Create new pointer state
    const pointerState: EdgePointerState = {
      pointerId: event.pointerId,
      edgeId: edges,
    }
    state.edgePointers.set(event.pointerId, pointerState)
    emitter.emit("edge:pointerdown", _makeEdgeEventObject(edges, event))
  }

  function handleEdgesPointerOverEvent(edges: string[], event: PointerEvent) {
    edges.forEach(edge => state.hoveredEdges.add(edge))
    emitter.emit("edge:pointerover", _makeEdgeEventObject(edges, event))
  }

  function handleEdgesPointerOutEvent(edges: string[], event: PointerEvent) {
    edges.forEach(edge => state.hoveredEdges.delete(edge))
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

  const provides = <MouseEventHandlers>{
    selectedNodes,
    hoveredNodes,
    selectedEdges,
    hoveredEdges,
    handleNodePointerDownEvent,
    handleNodePointerOverEvent,
    handleNodePointerOutEvent,
    handleNodeClickEvent,
    handleNodeDoubleClickEvent,
    handleNodeContextMenu,
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
  provide(mouseEventHandlersKey, provides)
  return provides
}

export function useMouseOperation(): MouseEventHandlers {
  return nonNull(inject(mouseEventHandlersKey), "mouseEventHandlers")
}
