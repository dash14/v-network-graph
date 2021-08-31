// the states of nodes and edges

import { computed, ComputedRef, reactive, Ref, toRef, unref, UnwrapRef } from "vue"
import { watch, watchEffect, WatchStopHandle } from "vue"
import { inject, InjectionKey, provide } from "vue"
import { nonNull, Reactive } from "../common/common"
import { Config, Configs, EdgeConfig, MarkerStyle, NodeConfig } from "../common/configs"
import { ShapeStyle, NodeLabelStyle, StrokeStyle } from "../common/configs"
import { Edge, Edges, Layouts, LinePosition, Node, NodePositions, Nodes } from "../common/types"
import { EdgeGroupStates, makeEdgeGroupStates, calculateEdgePosition } from "../common/edge-group"
import { clearMarker, makeMarker } from "./marker"
import * as v2d from "../common/2d"

// -----------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------

export type { EdgeGroupStates }

// States of nodes

interface NodeStateDatum {
  shape: Ref<ShapeStyle>
  staticShape: Ref<ShapeStyle>
  label: Ref<NodeLabelStyle>
  labelText: Ref<string>
  selected: boolean
  hovered: boolean
}

export type NodeState = UnwrapRef<NodeStateDatum>
export type NodeStates = Record<string, NodeState>

// States of edges
interface Line {
  stroke: StrokeStyle
  source: MarkerStyle
  target: MarkerStyle
}

interface EdgeStateDatum {
  line: Ref<Line>
  normalWidth: number // stroke width when not hovered
  selected: boolean
  hovered: boolean
  origin: LinePosition // line segment between center of nodes
  outers: LinePosition // line segment between the outermost of the nodes
  position: LinePosition // line segments to be displayed with margins applied
  sourceMarkerId: string | undefined
  targetMarkerId: string | undefined
  stopWatchHandle: WatchStopHandle
}

export type EdgeState = UnwrapRef<EdgeStateDatum>
export type EdgeStates = Record<string, EdgeState>

// Provide states

interface States {
  nodeStates: NodeStates
  edgeStates: EdgeStates
  edgeGroupStates: EdgeGroupStates
  layouts: Layouts
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
  units: "strokeWidth",
  color: null,
}

// -----------------------------------------------------------------------
// Exported functions
// -----------------------------------------------------------------------

export function provideStates(
  nodes: Readonly<Nodes>,
  edges: Readonly<Edges>,
  selectedNodes: Reactive<Set<string>>,
  selectedEdges: Reactive<Set<string>>,
  hoveredNodes: Reactive<Set<string>>,
  hoveredEdges: Reactive<Set<string>>,
  configs: Readonly<Configs>,
  layouts: Reactive<Layouts>,
  scale: ComputedRef<number>
) {
  const nodeStates: NodeStates = reactive({})
  const edgeStates: EdgeStates = reactive({})

  // -----------------------------------------------------------------------
  // States for nodes
  // -----------------------------------------------------------------------

  Object.keys(nodes).forEach(id => {
    createNodeState(nodeStates, nodes, id, selectedNodes.has(id), false, configs.node)
  })

  // update `node.selected` flag
  watch(
    () => [...selectedNodes],
    (nodes, prev) => {
      const append = nodes.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !nodes.includes(n))
      append.forEach(id => {
        const state = nodeStates[id]
        if (state && !state.selected) state.selected = true
      })
      removed.forEach(id => {
        const state = nodeStates[id]
        if (state && state.selected) state.selected = false
      })
    }
  )

  // update `node.hovered` flag
  watch(
    () => [...hoveredNodes],
    (nodes, prev) => {
      const append = nodes.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !nodes.includes(n))
      append.forEach(id => {
        const state = nodeStates[id]
        if (state && !state.hovered) state.hovered = true
      })
      removed.forEach(id => {
        const state = nodeStates[id]
        if (state && state.hovered) state.hovered = false
      })
    }
  )

  // handle increase/decrease nodes
  watch(
    () => new Set(Object.keys(nodes)),
    (idSet, prev) => {
      for (const nodeId of idSet) {
        if (prev.has(nodeId)) continue
        // node added
        createNodeState(nodeStates, nodes, nodeId, false, false, configs.node)
        // adding to layouts is done by layout handler
      }

      const positions = layouts.nodes
      for (const nodeId of prev) {
        if (idSet.has(nodeId)) continue
        // node removed
        delete positions[nodeId]
        selectedNodes.delete(nodeId)
        hoveredNodes.delete(nodeId)
        delete nodeStates[nodeId]
      }
    }
  )

  // -----------------------------------------------------------------------
  // States for edges
  // -----------------------------------------------------------------------

  // grouping
  const edgeGroupStates = makeEdgeGroupStates(nodes, edges, configs)

  Object.keys(edges).forEach(id => {
    createEdgeState(
      edgeStates,
      edgeGroupStates,
      nodeStates,
      edges,
      id,
      selectedEdges.has(id),
      configs.edge,
      layouts.nodes,
      scale
    )
  })

  // update `edge.selected` flag
  watch(
    () => [...selectedEdges],
    (nodes, prev) => {
      const append = nodes.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !nodes.includes(n))
      append.forEach(id => {
        const state = edgeStates[id]
        if (state && !state.selected) state.selected = true
      })
      removed.forEach(id => {
        const state = edgeStates[id]
        if (state && state.selected) state.selected = false
      })
    }
  )

  // update `edge.hovered` flag
  watch(
    () => [...hoveredEdges],
    (nodes, prev) => {
      const append = nodes.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !nodes.includes(n))

      append.forEach(id => {
        const state = edgeStates[id]
        if (state && !state.hovered) {
          state.hovered = true
        }
      })

      removed.forEach(id => {
        const state = edgeStates[id]
        if (state && state.hovered) {
          state.hovered = false
        }
      })
    }
  )

  // handle increase/decrease edges
  watch(
    () => new Set(Object.keys(edges)),
    (idSet, prev) => {
      for (const edgeId of idSet) {
        if (prev.has(edgeId)) continue
        // edge added
        createEdgeState(
          edgeStates,
          edgeGroupStates,
          nodeStates,
          edges,
          edgeId,
          false, // selected
          configs.edge,
          layouts.nodes,
          scale
        )
      }

      for (const edgeId of prev) {
        if (idSet.has(edgeId)) continue
        // remove edge
        selectedEdges.delete(edgeId)
        hoveredEdges.delete(edgeId)
        edgeStates[edgeId].stopWatchHandle()
        delete edgeStates[edgeId]
      }
    }
  )

  const states = { nodeStates, edgeStates, edgeGroupStates, layouts }
  provide(statesKey, states)
  return states
}

export function useStates() {
  return nonNull(inject(statesKey), "states")
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
  if (selected && config.selected) {
    return Config.values(config.selected, node)
  } else {
    return Config.values(config.normal, node)
  }
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

function createNodeState(
  states: NodeStates,
  nodes: Nodes,
  id: string,
  selected: boolean,
  hovered: boolean,
  config: NodeConfig
) {
  states[id] = { selected, hovered } as any
  const state = states[id] as any as NodeStateDatum
  state.shape = computed(() => getNodeShape(nodes[id], state.selected, state.hovered, config))
  state.staticShape = computed(() => getNodeStaticShape(nodes[id], state.selected, config))
  state.label = computed(() => Config.values(config.label, nodes[id]))
  state.labelText = computed(() => {
    if (config.label.text instanceof Function) {
      return unref(state.label).text
    } else {
      return nodes[id]?.[unref(state.label).text] ?? ""
    }
  })
}

function toEdgeMarker(marker: MarkerStyle): MarkerStyle {
  if (marker.type === "none") {
    return NONE_MARKER
  } else {
    return marker
  }
}

function createEdgeState(
  states: EdgeStates,
  groupStates: Reactive<EdgeGroupStates>,
  nodeStates: NodeStates,
  edges: Edges,
  id: string,
  selected: boolean,
  config: EdgeConfig,
  layouts: NodePositions,
  scale: ComputedRef<number>
) {
  const edge = edges[id]
  if (!edge) return

  states[id] = {
    selected,
    hovered: false,
    origin: { x1: 0, y1: 0, x2: 0, y2: 0 },
    outers: { x1: 0, y1: 0, x2: 0, y2: 0 },
    position: { x1: 0, y1: 0, x2: 0, y2: 0 },
  } as any
  const state = states[id] as any as EdgeStateDatum

  const line = computed(() => {
    const edge = edges[id]
    const stroke = getEdgeStroke(edge, state.selected, state.hovered, config)
    const normalWidth = Config.value(config.normal.width, edge)
    const source = toEdgeMarker(Config.values(config.marker.source, [edge, stroke]))
    const target = toEdgeMarker(Config.values(config.marker.target, [edge, stroke]))
    return { stroke, normalWidth, source, target }
  })
  state.line = line

  const edgeLayoutPoint = toRef(groupStates.edgeLayoutPoints, id)
  const isEdgeSummarized = toRef(groupStates.summarizedEdges, id)

  const stopCalcHandle = watchEffect(() => {
    const edge = edges[id]
    if (!edge) return

    const source = layouts[edge?.source]
    const target = layouts[edge?.target]
    const sourceShape = nodeStates[edge?.source]?.staticShape
    const targetShape = nodeStates[edge?.target]?.staticShape
    if (!source || !target || !sourceShape || !targetShape) {
      return
    }

    // calculate the line segment between center of nodes
    state.origin = calculateEdgePosition(
      edgeLayoutPoint.value,
      isEdgeSummarized.value,
      source,
      target,
      scale.value
    )

    // calculate the line segment between the outermost of the nodes
    state.outers = v2d.calculateLinePositionBetweenNodes(
      state.origin,
      source,
      target,
      sourceShape,
      targetShape,
      scale.value
    )

    // calculate the line segments to be displayed with margins applied
    let sourceMargin = 0
    let targetMargin = 0
    const l = line.value
    if (l.source.type !== "none") {
      const marker = l.source
      sourceMargin = marker.margin + marker.width
      if (marker.units === "strokeWidth") {
        sourceMargin *= l.normalWidth
      }
    }
    if (l.target.type !== "none") {
      const marker = l.target
      targetMargin = marker.margin + marker.width
      if (marker.units === "strokeWidth") {
        targetMargin *= l.normalWidth
      }
    }
    const s = scale.value
    let edgePosition: LinePosition
    if (config.margin === null || config.margin === undefined) {
      if (l.source.type === "none" && l.target.type === "none") {
        edgePosition = state.origin
      } else {
        edgePosition = state.outers
      }
    } else {
      edgePosition = state.outers
      sourceMargin += config.margin
      targetMargin += config.margin
    }
    if (sourceMargin === 0 && targetMargin === 0) {
      state.position = edgePosition
    } else {
      state.position = v2d.applyMarginToLine(edgePosition, sourceMargin * s, targetMargin * s)
    }
  })

  const stopUpdateMarkerHandle = watchEffect(() => {
    if (!edges[id]) return
    state.sourceMarkerId = makeMarker(
      line.value.source,
      true /* isSource */,
      state.sourceMarkerId,
      line.value.stroke.color
    )
    state.targetMarkerId = makeMarker(
      line.value.target,
      false /* isSource */,
      state.targetMarkerId,
      line.value.stroke.color
    )
  })

  states[id].stopWatchHandle = () => {
    stopCalcHandle()
    stopUpdateMarkerHandle()
    clearMarker(state.sourceMarkerId)
    clearMarker(state.targetMarkerId)
  }
}
