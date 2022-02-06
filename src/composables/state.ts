// the states of nodes and edges

import { computed, ComputedRef, reactive, Ref, toRef, unref, UnwrapRef } from "vue"
import { watch, watchEffect, WatchStopHandle } from "vue"
import { inject, InjectionKey, provide } from "vue"
import { nonNull, Reactive } from "../common/common"
import {
  Config,
  Configs,
  EdgeConfig,
  MarkerStyle,
  NodeConfig,
  ZOrderConfig,
} from "../common/configs"
import { ShapeStyle, NodeLabelStyle, StrokeStyle } from "../common/configs"
import { Edge, Edges, Layouts, Node, Nodes } from "../common/types"
import { LinePosition, NodePositions, Position } from "../common/types"
import { EdgeGroupStates } from "../common/edge-group"
import { clearMarker, makeMarker } from "./marker"
import * as EdgeGroup from "../common/edge-group"
import * as v2d from "../common/2d"
import * as V from "../common/vector"

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
  draggable: Ref<boolean>
  selectable: Ref<boolean | number>
  zIndex: Ref<number>
}

export type NodeState = UnwrapRef<NodeStateDatum>
export type NodeStates = Record<string, NodeState>

// States of edges
interface Line {
  stroke: StrokeStyle
  normalWidth: number // stroke width when not hovered
  source: MarkerStyle
  target: MarkerStyle
}

export interface Curve {
  center: V.Vector
  theta: number // theta: direction of source to center
  circle: {
    center: V.Vector
    radius: number
  }
  control: Position[]
}

interface EdgeStateDatum {
  line: Ref<Line>
  selectable: Ref<boolean | number>
  selected: boolean
  hovered: boolean
  origin: LinePosition // line segment between center of nodes
  labelPosition: LinePosition // line segment between the outermost of the nodes for labels
  position: LinePosition // line segments to be displayed with margins applied
  curve?: Curve
  sourceMarkerId?: string
  targetMarkerId?: string
  zIndex: Ref<number>
  stopWatchHandle: WatchStopHandle
}

interface SummarizedEdgeStateDatum {
  stroke: Ref<StrokeStyle>
}

export type EdgeState = UnwrapRef<EdgeStateDatum>
export type EdgeStates = Record<string, EdgeState>
export type SummarizedEdgeState = UnwrapRef<SummarizedEdgeStateDatum>
export type SummarizedEdgeStates = Record<string, SummarizedEdgeState>

// Edge item for display (an edge or summarized edges)
interface EdgeItem {
  summarized: boolean
  key: string
  zIndex: number
}
interface SummarizedEdgeItem extends EdgeItem {
  group: EdgeGroup.EdgeGroup
}
interface SingleEdgeItem extends EdgeItem {
  edge: Edge
}
type EdgeEntries = [string, SummarizedEdgeItem | SingleEdgeItem][]

// Provide states

interface States {
  nodeStates: NodeStates
  edgeStates: EdgeStates
  edgeGroupStates: EdgeGroupStates
  summarizedEdgeStates: SummarizedEdgeStates
  nodeZOrderedList: ComputedRef<Node>
  edgeZOrderedList: ComputedRef<EdgeEntries>
  layouts: Layouts
}

export type ReadonlyStates = Readonly<States>

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
  nodes: Ref<Nodes>,
  edges: Ref<Edges>,
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
  const summarizedEdgeStates: SummarizedEdgeStates = reactive({})

  // -----------------------------------------------------------------------
  // States for nodes
  // -----------------------------------------------------------------------

  Object.keys(nodes.value).forEach(id => {
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
    () => new Set(Object.keys(nodes.value)),
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
  const edgeGroupStates = EdgeGroup.makeEdgeGroupStates(nodes, edges, configs)

  Object.keys(edges.value).forEach(id => {
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

  watch(
    edgeGroupStates.edgeGroups,
    _ => createSummarizedEdgeStates(summarizedEdgeStates, edgeGroupStates, configs),
    { immediate: true }
  )

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
    () => new Set(Object.keys(edges.value)),
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

  // z-index applied Node List
  const nodeZOrderedList = computed(() => {
    return makeZOrderedList(
      Object.entries(nodeStates),
      configs.node.zOrder,
      hoveredNodes,
      selectedNodes
    )
  })

  // Edge item for display (an edge or summarized edges)
  const edgeEntries = computed<EdgeEntries>(() => {
    const entries: EdgeEntries = []
    Object.entries(edgeGroupStates.edgeGroups).forEach(([key, group]) => {
      if (group.summarize) {
        entries.push([
          Object.keys(group.edges)[0] ?? key,
          <SummarizedEdgeItem>{
            summarized: true,
            key,
            group,
            zIndex: Object.keys(group.edges)
              .map(id => edgeStates[id]?.zIndex ?? 0)
              .reduce((s, z) => Math.max(s, z)),
          },
        ])
      } else {
        Object.entries(group.edges).forEach(([id, edge]) => {
          entries.push([
            id,
            <SingleEdgeItem>{
              summarized: false,
              key: id,
              edge,
              zIndex: edgeStates[id]?.zIndex ?? 0,
            },
          ])
        })
      }
    })
    return entries
  })

  // z-index applied Edge List
  const edgeZOrderedList = computed<EdgeEntries>(() => {
    const edges = makeZOrderedList(
      edgeEntries.value,
      configs.edge.zOrder,
      hoveredEdges,
      selectedEdges
    )
    return edges
  })

  const states = <States>{
    nodeStates,
    edgeStates,
    edgeGroupStates,
    summarizedEdgeStates,
    layouts,
    nodeZOrderedList,
    edgeZOrderedList,
  }
  provide(statesKey, states)
  return states
}

export function isSummarizedEdges(item: EdgeItem): item is SummarizedEdgeItem {
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
  nodes: Ref<Nodes>,
  id: string,
  selected: boolean,
  hovered: boolean,
  config: NodeConfig
) {
  states[id] = { selected, hovered } as any
  const state = states[id] as any as NodeStateDatum

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

  state.selectable = computed(() => {
    if (!nodes.value[id]) return unref(state.selectable) // Return the previous value
    return Config.value(config.selectable, nodes.value[id])
  })

  state.zIndex = computed(() => {
    if (!nodes.value[id]) return unref(state.zIndex) // Return the previous value
    return Config.value(config.zOrder.zIndex, nodes.value[id])
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
  edges: Ref<Edges>,
  id: string,
  selected: boolean,
  config: EdgeConfig,
  layouts: NodePositions,
  scale: ComputedRef<number>
) {
  const edge = edges.value[id]
  if (!edge) return

  states[id] = {
    line: undefined as any, // specify later
    selectable: false, // specify later
    selected,
    hovered: false,
    curve: undefined,
    origin: { x1: 0, y1: 0, x2: 0, y2: 0 },
    labelPosition: { x1: 0, y1: 0, x2: 0, y2: 0 },
    position: { x1: 0, y1: 0, x2: 0, y2: 0 },
    zIndex: undefined as any, // specify later
    stopWatchHandle: () => {},
  }

  const state = states[id] as any as EdgeStateDatum

  const line = computed<Line>(() => {
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
  state.selectable = computed(() => Config.value(config.selectable, edges.value[id]))
  state.zIndex = computed(() => Config.value(config.zOrder.zIndex, edges.value[id]))

  const edgeLayoutPoint = toRef(groupStates.edgeLayoutPoints, id)
  const isEdgeSummarized = toRef(groupStates.summarizedEdges, id)

  const stopCalcHandle = watchEffect(() => {
    const edge = edges.value[id]
    if (!edge) return

    const source = layouts[edge?.source]
    const target = layouts[edge?.target]

    const sourceShape = nodeStates[edge?.source]?.staticShape
    const targetShape = nodeStates[edge?.target]?.staticShape
    if (!source || !target || !sourceShape || !targetShape) {
      return
    }

    // calculate the line segment between center of nodes
    const shiftedPosition = EdgeGroup.calculateEdgeShiftedPosition(
      edgeLayoutPoint.value,
      isEdgeSummarized.value,
      source,
      target,
      scale.value,
      config.keepOrder
    )

    const [sourceShapeMargin, targetShapeMargin] =
      v2d.calculateDistancesFromCenterOfNodeToEndOfNode(source, target, sourceShape, targetShape)

    const s = scale.value

    // calculate the line segment between the outermost of the nodes
    state.labelPosition = v2d.applyMarginToLine(
      shiftedPosition,
      sourceShapeMargin * s,
      targetShapeMargin * s
    )

    // calculate margins
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

    if (config.margin === null || config.margin === undefined) {
      if (l.source.type !== "none" || l.target.type !== "none") {
        sourceMargin += sourceShapeMargin
        targetMargin += targetShapeMargin
      }
    } else {
      sourceMargin += config.margin + sourceShapeMargin
      targetMargin += config.margin + targetShapeMargin
    }

    // calculate the line segments to be displayed with margins applied
    const type = config.type
    if (type === "straight") {
      state.origin = shiftedPosition
      state.curve = undefined
      if (sourceMargin === 0 && targetMargin === 0) {
        state.position = state.origin
      } else {
        state.position = v2d.applyMarginToLine(state.origin, sourceMargin * s, targetMargin * s)
      }
    } else {
      // curve
      state.origin = v2d.positionsToLinePosition(source, target)
      const shift = edgeLayoutPoint.value.groupWidth / 2 - edgeLayoutPoint.value.pointInGroup

      const [position, curve] = calculateCurvePositionAndState(
        state.origin,
        shiftedPosition,
        shift,
        sourceMargin * s,
        targetMargin * s
      )
      state.position = position
      state.curve = curve
    }
  })

  const stopUpdateMarkerHandle = watchEffect(() => {
    if (!edges.value[id]) return
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

function calculateCurvePositionAndState(
  originPosition: LinePosition,
  shiftedPosition: LinePosition,
  shift: number,
  sourceMargin: number,
  targetMargin: number
): [LinePosition, Curve | undefined] {
  // The curve is assumed to be part of a perfect circle and is drawn
  // as a Bezier curve.

  const origin = V.fromLinePosition(originPosition)
  const shifted = V.fromLinePosition(shiftedPosition)
  const shiftedCenter = V.getCenterOfLinePosition(shiftedPosition)

  // Calculate the center and radius of the circle of the curve.
  const [center, radius] = V.calculateCircleCenterAndRadiusBy3Points(
    origin.source,
    origin.target,
    shiftedCenter
  )

  let position: LinePosition
  let curve: Curve | undefined = undefined

  if (shift === 0) {
    // The line connecting the centers of the nodes is regarded as a straight line.
    if (sourceMargin === 0 && targetMargin === 0) {
      position = originPosition
    } else {
      position = v2d.applyMarginToLine(originPosition, sourceMargin, targetMargin)
    }
    return [position, curve]
  }

  // Apply margin to the line.
  const centerToTop = V.fromVectors(center, shiftedCenter)

  // Direction of rotation from source to center:
  const theta0 = V.calculateRelativeAngleRadian(V.fromVectors(center, origin.source), centerToTop)

  if (sourceMargin === 0 && targetMargin === 0) {
    position = originPosition
  } else {
    // The endpoints of the display line are the point on the circumference
    // moved by the margin from the origin end points.
    let sourceMoveRad = sourceMargin / radius
    let targetMoveRad = targetMargin / radius

    // Determine which direction to move.
    if (theta0 > 0) {
      sourceMoveRad *= -1
      targetMoveRad *= -1
    }
    position = v2d.positionsToLinePosition(
      v2d.moveOnCircumference(origin.source, center, sourceMoveRad),
      v2d.moveOnCircumference(origin.target, center, -targetMoveRad)
    )

    // If the endpoints are swapped by applying the margin,
    // a short line is shown at the center.
    let theta1 = V.calculateRelativeAngleRadian(
      V.fromVectors(center, origin.source),
      V.fromVectors(center, origin.target)
    )
    let theta2 = V.calculateRelativeAngleRadian(
      V.fromPositions(center, { x: position.x1, y: position.y1 }),
      V.fromPositions(center, { x: position.x2, y: position.y2 })
    )
    if (theta0 * theta1 < 0) {
      theta1 = v2d.reverseAngleRadian(theta1)
      if (theta0 * theta2 < 0) {
        theta2 = v2d.reverseAngleRadian(theta2)
      }
    }
    if (theta1 * theta2 < 0) {
      // reversed
      const c = shiftedCenter.clone().add(shifted.v.normalize().multiplyScalar(0.5))
      position = v2d.positionsToLinePosition(shiftedCenter, c)
      return [position, curve]
    }
  }

  // Calculate the control/via points of a Bezier curve.
  const [p1, p2] = V.toVectorsFromLinePosition(position)
  const control = v2d
    .calculateBezierCurveControlPoint(p1, center, p2, theta0)
    .map(p => p.toObject())

  curve = {
    center: shiftedCenter,
    theta: theta0,
    circle: { center, radius },
    control,
  }
  return [position, curve]
}

function createSummarizedEdgeStates(
  summarizedEdgeStates: SummarizedEdgeStates,
  edgeGroupStates: Reactive<EdgeGroupStates>,
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

function makeZOrderedList<S extends { zIndex: number }, T>(
  states: [string, S][],
  zOrder: ZOrderConfig<T>,
  hovered: Reactive<Set<string>>,
  selected: Reactive<Set<string>>
) {
  if (zOrder.toTopOnHovered && zOrder.toTopOnSelected) {
    return states.sort((a, b) => {
      const hover1 = hovered.has(a[0])
      const hover2 = hovered.has(b[0])
      if (hover1 != hover2) {
        return hover1 ? 1 : -1
      }
      const selected1 = selected.has(a[0])
      const selected2 = selected.has(b[0])
      if (selected1 != selected2) {
        return selected1 ? 1 : -1
      }
      return a[1].zIndex - b[1].zIndex
    })
  } else if (zOrder.toTopOnHovered) {
    return states.sort((a, b) => {
      const hover1 = hovered.has(a[0])
      const hover2 = hovered.has(b[0])
      if (hover1 != hover2) {
        return hover1 ? 1 : -1
      }
      return a[1].zIndex - b[1].zIndex
    })
  } else if (zOrder.toTopOnSelected) {
    return states.sort((a, b) => {
      const selected1 = selected.has(a[0])
      const selected2 = selected.has(b[0])
      if (selected1 != selected2) {
        return selected1 ? 1 : -1
      }
      return a[1].zIndex - b[1].zIndex
    })
  } else {
    return states.sort((a, b) => {
      return a[1].zIndex - b[1].zIndex
    })
  }
}
