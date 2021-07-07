// 選択状態とマウス操作を担当する機能

import {
  inject,
  InjectionKey,
  onMounted,
  onUnmounted,
  provide,
  Ref,
} from "@vue/runtime-core"
import { Emitter } from "mitt"
import { Events, NodePositions, nonNull, Position } from "../common/types"

type NodeEventHandler = (node: string, event: MouseEvent) => void
const nodeMouseDownKey = Symbol("mouseDownOnNode") as InjectionKey<NodeEventHandler>

// MEMO: ノード選択との連携、複数選択してムーブなど

const MOVE_DETECTION_THRESHOLD = 3 // ドラッグを開始する感度

interface State {
  moveCounter: number
  dragBasePosition: Position
  nodeBasePositions: { [name: string]: Position },
  mouseDownNodeId: string | undefined
}

function _unwrappedNodePosition(nodes: Readonly<NodePositions>, node: string) {
  const pos = nodes?.[node] ?? { x: 0, y: 0 }
  return { ...pos } // unwrap reactivity
}

export function provideMouseOperation(
  container: Ref<SVGElement | undefined>,
  nodePositions: Readonly<NodePositions>,
  zoomLevel: Ref<number>,
  selectable: Ref<boolean>,
  selectedNodes: string[],
  emitter: Emitter<Events>
): void {
  onMounted(() => {
    container.value?.addEventListener("mousedown", handleContainerMouseDownEvent)
  })

  onUnmounted(() => {
    container.value?.removeEventListener("mousedown", handleContainerMouseDownEvent)
  })

  const state: State = {
    // mousedown 状態での移動イベント回数を測定し、mouseup 時の
    // クリック判定に用いる
    moveCounter: 0,
    dragBasePosition: { x: 0, y: 0 },
    nodeBasePositions: {},
    mouseDownNodeId: undefined
  }

  function handleContainerMouseDownEvent(_: MouseEvent) {
    state.moveCounter = 0
    container.value?.addEventListener("mousemove", handleContainerMouseMoveEvent)
    container.value?.addEventListener("mouseup", handleContainerMouseUpEvent)
  }

  function handleContainerMouseMoveEvent(_: MouseEvent) {
    state.moveCounter++
  }

  function handleContainerMouseUpEvent(_: MouseEvent) {
    container.value?.removeEventListener("mousemove", handleContainerMouseMoveEvent)
    container.value?.removeEventListener("mouseup", handleContainerMouseUpEvent)
    if (state.moveCounter <= MOVE_DETECTION_THRESHOLD) {
      // Click container (without mouse move)
      selectedNodes.splice(0, selectedNodes.length)
    }
  }

  function handleNodeClickEvent(node: string, event: MouseEvent) {
    const isMoved = state.moveCounter > MOVE_DETECTION_THRESHOLD
    if (isMoved) {
      return
    }
    if (selectable.value) {
      if (event.shiftKey) {
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

  function calculateNodeNewPosition(event: MouseEvent) {
    const dx = state.dragBasePosition.x - event.pageX
    const dy = state.dragBasePosition.y - event.pageY
    return Object.fromEntries(
      Object.entries(state.nodeBasePositions).map(([node, pos]) => {
        return [
          node,
          {
            x: pos.x - dx / zoomLevel.value,
            y: pos.y - dy / zoomLevel.value,
          },
        ]
      })
    )
  }

  // TODO: Touch対応
  function handleMouseMoveEvent(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    state.moveCounter++

    if (state.moveCounter <= MOVE_DETECTION_THRESHOLD) {
      return
    }

    if (state.moveCounter === MOVE_DETECTION_THRESHOLD + 1) {
      emitter.emit("node:dragstart", state.nodeBasePositions)
    }
    const draggingNodes = calculateNodeNewPosition(event)
    emitter.emit("node:mousemove", draggingNodes)
  }

  function handleMouseUpEvent(event: MouseEvent) {
    const node = state.mouseDownNodeId
    event.preventDefault()
    event.stopPropagation()
    document.removeEventListener("mousemove", handleMouseMoveEvent)
    document.removeEventListener("mouseup", handleMouseUpEvent)

    if (node === undefined) {
      return
    }

    const isMoved = state.moveCounter > MOVE_DETECTION_THRESHOLD
    if (isMoved) {
      const draggingNodes = calculateNodeNewPosition(event)
      emitter.emit("node:dragend", draggingNodes)
      emitter.emit("node:mouseup", { node, event })
      return
    }

    emitter.emit("node:mouseup", { node, event })
    handleNodeClickEvent(node, event)
  }

  function handleNodeMouseDownEvent(node: string, event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    state.dragBasePosition.x = event.pageX
    state.dragBasePosition.y = event.pageY
    state.mouseDownNodeId = node
    if (selectedNodes.includes(node)) {
      state.nodeBasePositions = Object.fromEntries(
        selectedNodes.map(n => [n, _unwrappedNodePosition(nodePositions, n)])
      )
    } else {
      state.nodeBasePositions = { [node]: _unwrappedNodePosition(nodePositions, node) }
    }
    document.addEventListener("mousemove", handleMouseMoveEvent)
    document.addEventListener("mouseup", handleMouseUpEvent)
    state.moveCounter = 0
    emitter.emit("node:mousedown", { node, event })
  }

  provide(nodeMouseDownKey, handleNodeMouseDownEvent)
}

export function useMouseOperation() {
  return {
    handleNodeMouseDownEvent: nonNull(inject(nodeMouseDownKey)),
  }
}
