// Wires the states of nodes, edges and paths together

import type { ComputedRef, InjectionKey, Ref } from "vue"
import {
  reactive,
  ref,
  shallowRef,
  toRaw,
  triggerRef,
  watch,
  watchEffect,
  inject,
  provide,
} from "vue"
import { nonNull, Reactive } from "@/common/common"
import { Configs } from "@/common/configs"
import { Edge, Edges, Layouts, Node, Nodes, Path, Paths } from "@/common/types"
import { UserLayouts } from "@/common/types"
import { useId } from "@/composables/id"
import * as EdgeModel from "@/models/edge"
import * as NodeModel from "@/models/node"
import * as PathModel from "@/models/path"
import * as EdgeGroup from "@/modules/edge/group"
import { makeEdgePlacement } from "./edgePlacement"
import { createEdgeEntries, createNewEdgeState, createSummarizedEdgeStates } from "./edgeState"
import { MarkerState } from "./marker"
import { createNewNodeState, makeOpposingNodes } from "./nodeState"
import { useObjectState } from "./objectState"
import { createNewPathState } from "./pathState"
import { trackNodePositions } from "./positionTracker"
import type { PositionChanges } from "./positionWriter"

// -----------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------

export type { EdgeGroupStates } from "@/models/edge"

interface States {
  nodeStates: NodeModel.NodeStates
  edgeStates: EdgeModel.EdgeStates
  edgeGroupStates: EdgeModel.EdgeGroupStates
  summarizedEdgeStates: EdgeModel.SummarizedEdgeStates
  pathStates: PathModel.PathStates
  nodeZOrderedList: ComputedRef<NodeModel.NodeState[]>
  edgeZOrderedList: ComputedRef<EdgeModel.EdgeEntry[]>
  pathZOrderedList: ComputedRef<PathModel.PathState[]>
  layouts: Layouts
}

export type ReadonlyStates = Readonly<States>

interface InputObjects<T> {
  objects: Ref<T>
  selected: Reactive<Set<string>>
  hovered: Reactive<Set<string>>
}

export function makeStateInput<T>(
  objects: Ref<T>,
  selected: Reactive<Set<string>>,
  hovered: Reactive<Set<string>>
) {
  return {
    objects,
    selected,
    hovered,
  }
}

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------

const statesKey = Symbol("states") as InjectionKey<States>

// -----------------------------------------------------------------------
// Exported functions
// -----------------------------------------------------------------------

export function provideStates(
  nodes: InputObjects<Nodes>,
  edges: InputObjects<Edges>,
  paths: InputObjects<Paths>,
  configs: Readonly<Configs>,
  layouts: Reactive<Layouts>,
  givenLayouts: () => Readonly<UserLayouts>,
  makerState: MarkerState,
  scale: ComputedRef<number>
) {
  const summarizedEdgeStates = reactive<EdgeModel.SummarizedEdgeStates>({})

  // -----------------------------------------------------------------------
  // States for nodes
  // -----------------------------------------------------------------------

  const opposingNodes = makeOpposingNodes(nodes.objects, edges.objects)

  const {
    states: nodeStates,
    zOrderedList: nodeZOrderedList, //
  } = useObjectState<Node, NodeModel.NodeStateDatum, NodeModel.NodeState>(
    nodes.objects,
    configs.node,
    nodes.selected,
    nodes.hovered,
    (nodes, id, newState) => {
      createNewNodeState(
        nodes,
        id,
        newState as NodeModel.NodeStateDatum,
        configs.node,
        opposingNodes,
        layouts,
        givenLayouts
      )
    },
    (nodeId, _state) => {
      const positions = layouts.nodes
      delete positions[nodeId]
    }
  )

  // -----------------------------------------------------------------------
  // States for edges
  // -----------------------------------------------------------------------
  // Instance ID number for using to make marker ID generation unique for the
  // entire page.
  // If the same marker ID exists in the previous instance and is hidden by
  // `display: none`, the marker in the other instance will disappear.
  // To be safe, markers should be unique in the entire page.
  const instanceId = useId()

  // grouping
  const edgeGroupStates = EdgeGroup.makeEdgeGroupStates(nodes.objects, edges.objects, configs)

  // edge entries for applying z-order
  const edgeEntries = ref<EdgeModel.EdgeEntry[]>([])

  const positionChanges: PositionChanges = {
    nodes: new Set(),
    edges: new Set(),
    changed: shallowRef(),
  }
  const edgePlacement = makeEdgePlacement(
    edges.objects,
    configs.edge,
    nodeStates,
    edgeGroupStates,
    layouts,
    scale,
    positionChanges
  )

  const {
    states: edgeStates,
    zOrderedList: edgeZOrderedList, //
  } = useObjectState<Edge, EdgeModel.EdgeStateDatum, EdgeModel.EdgeEntry>(
    edges.objects,
    configs.edge,
    edges.selected,
    edges.hovered,
    (edges, id, newState) => {
      createNewEdgeState(
        edges,
        id,
        newState as EdgeModel.EdgeStateDatum,
        configs.edge,
        makerState,
        instanceId,
        edgePlacement
      )
    },
    (_edgeId, state) => {
      state.stopWatchHandle?.()
    },
    () => edgeEntries.value
  )

  // After the states of the edges given at mount, so that in a flush it runs after their effects.
  edgePlacement.followStyleChanges()

  // Re-places only the edges of the moved nodes, rather than every edge following the positions of
  // its own nodes.
  const layoutsChanged = trackNodePositions(layouts, nodes.objects, moved => {
    const movedEdges = new Set<string>()
    moved.forEach(id => {
      positionChanges.nodes.add(id)
      Object.keys(toRaw(opposingNodes)[id] ?? {}).forEach(edgeId => movedEdges.add(edgeId))
    })
    edgePlacement.placeEdges(movedEdges)
    triggerRef(positionChanges.changed)
  })

  // Edge item for display (an edge or summarized edges)
  watchEffect(() => {
    edgeEntries.value = createEdgeEntries(edgeGroupStates.edgeGroups, edgeStates)
  })

  watch(
    edgeGroupStates.edgeGroups,
    _ => createSummarizedEdgeStates(summarizedEdgeStates, edgeGroupStates, configs),
    { immediate: true }
  )

  // -----------------------------------------------------------------------
  // States for paths
  // -----------------------------------------------------------------------

  const {
    states: pathStates,
    zOrderedList: pathZOrderedList, //
  } = useObjectState<Path, PathModel.PathStateDatum, PathModel.PathState>(
    paths.objects,
    configs.path,
    paths.selected,
    paths.hovered,
    (paths, id, newState) => {
      createNewPathState(
        paths,
        id,
        newState as PathModel.PathStateDatum,
        configs.path,
        edges.objects,
        edgeGroupStates
      )
    },
    (_, state) => {
      state.stopWatchHandle?.()
    }
  )

  const states = <States>{
    nodeStates,
    edgeStates,
    edgeGroupStates,
    summarizedEdgeStates,
    pathStates,
    layouts,
    nodeZOrderedList,
    edgeZOrderedList,
    pathZOrderedList,
  }
  provide(statesKey, states)
  return {
    ...states,
    positionChanges,
    layoutsChanged,
    edgeGeometries: edgePlacement.geometries,
  }
}

export function isSummarizedEdges(item: EdgeModel.EdgeItem): item is EdgeModel.SummarizedEdgeItem {
  return item.summarized
}

export function useStates() {
  return nonNull(inject(statesKey), "states") as ReadonlyStates
}
