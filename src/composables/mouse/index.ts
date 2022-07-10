// Module responsible for selection state and mouse/touch operations

import { inject, InjectionKey, provide, ref, Ref, watch } from "vue"
import { Emitter } from "mitt"
import { nonNull, Reactive, ReadonlyRef } from "@/common/common"
import { Events, Layouts, Rectangle } from "@/common/types"
import { NodeStates } from "@/models/node"
import { EdgeStates } from "@/models/edge"
import { InteractionModes } from "./core"
import { makeNodeInteractionHandlers } from "./node"
import { makeEdgeInteractionHandlers } from "./edge"
import { setupContainerInteractionHandlers } from "./container"
import { PathStates } from "@/models/path"
import { makePathInteractionHandlers } from "./path"
import { BoxSelectionOption, makeBoxSelectionMethods } from "./boxSelection"
import { Configs, ViewConfig } from "@/common/configs"

type NodeEventHandler<T extends Event = PointerEvent> = (node: string, event: T) => void
type EdgeEventHandler<T extends Event = PointerEvent> = (edge: string, event: T) => void
type EdgesEventHandler<T extends Event = PointerEvent> = (edges: string[], event: T) => void
type PathEventHandler<T extends Event = PointerEvent> = (path: string, event: T) => void

interface MouseEventHandlers {
  selectedNodes: Reactive<Set<string>>
  hoveredNodes: Reactive<Set<string>>
  selectedEdges: Reactive<Set<string>>
  hoveredEdges: Reactive<Set<string>>
  selectedPaths: Reactive<Set<string>>
  hoveredPaths: Reactive<Set<string>>

  // for Nodes
  handleNodePointerDownEvent: NodeEventHandler
  handleNodePointerOverEvent: NodeEventHandler
  handleNodePointerOutEvent: NodeEventHandler
  handleNodeClickEvent: NodeEventHandler<MouseEvent>
  handleNodeDoubleClickEvent: NodeEventHandler<MouseEvent>
  handleNodeContextMenu: NodeEventHandler<MouseEvent>

  // for Edges
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

  // for Paths
  handlePathPointerDownEvent: PathEventHandler
  handlePathPointerOverEvent: PathEventHandler
  handlePathPointerOutEvent: PathEventHandler
  handlePathClickEvent: PathEventHandler<MouseEvent>
  handlePathDoubleClickEvent: PathEventHandler<MouseEvent>
  handlePathContextMenu: PathEventHandler<MouseEvent>

  // for Box Selection
  isBoxSelectionMode: Ref<boolean>
  selectionBox: Ref<Rectangle>
  startBoxSelection: (options?: Partial<BoxSelectionOption>) => void
  stopBoxSelection: () => void
}
const mouseEventHandlersKey = Symbol("mouseEventHandlers") as InjectionKey<MouseEventHandlers>

export function provideMouseOperation(
  container: Ref<SVGElement | undefined>,
  layouts: Readonly<Layouts>,
  zoomLevel: ReadonlyRef<number>,
  nodeStates: NodeStates,
  edgeStates: EdgeStates,
  pathStates: PathStates,
  selectedNodes: Reactive<Set<string>>,
  selectedEdges: Reactive<Set<string>>,
  selectedPaths: Reactive<Set<string>>,
  hoveredNodes: Reactive<Set<string>>,
  hoveredEdges: Reactive<Set<string>>,
  hoveredPaths: Reactive<Set<string>>,
  isInCompatibilityModeForPath: Ref<boolean>,
  isSvgWheelZoomEnabled: Ref<boolean>,
  configs: Configs,
  emitter: Emitter<Events>
): MouseEventHandlers {
  const modes: InteractionModes = {
    selectionMode: ref("container"),
    viewMode: ref("default"),
  }

  if (selectedNodes.size > 0) {
    modes.selectionMode.value = "node"
  } else if (selectedEdges.size > 0) {
    modes.selectionMode.value = "edge"
  } else if (selectedPaths.size > 0) {
    modes.selectionMode.value = "path"
  }

  watch(modes.viewMode, mode => {
    emitter.emit("view:mode", mode)
  })

  setupContainerInteractionHandlers(container, modes, isSvgWheelZoomEnabled, emitter)

  const provides = <MouseEventHandlers>{
    selectedNodes,
    hoveredNodes,
    selectedEdges,
    hoveredEdges,
    selectedPaths,
    hoveredPaths,
    ...makeNodeInteractionHandlers(
      nodeStates,
      layouts,
      modes,
      hoveredNodes,
      selectedNodes,
      zoomLevel,
      emitter
    ),
    ...makeEdgeInteractionHandlers(edgeStates, modes, hoveredEdges, selectedEdges, emitter),
    ...makePathInteractionHandlers(
      pathStates,
      modes,
      hoveredPaths,
      selectedPaths,
      isInCompatibilityModeForPath,
      emitter
    ),
    ...makeBoxSelectionMethods(
      container,
      modes,
      layouts,
      nodeStates,
      selectedNodes,
      configs
    ),
  }
  provide(mouseEventHandlersKey, provides)
  return provides
}

export function useMouseOperation(): MouseEventHandlers {
  return nonNull(inject(mouseEventHandlersKey), "mouseEventHandlers")
}
