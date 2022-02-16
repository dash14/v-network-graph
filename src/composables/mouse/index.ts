// Module responsible for selection state and mouse/touch operations

import { inject, InjectionKey, provide, Ref } from "vue"
import { Emitter } from "mitt"
import { nonNull, Reactive, ReadonlyRef } from "@/common/common"
import { Events, NodePositions } from "@/common/types"
import { NodeStates } from "@/models/node"
import { EdgeStates } from "@/models/edge"
import { InteractionState } from "./core"
import { makeNodeInteractionHandlers } from "./node"
import { makeEdgeInteractionHandlers } from "./edge"
import { setupContainerInteractionHandlers } from "./container"

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
  const state: InteractionState = {
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

  setupContainerInteractionHandlers(container, state, selectedNodes, selectedEdges, emitter)

  const provides = <MouseEventHandlers>{
    selectedNodes,
    hoveredNodes,
    selectedEdges,
    hoveredEdges,
    ...makeNodeInteractionHandlers(
      nodeStates,
      nodePositions,
      state,
      selectedNodes,
      selectedEdges,
      zoomLevel,
      emitter
    ),
    ...makeEdgeInteractionHandlers(edgeStates, state, selectedNodes, selectedEdges, emitter),
  }
  provide(mouseEventHandlersKey, provides)
  return provides
}

export function useMouseOperation(): MouseEventHandlers {
  return nonNull(inject(mouseEventHandlersKey), "mouseEventHandlers")
}
