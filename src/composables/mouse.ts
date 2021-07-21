// 選択状態とマウス操作を担当する機能

import { inject, InjectionKey, onMounted, onUnmounted, provide, Ref, watch } from "vue"
import { Emitter } from "mitt"
import { Events, NodePositions, nonNull, Position, Reactive, ReadonlyRef } from "../common/types"
import { Styles } from "../common/styles"

type NodeEventHandler = (node: string, event: PointerEvent) => void
type EdgeEventHandler = (edge: string, event: MouseEvent) => void

interface MouseEventHandlers {
  handleNodePointerDownEvent: NodeEventHandler
  handleEdgeMouseDownEvent: EdgeEventHandler
}
const mouseEventHandlersKey = Symbol("mouseEventHandlers") as InjectionKey<MouseEventHandlers>

// MEMO: ノード選択との連携、複数選択してムーブなど

const MOVE_DETECTION_THRESHOLD = 3 // ドラッグを開始する感度

interface PointerState {
  pointerId: number // pointer ID provided by the event
  nodeId: string // grabbing node ID
  moveCounter: number // count for pointermove event occurred
  dragBasePosition: Position // drag started position
  nodeBasePosition: Position // node position at drag started
  latestPosition: Position // latest position
}
interface State {
  containerMoveCounter: number
  pointers: Map<number, PointerState> // <PointerId, ...>
  pointerIdForBoundNodes: number
  boundNodeBasePositions: { [name: string]: Position }
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
    container.value?.addEventListener("pointerdown", handleContainerPointerDownEvent)
  })

  onUnmounted(() => {
    container.value?.removeEventListener("pointerdown", handleContainerPointerDownEvent)
  })

  const state: State = {
    // mousedown 状態での移動イベント回数を測定し、mouseup 時の
    // クリック判定に用いる
    containerMoveCounter: 0,
    pointers: new Map(),
    pointerIdForBoundNodes: -1,
    boundNodeBasePositions: {},
    mouseDownEdgeId: undefined,
  }

  function handleContainerPointerDownEvent(_: PointerEvent) {
    state.containerMoveCounter = 0
    container.value?.addEventListener("pointermove", handleContainerPointerMoveEvent)
    container.value?.addEventListener("pointerup", handleContainerPointerUpEvent)
    container.value?.addEventListener("pointercancel", handleContainerPointerUpEvent)
  }

  function handleContainerPointerMoveEvent(_: PointerEvent) {
    state.containerMoveCounter++
  }

  function handleContainerPointerUpEvent(_: PointerEvent) {
    // TODO: 複数同じイベントがlistenされたらどうなる?
    container.value?.removeEventListener("pointermove", handleContainerPointerMoveEvent)
    container.value?.removeEventListener("pointerup", handleContainerPointerUpEvent)
    container.value?.removeEventListener("pointercancel", handleContainerPointerUpEvent)
    // TODO: 同時タッチ数に応じて選択解除かどうかを切り替える
    if (state.containerMoveCounter <= MOVE_DETECTION_THRESHOLD) {
      // Click container (without mouse move)
      selectedNodes.splice(0, selectedNodes.length)
      selectedEdges.splice(0, selectedEdges.length)
    }
  }

  // -----------------------------------------------------------------------
  // Event handler for nodes
  // -----------------------------------------------------------------------

  function handleNodeClickEvent(node: string, event: PointerEvent) {
    selectedEdges.splice(0, selectedEdges.length)

    if (styles.node.selectable) {
      const isTouchAnySelectedNode =
        Array.from(state.pointers.values()).filter(p => {
          return p.pointerId != event.pointerId && selectedNodes.includes(p.nodeId)
        }).length > 0
      if (event.shiftKey || isTouchAnySelectedNode) {
        // 複数選択
        const index = selectedNodes.indexOf(node)
        // const cloned = [...selectedNodes.value]
        if (index >= 0) {
          selectedNodes.splice(index, 1)
        } else {
          selectedNodes.push(node)
        }
      } else {
        // クリック操作: 選択中のノードをクリックされたノード1つにする
        selectedNodes.splice(0, selectedNodes.length, node)
      }
    }
    emitter.emit("node:click", { node, event })
  }

  function _updateSelectedNodes(pointerState: PointerState) {
    // update states
    const isBound = state.pointerIdForBoundNodes === pointerState.pointerId
    const isSelectedNode = selectedNodes.includes(pointerState.nodeId)
    if (!isBound && !isSelectedNode) {
      return
    }

    const removed = !(pointerState.pointerId in state.pointers)
    if ((isBound && removed) || (isBound && !isSelectedNode)) {
      // selected => unselected
      const s = Array.from(state.pointers.values()).find(p => selectedNodes.includes(p.nodeId))
      if (!s) {
        state.pointerIdForBoundNodes = -1
        state.boundNodeBasePositions = {}
        return
      }
      pointerState = s
      state.pointerIdForBoundNodes = pointerState.pointerId
    } else {
      const s = state.pointers.get(state.pointerIdForBoundNodes)
      if (!s) {
        state.pointerIdForBoundNodes = -1
        state.boundNodeBasePositions = {}
        return
      }
      pointerState = s
    }

    // bind selected nodes without user grabs
    const userGrabs = Array.from(state.pointers.values()).map(n => n.nodeId)
    state.boundNodeBasePositions = Object.fromEntries(
      selectedNodes
        .filter(n => !userGrabs.includes(n))
        .map(n => [n, _unwrapNodePosition(nodePositions, n)])
    )
    pointerState.dragBasePosition = { ...pointerState.latestPosition }
    pointerState.nodeBasePosition = _unwrapNodePosition(nodePositions, pointerState.nodeId)
  }

  watch(selectedNodes, () => {
    const pointerState = state.pointers.get(state.pointerIdForBoundNodes)
    if (pointerState) {
      _updateSelectedNodes(pointerState)
    }
  })

  function _calculateNodeNewPosition(pointerState: PointerState, event: PointerPosition) {
    const dx = pointerState.dragBasePosition.x - event.pageX
    const dy = pointerState.dragBasePosition.y - event.pageY

    const z = zoomLevel.value

    let positions: NodePositions
    if (state.pointerIdForBoundNodes == pointerState.pointerId) {
      positions = {
        [pointerState.nodeId]: pointerState.nodeBasePosition,
        ...state.boundNodeBasePositions,
      }
    } else {
      positions = { [pointerState.nodeId]: pointerState.nodeBasePosition }
    }
    return Object.fromEntries(
      Object.entries(positions).map(([node, pos]) => {
        return [
          node,
          {
            x: pos.x - dx / z,
            y: pos.y - dy / z,
          },
        ]
      })
    )
  }

  // TODO: Touch対応
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
      return
    }

    if (pointerState.moveCounter === MOVE_DETECTION_THRESHOLD + 1) {
      const draggingNodes = _calculateNodeNewPosition(pointerState, {
        pageX: 0,
        pageY: 0,
        pointerId: pointerState.pointerId,
      })
      emitter.emit("node:dragstart", draggingNodes)
    }
    const draggingNodes = _calculateNodeNewPosition(pointerState, event)
    emitter.emit("node:mousemove", draggingNodes)
  }

  function handleNodePointerCancelEvent(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()

    const pointerState = state.pointers.get(event.pointerId)
    if (!pointerState) {
      return
    }

    const node = pointerState.nodeId

    const isMoved = pointerState.moveCounter > MOVE_DETECTION_THRESHOLD
    if (isMoved) {
      // pageX/Y of cancel event are zero => use latest position
      const draggingNodes = _calculateNodeNewPosition(pointerState, {
        pageX: pointerState.latestPosition.x,
        pageY: pointerState.latestPosition.y,
        pointerId: pointerState.pointerId,
      })
      emitter.emit("node:dragend", draggingNodes)
    }
    emitter.emit("node:mouseup", { node, event })
    // No click event

    state.pointers.delete(event.pointerId)

    state.pointerIdForBoundNodes = -1
    state.boundNodeBasePositions = {}
    document.removeEventListener("pointermove", handleNodePointerMoveEvent)
    document.removeEventListener("pointerup", handleNodePointerUpEvent)
    document.removeEventListener("pointercancel", handleNodePointerCancelEvent)
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
      emitter.emit("node:mouseup", { node, event })
    } else {
      emitter.emit("node:mouseup", { node, event })
      handleNodeClickEvent(node, event)
    }

    if (state.pointers.size == 0) {
      state.pointerIdForBoundNodes = -1
      state.boundNodeBasePositions = {}
      document.removeEventListener("pointermove", handleNodePointerMoveEvent)
      document.removeEventListener("pointerup", handleNodePointerUpEvent)
      document.removeEventListener("pointercancel", handleNodePointerCancelEvent)
    } else {
      _updateSelectedNodes(pointerState)
    }
  }

  function handleNodePointerDownEvent(node: string, event: PointerEvent) {
    console.log("down", node, event.pointerId, event.pageX, event.pageY)
    event.preventDefault()
    event.stopPropagation()

    if (state.pointers.size == 0) {
      document.addEventListener("pointermove", handleNodePointerMoveEvent)
      document.addEventListener("pointerup", handleNodePointerUpEvent)
      document.addEventListener("pointercancel", handleNodePointerCancelEvent)
    }

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
      if (state.pointerIdForBoundNodes < 0) {
        state.pointerIdForBoundNodes = event.pointerId
        _updateSelectedNodes(pointerState)
      } else {
        // remove from bound
        delete state.boundNodeBasePositions[pointerState.nodeId]
      }
    }

    // TODO: event
    emitter.emit("node:mousedown", { node, event })
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
        // 複数選択
        const index = selectedEdges.indexOf(edge)
        if (index >= 0) {
          selectedEdges.splice(index, 1)
        } else {
          selectedEdges.push(edge)
        }
      } else {
        // クリック操作: 選択中のリンクをクリックされたリンク1つにする
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
