// 選択状態とマウス操作を担当する機能

import {
  inject,
  InjectionKey,
  onMounted,
  onUnmounted,
  provide,
  Ref,
  toRef,
} from "@vue/runtime-core"
import { Emitter } from "mitt"
import { Events, NodePositions, nonNull, Position } from "../common/types"

type NodeEventHandler = (node: string, event: MouseEvent) => void
const nodeMouseDownKey = Symbol("mouseDownOnNode") as InjectionKey<NodeEventHandler>

// MEMO: ノード選択との連携、複数選択してムーブなど

const MOVE_DETECTION_THRESHOLD = 3 // ドラッグを開始する感度

export function provideMouseOperation(
  container: Ref<SVGElement | undefined>,
  nodePositions: NodePositions,
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

  // mousedown 状態での移動イベント回数を測定し、mouseup 時の
  // クリック判定に用いる
  let moveCounter = 0

  function handleContainerMouseDownEvent(_: MouseEvent) {
    moveCounter = 0
    container.value?.addEventListener("mousemove", handleContainerMouseMoveEvent)
    container.value?.addEventListener("mouseup", handleContainerMouseUpEvent)
  }

  function handleContainerMouseMoveEvent(_: MouseEvent) {
    moveCounter++
  }

  function handleContainerMouseUpEvent(_: MouseEvent) {
    container.value?.removeEventListener("mousemove", handleContainerMouseMoveEvent)
    container.value?.removeEventListener("mouseup", handleContainerMouseUpEvent)
    if (moveCounter <= MOVE_DETECTION_THRESHOLD) {
      // Click container (without mouse move)
      selectedNodes.splice(0, selectedNodes.length)
    }
  }

  const dragBasePosition: Position = { x: 0, y: 0 }
  let nodeBasePositions: { [name: string]: Position } = {}
  let currentNodePositions: { [name: string]: Ref<Position> } = {}
  let mouseDownNodeId: string | undefined = undefined

  function handleNodeClickEvent(node: string, event: MouseEvent) {
    const isMoved = moveCounter > MOVE_DETECTION_THRESHOLD
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
    emitter.emit("node:click", node)
  }

  // TODO: Touch対応
  function handleMouseMoveEvent(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    moveCounter++

    if (moveCounter <= MOVE_DETECTION_THRESHOLD) {
      return
    }

    const draggingNodes = Object.keys(currentNodePositions)
    if (moveCounter === MOVE_DETECTION_THRESHOLD + 1) {
      emitter.emit("node:dragstart", draggingNodes)
    }
    const dx = dragBasePosition.x - event.pageX
    const dy = dragBasePosition.y - event.pageY
    for (const [node, pos] of Object.entries(nodeBasePositions)) {
      currentNodePositions[node].value = {
        x: pos.x - dx / zoomLevel.value,
        y: pos.y - dy / zoomLevel.value,
      }
    }

    emitter.emit("node:mousemove", draggingNodes)
  }

  function handleMouseUpEvent(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    document.removeEventListener("mousemove", handleMouseMoveEvent)
    document.removeEventListener("mouseup", handleMouseUpEvent)

    if (mouseDownNodeId === undefined) {
      return
    }

    const draggingNodes = Object.keys(currentNodePositions)
    const isMoved = moveCounter > MOVE_DETECTION_THRESHOLD
    if (isMoved) {
      emitter.emit("node:dragend", draggingNodes)
      emitter.emit("node:mouseup", mouseDownNodeId)
      return
    }

    emitter.emit("node:mouseup", mouseDownNodeId)
    handleNodeClickEvent(mouseDownNodeId, event)
  }

  function handleNodeMouseDownEvent(node: string, event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    dragBasePosition.x = event.pageX
    dragBasePosition.y = event.pageY
    mouseDownNodeId = node
    if (selectedNodes.includes(node)) {
      currentNodePositions = Object.fromEntries(
        selectedNodes.map(n => [n, toRef(nodePositions, n)])
      )
    } else {
      currentNodePositions = { [node]: toRef(nodePositions, node) }
    }
    for (const pos of Object.values(currentNodePositions)) {
      if (!pos.value) {
        pos.value = { x: 0, y: 0 }
      }
    }
    nodeBasePositions = Object.fromEntries(
      Object.entries(currentNodePositions).map(([n, p]) => [n, { x: p.value.x, y: p.value.y }])
    )
    document.addEventListener("mousemove", handleMouseMoveEvent)
    document.addEventListener("mouseup", handleMouseUpEvent)
    moveCounter = 0
    emitter.emit("node:mousedown", node)
  }

  provide(nodeMouseDownKey, handleNodeMouseDownEvent)
}

export function useMouseOperation() {
  return {
    handleNodeMouseDownEvent: nonNull(inject(nodeMouseDownKey)),
  }
}
