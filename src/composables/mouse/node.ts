import { watch } from "vue"
import { Emitter } from "mitt"
import { Reactive, ReadonlyRef } from "@/common/common"
import { Events, NodePositions, Position } from "@/common/types"
import { NodeStates } from "@/models/node"
import { entriesOf } from "@/utils/object"
import { MapUtil } from "@/utils/map"
import {
  cleanClickState,
  ClickState,
  detectClicks,
  getPointerMoveDetectionThreshold,
  InteractionModes,
  NodePointerState,
} from "./core"

type PointerPosition = Pick<PointerEvent, "pageX" | "pageY" | "pointerId">

interface NodeInteractionState {
  pointers: Map<number, NodePointerState> // <PointerId, ...>
  follow: {
    followedPointerId: number
    nodeBasePositions: { [name: string]: Position }
  }
  hoveredNodesPre: Set<string> // to keep the hover state while dragging
  clicks: Map<number, ClickState> // <PointerId, ...>
}

export function makeNodeInteractionHandlers(
  nodeStates: NodeStates,
  nodePositions: Readonly<NodePositions>,
  modes: InteractionModes,
  hoveredNodes: Reactive<Set<string>>,
  selectedNodes: Reactive<Set<string>>,
  zoomLevel: ReadonlyRef<number>,
  emitter: Emitter<Events>
) {
  const state: NodeInteractionState = {
    pointers: new Map(),
    follow: {
      followedPointerId: -1,
      nodeBasePositions: {},
    },
    hoveredNodesPre: new Set(),
    clicks: new Map(),
  }

  const nodePointerHandlers = {
    pointermove: handleNodePointerMoveEvent,
    pointerup: handleNodePointerUpEvent,
    pointercancel: handleNodePointerCancelEvent,
  }

  function _updateFollowNodes(pointerState: NodePointerState) {
    const isFollowed = state.follow.followedPointerId === pointerState.pointerId
    const isSelectedNode = selectedNodes.has(pointerState.nodeId)

    const removed = !(pointerState.pointerId in state.pointers)
    if ((isFollowed && removed) || (isFollowed && !isSelectedNode)) {
      // selected => unselected
      const candidate = MapUtil.valueOf(state.pointers).find(p => selectedNodes.has(p.nodeId))
      if (!candidate) {
        state.follow = { followedPointerId: -1, nodeBasePositions: {} }
        return
      }
      pointerState = candidate
      state.follow.followedPointerId = pointerState.pointerId
    } else {
      const followed = state.pointers.get(state.follow.followedPointerId)
      if (!followed) {
        state.follow = { followedPointerId: -1, nodeBasePositions: {} }
        return
      }
      pointerState = followed
    }

    if (isFollowed || isSelectedNode) {
      // reset state for following:
      // followed by selected nodes without user grabs
      const userGrabs = MapUtil.valueOf(state.pointers).map(n => n.nodeId)
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

  watch(selectedNodes, selected => {
    const pointerState = state.pointers.get(state.follow.followedPointerId)
    if (pointerState) {
      _updateFollowNodes(pointerState)
    }
    if (selected.size > 0 && modes.selectionMode.value !== "node") {
      modes.selectionMode.value = "node"
    } else if (selected.size === 0 && modes.selectionMode.value === "node") {
      modes.selectionMode.value = "container"
    }
  })

  watch(modes.selectionMode, mode => {
    if (mode !== "node") {
      selectedNodes.clear()
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
    if (event.isTrusted) return // native event
    // When a finger is placed on any object and another object is tapped,
    // no click event is fired. Thus, click events are emulated by using
    // pointerdown/up. The following is processing for emulated events only.

    if (event.shiftKey && !["container", "node"].includes(modes.selectionMode.value)) {
      return
    }
    modes.selectionMode.value = "node"

    const selectable = nodeStates[node]?.selectable ?? false
    if (selectable) {
      const isTouchAnySelectedNode =
        MapUtil.valueOf(state.pointers).filter(p => selectedNodes.has(p.nodeId)).length > 0
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
    if (event.isTrusted) return // native event
    emitter.emit("node:dblclick", { node, event })
  }

  function handleNodePointerMoveEvent(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()

    const pointerState = state.pointers.get(event.pointerId)
    if (!pointerState) {
      return
    }
    pointerState.latestPosition = { x: event.pageX, y: event.pageY }
    pointerState.moveCounter++

    const threshold = getPointerMoveDetectionThreshold(event.pointerType)
    if (pointerState.moveCounter <= threshold) {
      return // pending for click and drag distinguish
    }

    if (!nodeStates[pointerState.nodeId]?.draggable) {
      return
    }

    if (pointerState.moveCounter === threshold + 1) {
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

    let pointerState = state.pointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    for (pointerState of state.pointers.values()) {
      const node = pointerState.nodeId

      const threshold = getPointerMoveDetectionThreshold(event.pointerType)
      const isMoved = pointerState.moveCounter > threshold
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
    state.pointers.clear()
    state.follow = { followedPointerId: -1, nodeBasePositions: {} }
    entriesOf(nodePointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
    modes.viewMode.value = "default"
  }

  function handleNodePointerUpEvent(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()

    const pointerState = state.pointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    state.pointers.delete(event.pointerId)

    const node = pointerState.nodeId

    const threshold = getPointerMoveDetectionThreshold(event.pointerType)
    const isMoved = pointerState.moveCounter > threshold
    if (isMoved) {
      if (nodeStates[pointerState.nodeId]?.draggable) {
        const draggingNodes = _calculateNodeNewPosition(pointerState, event)
        emitter.emit("node:dragend", draggingNodes)
        emitter.emit("node:pointerup", { node, event })
      }
    } else {
      emitter.emit("node:pointerup", { node, event })
    }

    if (!isMoved /* Don't fire the click event if the node is being dragged */) {
      // click handling
      const [clickEvent, doubleClickEvent] = detectClicks(
        state.clicks,
        pointerState.pointerId,
        node,
        event
      )
      pointerState.eventTarget?.dispatchEvent(clickEvent)
      if (doubleClickEvent) {
        pointerState.eventTarget?.dispatchEvent(doubleClickEvent)
      }
    }

    if (state.pointers.size === 0) {
      // re-initialize state
      state.follow = { followedPointerId: -1, nodeBasePositions: {} }
      entriesOf(nodePointerHandlers).forEach(([ev, handler]) => {
        document.removeEventListener(ev, handler)
      })
      cleanClickState(state.clicks)
      modes.viewMode.value = "default"
    } else {
      _updateFollowNodes(pointerState)
    }

    // reflect changes while dragging.
    hoveredNodes.clear()
    state.hoveredNodesPre.forEach(hoveredNodes.add, hoveredNodes)
  }

  function handleNodePointerDownEvent(node: string, event: PointerEvent) {
    if (event.button == 2 /* right button */) {
      return
    }
    event.preventDefault()
    event.stopPropagation()

    if (!["default", "node"].includes(modes.viewMode.value)) {
      return
    }

    if (state.pointers.size == 0) {
      // Add event listeners
      modes.viewMode.value = "node"
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
      eventTarget: event.currentTarget,
    }
    state.pointers.set(event.pointerId, pointerState)

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
    if (state.pointers.size > 0) {
      return // dragging
    }
    hoveredNodes.add(node)
    emitter.emit("node:pointerover", { node, event })
  }

  function handleNodePointerOutEvent(node: string, event: PointerEvent) {
    state.hoveredNodesPre.delete(node)
    if (state.pointers.size > 0) {
      return // dragging
    }
    hoveredNodes.delete(node)
    emitter.emit("node:pointerout", { node, event })
  }

  function handleNodeContextMenu(node: string, event: MouseEvent) {
    event.stopPropagation()
    emitter.emit("node:contextmenu", { node, event })
  }

  return {
    handleNodePointerDownEvent,
    handleNodePointerOverEvent,
    handleNodePointerOutEvent,
    handleNodeClickEvent,
    handleNodeDoubleClickEvent,
    handleNodeContextMenu,
  }
}

function _unwrapNodePosition(nodes: Readonly<NodePositions>, node: string) {
  const pos = nodes[node] ?? { x: 0, y: 0 }
  return { ...pos } // unwrap reactivity
}
