// Module responsible for selection state and mouse/touch operations

import { Emitter } from "mitt"
import type { InjectionKey, Ref } from "vue"
import { inject, provide, ref, watch } from "vue"
import { nonNull, Reactive, ReadonlyRef } from "@/common/common"
import { Configs } from "@/common/configs"
import { Events, Position, Rectangle } from "@/common/types"
import { EdgeStates } from "@/models/edge"
import { NodeStates } from "@/models/node"
import { PathStates } from "@/models/path"
import { entriesOf } from "@/utils/object"
import { BoxSelectionOption, makeBoxSelectionMethods } from "./boxSelection"
import { setupContainerInteractionHandlers } from "./container"
import { InteractionModes } from "./core"
import { makeEdgeInteractionHandlers } from "./edge"
import { makeNodeInteractionHandlers } from "./node"
import { makePathInteractionHandlers } from "./path"

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
  positionOf: (node: string) => Position,
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

  // The last of nodes, edges and paths wins, as when an update selects them all at once.
  if (selectedPaths.size > 0) {
    modes.selectionMode.value = "path"
  } else if (selectedEdges.size > 0) {
    modes.selectionMode.value = "edge"
  } else if (selectedNodes.size > 0) {
    modes.selectionMode.value = "node"
  }

  // The selectionMode watchers miss a mode that switches and comes back within one tick, so
  // clear the other kinds here too. "post" runs it after the per-kind watchers have set the mode.
  const selections = { node: selectedNodes, edge: selectedEdges, path: selectedPaths }
  watch(
    [selectedNodes, selectedEdges, selectedPaths],
    () => {
      entriesOf(selections).forEach(([kind, selected]) => {
        if (kind !== modes.selectionMode.value && selected.size > 0) {
          selected.clear()
        }
      })
    },
    { flush: "post", immediate: true }
  )

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
      positionOf,
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
    ...makeBoxSelectionMethods(container, modes, positionOf, nodeStates, selectedNodes, configs),
  }
  provide(mouseEventHandlersKey, provides)
  return provides
}

export function useMouseOperation(): MouseEventHandlers {
  return nonNull(inject(mouseEventHandlersKey), "mouseEventHandlers")
}
