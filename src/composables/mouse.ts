// 選択状態とマウス操作を担当する機能

import { inject, InjectionKey, onMounted, onUnmounted, provide, Ref, watch } from "vue"
import { Emitter } from "mitt"
import { Events, NodePositions, nonNull, Position, Reactive, ReadonlyRef } from "../common/types"
import { Styles } from "../common/styles"
import { entriesOf, MapUtil } from "../common/utility"

type NodeEventHandler = (node: string, event: PointerEvent) => void
type EdgeEventHandler = (edge: string, event: MouseEvent) => void

interface MouseEventHandlers {
  handleNodePointerDownEvent: NodeEventHandler
  handleEdgeMouseDownEvent: EdgeEventHandler
}
const mouseEventHandlersKey = Symbol("mouseEventHandlers") as InjectionKey<MouseEventHandlers>

// MEMO: ノード選択との連携、複数選択してムーブなど

const MOVE_DETECTION_THRESHOLD = 3 // ドラッグを開始する感度

// state for each pointer of multi touch
interface PointerState {
  pointerId: number // pointer ID provided by the event
  nodeId: string // grabbing node ID
  moveCounter: number // count for pointermove event occurred
  dragBasePosition: Position // drag started position
  nodeBasePosition: Position // node position at drag started
  latestPosition: Position // latest position
}

interface State {
  container: {
    moveCounter: number
    pointerCounter: number
  }
  pointers: Map<number, PointerState> // <PointerId, ...>
  follow: {
    followedPointerId: number
    nodeBasePositions: { [name: string]: Position }
  }
  mouseDownEdgeId: string | undefined
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
  styles: Readonly<Styles>,
  selectedNodes: Reactive<string[]>,
  selectedEdges: Reactive<string[]>,
  emitter: Emitter<Events>
): void {
  onMounted(() => {
    container.value?.addEventListener("pointerdown", handleContainerPointerDownEvent, {
      passive: true,
    })
  })

  onUnmounted(() => {
    container.value?.removeEventListener("pointerdown", handleContainerPointerDownEvent)
  })

  const state: State = {
    // mousedown 状態での移動イベント回数を測定し、mouseup 時の
    // クリック判定に用いる
    container: {
      moveCounter: 0,
      pointerCounter: 0,
    },
    pointers: new Map(),
    follow: {
      followedPointerId: -1,
      nodeBasePositions: {},
    },
    mouseDownEdgeId: undefined,
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

  function handleContainerPointerUpEvent(_: PointerEvent) {
    state.container.pointerCounter--
    if (state.container.pointerCounter === 0) {
      // Remove from event listener
      entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
        container.value?.removeEventListener(ev, handler)
      })
      if (state.container.moveCounter <= MOVE_DETECTION_THRESHOLD) {
        // Click container (without mouse move)
        selectedNodes.splice(0, selectedNodes.length)
        selectedEdges.splice(0, selectedEdges.length)
      }
    }
  }

  // -----------------------------------------------------------------------
  // Event handler for nodes
  // -----------------------------------------------------------------------

  function _updateFollowNodes(pointerState: PointerState) {
    const isFollowed = state.follow.followedPointerId === pointerState.pointerId
    const isSelectedNode = selectedNodes.includes(pointerState.nodeId)

    const removed = !(pointerState.pointerId in state.pointers)
    if ((isFollowed && removed) || (isFollowed && !isSelectedNode)) {
      // selected => unselected
      const candidate = MapUtil.valueOf(state.pointers).find(p => selectedNodes.includes(p.nodeId))
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
        selectedNodes
          .filter(n => !userGrabs.includes(n))
          .map(n => [n, _unwrapNodePosition(nodePositions, n)])
      )
      pointerState.dragBasePosition = { ...pointerState.latestPosition }
      pointerState.nodeBasePosition = _unwrapNodePosition(nodePositions, pointerState.nodeId)
    }
  }

  watch(selectedNodes, () => {
    const pointerState = state.pointers.get(state.follow.followedPointerId)
    if (pointerState) {
      _updateFollowNodes(pointerState)
    }
  })

  function _calculateNodeNewPosition(pointerState: PointerState, event: PointerPosition) {
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
    selectedEdges.splice(0, selectedEdges.length)

    if (styles.node.selectable) {
      const isTouchAnySelectedNode =
        MapUtil.valueOf(state.pointers).filter(
          p => p.pointerId != event.pointerId && selectedNodes.includes(p.nodeId)
        ).length > 0
      if (event.shiftKey || isTouchAnySelectedNode) {
        // select multiple nodes
        const index = selectedNodes.indexOf(node)
        if (index >= 0) {
          selectedNodes.splice(index, 1)
        } else {
          selectedNodes.push(node)
        }
      } else {
        // make the selectedNodes the clicked one
        selectedNodes.splice(0, selectedNodes.length, node)
      }
    }
    emitter.emit("node:click", { node, event })
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

    if (pointerState.moveCounter <= MOVE_DETECTION_THRESHOLD) {
      return // pending for click and drag distinguish
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

    const pointerState = state.pointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    state.pointers.delete(event.pointerId)

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

    // reset state
    state.follow = { followedPointerId: -1, nodeBasePositions: {} }
    entriesOf(nodePointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
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

    const isMoved = pointerState.moveCounter > MOVE_DETECTION_THRESHOLD
    if (isMoved) {
      const draggingNodes = _calculateNodeNewPosition(pointerState, event)
      emitter.emit("node:dragend", draggingNodes)
      emitter.emit("node:pointerup", { node, event })
    } else {
      emitter.emit("node:pointerup", { node, event })
      handleNodeClickEvent(node, event)
    }

    if (state.pointers.size == 0) {
      // re-initialize state
      state.follow = { followedPointerId: -1, nodeBasePositions: {} }
      entriesOf(nodePointerHandlers).forEach(([ev, handler]) => {
        document.removeEventListener(ev, handler)
      })
    } else {
      _updateFollowNodes(pointerState)
    }
  }

  function handleNodePointerDownEvent(node: string, event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()

    if (state.pointers.size == 0) {
      // Add event listeners
      entriesOf(nodePointerHandlers).forEach(([ev, handler]) => {
        document.addEventListener(ev, handler)
      })
    }

    // Create new pointer state
    const pointerState: PointerState = {
      pointerId: event.pointerId,
      nodeId: node,
      moveCounter: 0,
      nodeBasePosition: _unwrapNodePosition(nodePositions, node),
      dragBasePosition: { x: event.pageX, y: event.pageY },
      latestPosition: { x: event.pageX, y: event.pageY },
    }
    state.pointers.set(event.pointerId, pointerState)

    if (selectedNodes.includes(node)) {
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

  // -----------------------------------------------------------------------
  // Event handler for edges
  // -----------------------------------------------------------------------

  function handleEdgeMouseDownEvent(edge: string, event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()

    state.mouseDownEdgeId = edge
    document.addEventListener("pointerup", handleEdgeMouseUpEvent)
  }

  function handleEdgeMouseUpEvent(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    document.removeEventListener("pointerup", handleEdgeMouseUpEvent)

    const edge = state.mouseDownEdgeId
    if (edge === undefined) {
      return
    }

    handleEdgeClickEvent(edge, event)
  }

  function handleEdgeClickEvent(edge: string, event: MouseEvent) {
    selectedNodes.splice(0, selectedNodes.length)

    if (styles.edge.selectable) {
      if (event.shiftKey) {
        const index = selectedEdges.indexOf(edge)
        if (index >= 0) {
          selectedEdges.splice(index, 1)
        } else {
          selectedEdges.push(edge)
        }
      } else {
        // make the selectedEdges the clicked one
        selectedEdges.splice(0, selectedEdges.length, edge)
      }
    }
    emitter.emit("edge:click", { edge, event })
  }

  provide(mouseEventHandlersKey, {
    handleNodePointerDownEvent,
    handleEdgeMouseDownEvent,
  })
}

export function useMouseOperation(): MouseEventHandlers {
  return nonNull(inject(mouseEventHandlersKey), "mouseEventHandlers")
}
