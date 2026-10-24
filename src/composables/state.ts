// the states of nodes and edges

import { isEqual } from "lodash-es"
import type { ComputedRef, InjectionKey, ReactiveEffectRunner, Ref } from "vue"
import {
  computed,
  effect,
  reactive,
  ref,
  shallowRef,
  toRaw,
  toRef,
  triggerRef,
  unref,
  watch,
  watchEffect,
  inject,
  provide,
  stop,
} from "vue"
import { nonNull, Reactive } from "@/common/common"
import {
  Config,
  Configs,
  EdgeConfig,
  MarkerStyle,
  NodeConfig,
  OppositeNode,
} from "@/common/configs"
import { StrokeStyle } from "@/common/configs"
import { Edge, Edges, Layouts, Node, Nodes, Path, Paths } from "@/common/types"
import { FixablePosition, UserLayouts } from "@/common/types"
import { Position } from "@/common/types"
import { useId } from "@/composables/id"
import * as EdgeModel from "@/models/edge"
import * as NodeModel from "@/models/node"
import * as PathModel from "@/models/path"
import { calculateDirectionsOfPathEdges } from "@/modules/calculation/path"
import { calculateEdgeGeometry } from "@/modules/edge/geometry"
import * as EdgeGroup from "@/modules/edge/group"
import { updateObjectDiff } from "@/utils/object"
import { MarkerState, useMarker } from "./marker"
import { useObjectState } from "./objectState"

// -----------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------

export type { EdgeGroupStates } from "@/models/edge"

// States of nodes

// Provide states

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

/** The nodes and edges whose positions changed since the last time they were taken. */
export interface PositionChanges {
  nodes: Set<string>
  edges: Set<string>
  /** Triggered when ids are added. */
  changed: Ref<void>
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

const NONE_MARKER: MarkerStyle = {
  type: "none",
  width: 0,
  height: 0,
  margin: 0,
  offset: 0,
  units: "strokeWidth",
  color: null,
}

// -----------------------------------------------------------------------
// Exported functions
// -----------------------------------------------------------------------

export function provideStates(
  nodes: InputObjects<Nodes>,
  edges: InputObjects<Edges>,
  paths: InputObjects<Paths>,
  configs: Readonly<Configs>,
  layouts: Reactive<Layouts>,
  readonlyLayouts: Readonly<UserLayouts>,
  makerState: MarkerState,
  scale: ComputedRef<number>
) {
  const summarizedEdgeStates = reactive<EdgeModel.SummarizedEdgeStates>({})

  // -----------------------------------------------------------------------
  // States for nodes
  // -----------------------------------------------------------------------

  // { nodeId: { edgeId: opposingNodeId } }
  const opposingNodes = Reactive<Record<string, Record<string, string>>>({})
  watchEffect(() => {
    const _nodes = Object.fromEntries(
      Object.keys(nodes.objects.value).map(k => [k, {} as Record<string, string>])
    )
    Object.entries(edges.objects.value).forEach(([id, e]) => {
      if (!_nodes?.[e.source]) _nodes[e.source] = {}
      if (!_nodes?.[e.target]) _nodes[e.target] = {}
      _nodes[e.source][id] = e.target
      _nodes[e.target][id] = e.source
    })
    updateObjectDiff(opposingNodes, _nodes)
  })

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
        readonlyLayouts
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
  const edgePlacers = new Map<string, ReactiveEffectRunner>()
  const dirtyEdges = new Set<string>()
  const edgesDirty = shallowRef(0)
  const edgePlacement: EdgePlacement = {
    placers: edgePlacers,
    schedule: id => {
      dirtyEdges.add(id)
      triggerRef(edgesDirty)
    },
  }
  const placeEdges = (ids: Set<string>, onlyIfDirty = false) => {
    let placed = false
    ids.forEach(id => {
      const place = edgePlacers.get(id)
      if (!place || (onlyIfDirty && !place.effect.dirty)) return
      place()
      positionChanges.edges.add(id)
      placed = true
    })
    if (placed) triggerRef(positionChanges.changed)
  }

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
        nodeStates,
        edgeGroupStates,
        layouts,
        scale,
        instanceId,
        edgePlacement
      )
    },
    (_edgeId, state) => {
      state.stopWatchHandle?.()
    },
    () => edgeEntries.value
  )

  // Re-place the edges whose own dependencies changed, together in one pass.
  watchEffect(() => {
    void edgesDirty.value
    if (dirtyEdges.size === 0) return
    // Taken out first, so that an edge scheduled again while placing stays for the next pass.
    const ids = new Set(dirtyEdges)
    dirtyEdges.clear()
    // A computed dependency notifies without knowing whether its value changed.
    placeEdges(ids, true)
  })

  // Positions change on every layout tick, so one effect follows them all and re-places only the
  // edges of the moved nodes, rather than every edge following the positions of its own nodes.
  const placedPositions = new Map<string, Position>()
  watchEffect(() => {
    const positions = layouts.nodes
    const moved = new Set<string>()
    const markMoved = (id: string) => {
      positionChanges.nodes.add(id)
      Object.keys(toRaw(opposingNodes)[id] ?? {}).forEach(edgeId => moved.add(edgeId))
    }
    let count = 0
    for (const id in positions) {
      count++
      const { x, y } = positions[id] ?? { x: 0, y: 0 }
      const placed = placedPositions.get(id)
      if (placed?.x === x && placed?.y === y) continue
      placedPositions.set(id, { x, y })
      markMoved(id)
    }
    // Every id seen is in the map, so a larger map holds removed nodes.
    if (placedPositions.size > count) {
      const rawPositions = toRaw(positions)
      placedPositions.forEach((_, id) => {
        if (id in rawPositions) return
        placedPositions.delete(id)
        // A node can stay without a position, and is then drawn at the origin. A removed one is
        // left as it is, since it may still be leaving with a transition.
        if (id in toRaw(nodes.objects.value)) markMoved(id)
      })
    }
    placeEdges(moved)
    if (positionChanges.nodes.size > 0) triggerRef(positionChanges.changed)
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
      const state = newState as PathModel.PathStateDatum

      state.clickable = computed(() => {
        if (!paths.value[id]) return false
        return Config.value(configs.path.clickable, paths.value[id])
      })
      state.hoverable = computed(() => {
        if (!paths.value[id]) return false
        return Config.value(configs.path.hoverable, paths.value[id])
      })

      // Follows the edges of the path and their source and target.
      state.stopWatchHandle = watchEffect(() => {
        if (!paths.value[id]) return
        state.path = paths.value[id]
        const pathEdges = toEdgeObjects(state.path, edges, edgeGroupStates)
        // Keep the arrays when unchanged, so that the path is not redrawn.
        if (!isEqual(pathEdges, state.edges)) state.edges = pathEdges
        const directions = calculateDirectionsOfPathEdges(pathEdges)
        if (!isEqual(directions, state.directions)) state.directions = directions
      })
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
  return { ...states, positionChanges }
}

export function isSummarizedEdges(item: EdgeModel.EdgeItem): item is EdgeModel.SummarizedEdgeItem {
  return item.summarized
}

export function useStates() {
  return nonNull(inject(statesKey), "states") as ReadonlyStates
}

// -----------------------------------------------------------------------
// Local functions
// -----------------------------------------------------------------------

function getNodeShape(node: Node, selected: boolean, hovered: boolean, config: NodeConfig) {
  if (hovered && config.hover) {
    return Config.values(config.hover, node)
  } else {
    return getNodeStaticShape(node, selected, config)
  }
}

function getNodeStaticShape(node: Node, selected: boolean, config: NodeConfig) {
  // get shape without hovered state
  if (selected) {
    return Config.values(config.selected, node)
  } else {
    return Config.values(config.normal, node)
  }
}

function createNewNodeState(
  nodes: Ref<Nodes>,
  id: string,
  state: NodeModel.NodeStateDatum,
  config: NodeConfig,
  oppositeNodeIds: Reactive<Record<string, Record<string, string>>>,
  layouts: Reactive<Layouts>,
  readonlyLayouts: Readonly<UserLayouts>
) {
  // Deleted nodes will lose their position. If it is not a two-way binding,
  // the position remains in the layout specified by the user and is reacquired.
  if (!layouts.nodes[id] && readonlyLayouts.nodes?.[id]) {
    layouts.nodes[id] = <FixablePosition>{ ...readonlyLayouts.nodes?.[id] }
  }

  state.shape = computed(() => {
    if (!nodes.value[id]) return unref(state.shape) // Return the previous value
    return getNodeShape(nodes.value[id], state.selected, state.hovered, config)
  })

  state.staticShape = computed(() => {
    if (!nodes.value[id]) return unref(state.staticShape) // Return the previous value
    return getNodeStaticShape(nodes.value[id], state.selected, config)
  })

  state.label = computed(() => {
    if (!nodes.value[id]) return unref(state.label) // Return the previous value
    return Config.values(config.label, nodes.value[id])
  })

  state.labelText = computed(() => {
    if (config.label.text instanceof Function) {
      return unref(state.label).text
    } else {
      if (!nodes.value[id]) return unref(state.labelText) // Return the previous value
      return nodes.value[id]?.[unref(state.label).text] ?? ""
    }
  })

  state.draggable = computed(() => {
    if (!nodes.value[id]) return unref(state.draggable) // Return the previous value
    return Config.value(config.draggable, nodes.value[id])
  })

  state.oppositeNodeIds = toRef(oppositeNodeIds, id)

  state.oppositeNodes = computed<Record<string, OppositeNode>>(() => {
    return Object.entries(state.oppositeNodeIds).reduce(
      (nodes, entry) => {
        const [edgeId, nodeId] = entry as [string, string]
        const pos = layouts.nodes[nodeId]
        if (pos) nodes[edgeId] = { nodeId, pos: { ...pos } }
        return nodes
      },
      {} as Record<string, OppositeNode>
    )
  })
}

function getEdgeStroke(edge: Edge, selected: boolean, hovered: boolean, config: EdgeConfig) {
  if (selected) {
    return Config.values(config.selected, edge)
  } else if (hovered && config.hover) {
    return Config.values(config.hover, edge)
  } else {
    return Config.values(config.normal, edge)
  }
}

function toEdgeMarker(marker: MarkerStyle): MarkerStyle {
  if (marker.type === "none") {
    return NONE_MARKER
  } else {
    return marker
  }
}

interface EdgePlacement {
  placers: Map<string, ReactiveEffectRunner>
  schedule: (id: string) => void
}

function createNewEdgeState(
  edges: Ref<Edges>,
  id: string,
  state: EdgeModel.EdgeStateDatum,
  config: EdgeConfig,
  makerState: MarkerState,
  nodeStates: NodeModel.NodeStates,
  edgeGroupStates: Reactive<EdgeModel.EdgeGroupStates>,
  layouts: Layouts,
  scale: Ref<number>,
  instanceId: string,
  edgePlacement: EdgePlacement
) {
  const { makeMarker, clearMarker } = useMarker(makerState)

  Object.assign(state, {
    origin: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
    labelPosition: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
    position: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
  })

  state.label = computed(() => {
    if (!edges.value[id]) return unref(state.label) // Return the previous value
    return Config.values(config.label, edges.value[id])
  })

  const line = computed<EdgeModel.Line>(() => {
    const edge = edges.value[id]
    const stroke = getEdgeStroke(edge, state.selected, state.hovered, config)
    // Minimum error checking required for drawing
    if (isNaN(+stroke.width)) {
      console.warn(
        "[v-network-graph] Edge width is invalid value. id=[%s] value=[%s]",
        id,
        stroke.width
      )
      stroke.width = 1
    }
    if (stroke.color === undefined || stroke.color === null) {
      console.warn(
        "[v-network-graph] Edge color is invalid value. id=[%s] value=[%s]",
        id,
        stroke.color
      )
      stroke.color = "#000000"
    }
    let normalWidth = Config.value(config.normal.width, edge)
    if (isNaN(+normalWidth)) {
      normalWidth = 1
    }
    const source = toEdgeMarker(Config.values(config.marker.source, [edge, stroke]))
    const target = toEdgeMarker(Config.values(config.marker.target, [edge, stroke]))
    return { stroke, normalWidth, source, target }
  })
  state.line = line
  const edgeLayoutPoint: Ref<EdgeModel.EdgeLayoutPoint | undefined> = toRef(
    edgeGroupStates.edgeLayoutPoints,
    id
  )
  const isEdgeSummarized: Ref<true | undefined> = toRef(edgeGroupStates.summarizedEdges, id)

  // The positions are read untracked: the effect in provideStates re-places the edges of moved nodes.
  const placeEdge = () => {
    const edge = edges.value[id]
    if (!edge) return

    const sourceShape = nodeStates[edge.source]?.staticShape
    const targetShape = nodeStates[edge.target]?.staticShape
    if (!sourceShape || !targetShape) {
      return
    }

    const positions = toRaw(layouts).nodes
    // The positions themselves can be readonly proxies, which a reactive object keeps as they are.
    const source = toRaw(positions[edge.source]) ?? { x: 0, y: 0 }
    const target = toRaw(positions[edge.target]) ?? { x: 0, y: 0 }

    const selfLoop = edge.source === edge.target ? Config.values(config.selfLoop, edge) : undefined
    const geometry = calculateEdgeGeometry({
      source,
      target,
      sourceShape,
      targetShape,
      layoutPoint: edgeLayoutPoint.value,
      summarized: isEdgeSummarized.value ?? false,
      line: line.value,
      // A self-loop is drawn the same with any type, so it does not track it.
      type: selfLoop ? "straight" : config.type,
      margin: config.margin,
      keepOrder: config.keepOrder,
      selfLoop,
      scale: scale.value,
    })
    state.origin = geometry.origin
    state.labelPosition = geometry.labelPosition
    state.position = geometry.position
    state.curve = geometry.curve
    state.loop = geometry.loop
  }
  const place = effect(placeEdge, { scheduler: () => edgePlacement.schedule(id) })
  edgePlacement.placers.set(id, place)

  const stopUpdateMarkerHandle = watchEffect(() => {
    if (!edges.value[id]) return
    state.sourceMarkerId = makeMarker(
      line.value.source,
      true /* isSource */,
      state.sourceMarkerId,
      line.value.stroke.color,
      instanceId
    )
    state.targetMarkerId = makeMarker(
      line.value.target,
      false /* isSource */,
      state.targetMarkerId,
      line.value.stroke.color,
      instanceId
    )
  })

  state.stopWatchHandle = () => {
    edgePlacement.placers.delete(id)
    stop(place)
    stopUpdateMarkerHandle()
    clearMarker(state.sourceMarkerId)
    clearMarker(state.targetMarkerId)
  }
}

function createEdgeEntries(
  edgeGroups: Record<string, EdgeModel.EdgeGroup>,
  edgeStates: EdgeModel.EdgeStates
) {
  return Object.entries(edgeGroups)
    .map(([key, group]) => {
      if (group.summarize) {
        return <EdgeModel.SummarizedEdgeItem>{
          id: Object.keys(group.edges)[0] ?? key,
          summarized: true,
          key,
          group,
          zIndex: Object.keys(group.edges)
            .map(id => edgeStates[id]?.zIndex ?? 0)
            .reduce((s, z) => Math.max(s, z)),
        }
      } else {
        return Object.entries(group.edges).map(
          ([id, edge]) =>
            <EdgeModel.SingleEdgeItem>{
              id,
              summarized: false,
              key: id,
              edge,
              zIndex: edgeStates[id]?.zIndex ?? 0,
            }
        )
      }
    })
    .flat()
}

function createSummarizedEdgeStates(
  summarizedEdgeStates: EdgeModel.SummarizedEdgeStates,
  edgeGroupStates: Reactive<EdgeModel.EdgeGroupStates>,
  configs: Configs
) {
  const groups = edgeGroupStates.edgeGroups
  Object.entries(groups)
    .filter(([id, group]) => group.summarize && !(id in summarizedEdgeStates))
    .forEach(([id, group]) => {
      const state = { stroke: undefined as any }
      state.stroke = computed<StrokeStyle>(() =>
        Config.values(configs.edge.summarized.stroke, group.edges)
      )
      summarizedEdgeStates[id] = state
    })
  Object.keys(summarizedEdgeStates).forEach(id => {
    if (!edgeGroupStates.edgeGroups[id]?.summarize) {
      delete summarizedEdgeStates[id]
    }
  })
}

function toEdgeObjects(
  path: Path,
  edges: InputObjects<Edges>,
  edgeGroupStates: EdgeModel.EdgeGroupStates
) {
  // The path skips the edges that are not drawn, such as those to missing nodes.
  return path.edges
    .map(edgeId => ({ edgeId, edge: edges.objects.value[edgeId] }))
    .filter(e => e.edge && e.edgeId in edgeGroupStates.edgeLayoutPoints)
}
