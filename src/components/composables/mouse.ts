// 選択状態とマウス操作を担当する機能

import { inject, InjectionKey, onMounted, onUnmounted, provide, Ref } from "@vue/runtime-core"
import { Emitter } from "mitt"
import { Events, NodePositions, nonNull, Position, Reactive, ReadonlyRef } from "@/common/types"
import { Styles } from "@/common/styles"

type NodeEventHandler = (node: string, event: MouseEvent) => void
type LinkEventHandler = (link: string, event: MouseEvent) => void

interface MouseEventHandlers {
  handleNodeMouseDownEvent: NodeEventHandler
  handleLinkMouseDownEvent: LinkEventHandler
}
const mouseEventHandlersKey = Symbol("mouseEventHandlers") as InjectionKey<MouseEventHandlers>

// MEMO: ノード選択との連携、複数選択してムーブなど

const MOVE_DETECTION_THRESHOLD = 3 // ドラッグを開始する感度

interface State {
  moveCounter: number
  dragBasePosition: Position
  nodeBasePositions: { [name: string]: Position }
  mouseDownNodeId: string | undefined
  mouseDownLinkId: string | undefined
}

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
  selectedLinks: Reactive<string[]>,
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
    mouseDownNodeId: undefined,
    mouseDownLinkId: undefined,
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
      selectedLinks.splice(0, selectedLinks.length)
    }
  }

  // -----------------------------------------------------------------------
  // Event handler for nodes
  // -----------------------------------------------------------------------

  function handleNodeClickEvent(node: string, event: MouseEvent) {
    const isMoved = state.moveCounter > MOVE_DETECTION_THRESHOLD
    if (isMoved) {
      return
    }

    selectedLinks.splice(0, selectedLinks.length)

    if (styles.node.selectable) {
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
  function handleNodeMouseMoveEvent(event: MouseEvent) {
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

  function handleNodeMouseUpEvent(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    document.removeEventListener("mousemove", handleNodeMouseMoveEvent)
    document.removeEventListener("mouseup", handleNodeMouseUpEvent)

    const node = state.mouseDownNodeId
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
        selectedNodes.map(n => [n, _unwrapNodePosition(nodePositions, n)])
      )
    } else {
      state.nodeBasePositions = { [node]: _unwrapNodePosition(nodePositions, node) }
    }
    document.addEventListener("mousemove", handleNodeMouseMoveEvent)
    document.addEventListener("mouseup", handleNodeMouseUpEvent)
    state.moveCounter = 0
    emitter.emit("node:mousedown", { node, event })
  }

  // -----------------------------------------------------------------------
  // Event handler for links
  // -----------------------------------------------------------------------

  function handleLinkMouseDownEvent(link: string, event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()

    state.mouseDownLinkId = link
    document.addEventListener("mouseup", handleLinkMouseUpEvent)
  }

  function handleLinkMouseUpEvent(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    document.removeEventListener("mouseup", handleLinkMouseUpEvent)

    const link = state.mouseDownLinkId
    if (link === undefined) {
      return
    }

    handleLinkClickEvent(link, event)
  }

  function handleLinkClickEvent(link: string, event: MouseEvent) {
    selectedNodes.splice(0, selectedNodes.length)

    if (styles.link.selectable) {
      if (event.shiftKey) {
        // 複数選択
        const index = selectedLinks.indexOf(link)
        if (index >= 0) {
          selectedLinks.splice(index, 1)
        } else {
          selectedLinks.push(link)
        }
      } else {
        // クリック操作: 選択中のリンクをクリックされたリンク1つにする
        selectedLinks.splice(0, selectedLinks.length, link)
      }
    }
    emitter.emit("link:click", { link, event })
  }

  provide(mouseEventHandlersKey, {
    handleNodeMouseDownEvent,
    handleLinkMouseDownEvent,
  })
}

export function useMouseOperation(): MouseEventHandlers {
  return nonNull(inject(mouseEventHandlersKey))
}
