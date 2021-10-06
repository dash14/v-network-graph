// Module responsible for selection state and mouse/touch operations

import { inject, InjectionKey, onMounted, onUnmounted, provide, Ref, watch } from "vue"
import { Emitter } from "mitt"
import { nonNull, Reactive, ReadonlyRef } from "../common/common"
import { Events, NodePositions, Position } from "../common/types"
import { Configs } from "../common/configs"
import { entriesOf, MapUtil } from "../common/utility"
import { NodeStates } from "./state"

type NodeEventHandler = (node: string, event: PointerEvent) => void
type EdgeEventHandler = (edge: string, event: PointerEvent) => void

interface MouseEventHandlers {
  selectedNodes: Reactive<Set<string>>
  hoveredNodes: Reactive<Set<string>>
  selectedEdges: Reactive<Set<string>>
  hoveredEdges: Reactive<Set<string>>
  handleNodePointerDownEvent: NodeEventHandler
  handleNodePointerOverEvent: NodeEventHandler
  handleNodePointerOutEvent: NodeEventHandler
  handleEdgePointerDownEvent: EdgeEventHandler
  handleEdgePointerOverEvent: EdgeEventHandler
  handleEdgePointerOutEvent: EdgeEventHandler
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
  edgeId: string // pointer down edge ID
}

interface State {
  container: {
    moveCounter: number
    pointerCounter: number
  }
  nodePointers: Map<number, NodePointerState> // <PointerId, ...>
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

export function provideMouseOperation(
  container: Ref<SVGElement | undefined>,
  nodePositions: Readonly<NodePositions>,
  zoomLevel: ReadonlyRef<number>,
  configs: Readonly<Configs>,
  nodeStates: NodeStates,
  selectedNodes: Reactive<Set<string>>,
  selectedEdges: Reactive<Set<string>>,
  hoveredNodes: Reactive<Set<string>>,
  hoveredEdges: Reactive<Set<string>>,
  emitter: Emitter<Events>
): MouseEventHandlers {
  onMounted(() => {
    container.value?.addEventListener("pointerdown", handleContainerPointerDownEvent, {
      passive: true,
    })
  })

  onUnmounted(() => {
    container.value?.removeEventListener("pointerdown", handleContainerPointerDownEvent)
  })

  const state: State = {
    // measure the number of move events in the pointerdown state
    // and use it to determine the click when pointerup.
    container: {
      moveCounter: 0,
      pointerCounter: 0,
    },
    nodePointers: new Map(),
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
      }
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

  function handleNodeClickEvent(node: string, event: PointerEvent) {
    if (event.shiftKey && selectedEdges.size > 0) {
      return
    }

    selectedEdges.clear()

    if (configs.node.selectable) {
      const isTouchAnySelectedNode =
        MapUtil.valueOf(state.nodePointers).filter(
          p => p.pointerId != event.pointerId && selectedNodes.has(p.nodeId)
        ).length > 0
      if (event.shiftKey || isTouchAnySelectedNode) {
        // select multiple nodes
        if (selectedNodes.has(node)) {
          selectedNodes.delete(node)
        } else if (
          !(
            typeof configs.node.selectable === "number" &&
            selectedNodes.size >= configs.node.selectable
          )
        ) {
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
      // no click event
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
      handleNodeClickEvent(node, event)
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

  // -----------------------------------------------------------------------
  // Event handler for edges
  // -----------------------------------------------------------------------

  function handleEdgePointerDownEvent(edge: string, event: PointerEvent) {
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

    emitter.emit("edge:pointerdown", { edge, event })
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

    emitter.emit("edge:pointerup", { edge, event })

    if (state.edgePointers.size > 0 || state.edgePointerPeekCount === 1) {
      handleEdgeClickEvent(edge, event)
    }

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
      emitter.emit("edge:pointerup", { edge, event })
    }

    // reset state
    state.edgePointers.clear()
    state.edgePointerPeekCount = 0
    entriesOf(edgePointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
    emitter.emit("view:mode", "default")
  }

  function handleEdgeClickEvent(edge: string, event: PointerEvent) {
    if (event.shiftKey && selectedNodes.size > 0) {
      return
    }

    selectedNodes.clear()

    if (configs.edge.selectable) {
      const isTouchAnySelectedEdge =
        MapUtil.valueOf(state.edgePointers).filter(
          p => p.pointerId != event.pointerId && selectedEdges.has(p.edgeId)
        ).length > 0
      if (event.shiftKey || isTouchAnySelectedEdge) {
        if (selectedEdges.has(edge)) {
          selectedEdges.delete(edge)
        } else if (
          !(
            typeof configs.edge.selectable === "number" &&
            selectedEdges.size >= configs.edge.selectable
          )
        ) {
          selectedEdges.add(edge)
        }
      } else {
        // make the selectedEdges the clicked one
        selectedEdges.clear()
        selectedEdges.add(edge)
      }
    }
    emitter.emit("edge:click", { edge, event })
  }

  function handleEdgePointerOverEvent(edge: string, event: PointerEvent) {
    state.hoveredEdges.add(edge)
    emitter.emit("edge:pointerover", { edge, event })
  }

  function handleEdgePointerOutEvent(edge: string, event: PointerEvent) {
    state.hoveredEdges.delete(edge)
    emitter.emit("edge:pointerout", { edge, event })
  }

  const provides = {
    selectedNodes,
    hoveredNodes,
    selectedEdges,
    hoveredEdges,
    handleNodePointerDownEvent,
    handleNodePointerOverEvent,
    handleNodePointerOutEvent,
    handleEdgePointerDownEvent,
    handleEdgePointerOverEvent,
    handleEdgePointerOutEvent,
  }
  provide(mouseEventHandlersKey, provides)
  return provides
}

export function useMouseOperation(): MouseEventHandlers {
  return nonNull(inject(mouseEventHandlersKey), "mouseEventHandlers")
}
