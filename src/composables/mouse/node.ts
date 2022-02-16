import { watch } from "vue"
import { Emitter } from "mitt"
import { Reactive, ReadonlyRef } from "@/common/common"
import { Events, NodePositions } from "@/common/types"
import { NodeStates } from "@/models/node"
import { entriesOf } from "@/utils/object"
import { MapUtil } from "@/utils/map"
import { InteractionState, MOVE_DETECTION_THRESHOLD, NodePointerState } from "./core"

type PointerPosition = Pick<PointerEvent, "pageX" | "pageY" | "pointerId">

export function makeNodeInteractionHandlers(
  nodeStates: NodeStates,
  nodePositions: Readonly<NodePositions>,
  state: InteractionState,
  selectedNodes: Reactive<Set<string>>,
  selectedEdges: Reactive<Set<string>>,
  zoomLevel: ReadonlyRef<number>,
  emitter: Emitter<Events>
) {
  const nodePointerHandlers = {
    pointermove: handleNodePointerMoveEvent,
    pointerup: handleNodePointerUpEvent,
    pointercancel: handleNodePointerCancelEvent,
  }

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
