// the states of nodes and edges

import { computed, ComputedRef, reactive, Ref, toRef, unref, UnwrapRef } from "vue"
import { watch, watchEffect, WatchStopHandle } from "vue"
import { inject, InjectionKey, provide } from "vue"
import { nonNull, Reactive } from "@/common/common"
import { Config, Configs, EdgeConfig, MarkerStyle, NodeConfig } from "@/common/configs"
import { ShapeStyle, NodeLabelStyle, StrokeStyle, ZOrderConfig } from "@/common/configs"
import { Edge, Edges, Layouts, Node, Nodes } from "@/common/types"
import { LinePosition, NodePositions, Position } from "@/common/types"
import { Vector2D } from "@/modules/vector2d"
import * as EdgeGroup from "@/modules/edge/group"
import { EdgeGroupStates } from "@/modules/edge/group"
import * as v2d from "@/modules/calculation/2d"
import * as LineUtils from "@/modules/calculation/line"
import { VectorLine } from "@/modules/calculation/line"
import { MarkerState, useMarker } from "./marker"
import { useObjectState } from "./objectState"

// -----------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------

export type { EdgeGroupStates }

// States of nodes

export interface NodeStateDatum {
  id: string
  shape: ComputedRef<ShapeStyle>
  staticShape: ComputedRef<ShapeStyle>
  label: ComputedRef<NodeLabelStyle>
  labelText: ComputedRef<string>
  selected: boolean
  hovered: boolean
  draggable: ComputedRef<boolean>
  selectable: ComputedRef<boolean | number>
  zIndex: ComputedRef<number>
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
  center: Vector2D
  theta: number // theta: direction of source to center
  circle: {
    center: Vector2D
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
  id: string
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
type EdgeEntry = SummarizedEdgeItem | SingleEdgeItem

// Provide states

interface States {
  nodeStates: NodeStates
  edgeStates: EdgeStates
  edgeGroupStates: EdgeGroupStates
  summarizedEdgeStates: SummarizedEdgeStates
  nodeZOrderedList: ComputedRef<NodeState[]>
  edgeZOrderedList: ComputedRef<EdgeEntry[]>
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
  makerState: MarkerState,
  scale: ComputedRef<number>
) {
  const edgeStates: EdgeStates = reactive({})
  const summarizedEdgeStates: SummarizedEdgeStates = reactive({})

  // -----------------------------------------------------------------------
  // States for nodes
  // -----------------------------------------------------------------------

  const {
    states: nodeStates,
    zOrderedList: nodeZOrderedList, //
  } = useObjectState<Node, NodeStateDatum>(
    nodes,
    configs.node,
    selectedNodes,
    hoveredNodes,
    (nodes, id, newState) => {
      const config = configs.node
      const state = newState as NodeStateDatum
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
    },
    (nodeId, _state) => {
      const positions = layouts.nodes
      delete positions[nodeId]
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
      makerState,
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
          makerState,
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

  // Edge item for display (an edge or summarized edges)
  const edgeEntries = computed<EdgeEntry[]>(() => {
    return Object.entries(edgeGroupStates.edgeGroups)
      .map(([key, group]) => {
        if (group.summarize) {
          return <SummarizedEdgeItem>{
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
              <SingleEdgeItem>{
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
  })

  // z-index applied Edge List
  const edgeZOrderedList = computed<EdgeEntry[]>(() => {
    if (configs.edge.zOrder.enabled) {
      const edges = makeZOrderedList(
        edgeEntries.value,
        configs.edge.zOrder,
        hoveredEdges,
        selectedEdges
      )
      return edges
    } else {
      return edgeEntries.value
    }
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
  makerState: MarkerState,
  scale: ComputedRef<number>
) {
  const { makeMarker, clearMarker } = useMarker(makerState)

  const edge = edges.value[id]
  if (!edge) return

  states[id] = {
    line: undefined as any, // specify later
    selectable: false, // specify later
    selected,
    hovered: false,
    curve: undefined,
    origin: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
    labelPosition: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
    position: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
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
    state.labelPosition = LineUtils.applyMargin(
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
        state.position = LineUtils.applyMargin(state.origin, sourceMargin * s, targetMargin * s)
      }
    } else {
      // curve
      state.origin = LineUtils.toLinePosition(source, target)
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

  const origin = VectorLine.fromLinePosition(originPosition)
  const shifted = VectorLine.fromLinePosition(shiftedPosition)
  const shiftedCenter = LineUtils.getCenterOfLinePosition(shiftedPosition)

  // Calculate the center and radius of the circle of the curve.
  const [center, radius] = v2d.calculateCircleCenterAndRadiusBy3Points(
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
      position = LineUtils.applyMargin(originPosition, sourceMargin, targetMargin)
    }
    return [position, curve]
  }

  // Apply margin to the line.
  const centerToTop = VectorLine.fromVectors(center, shiftedCenter)

  // Direction of rotation from source to center:
  const theta0 = v2d.calculateRelativeAngleRadian(
    VectorLine.fromVectors(center, origin.source),
    centerToTop
  )

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
    position = LineUtils.toLinePosition(
      v2d.moveOnCircumference(origin.source, center, sourceMoveRad),
      v2d.moveOnCircumference(origin.target, center, -targetMoveRad)
    )

    // If the endpoints are swapped by applying the margin,
    // a short line is shown at the center.
    let theta1 = v2d.calculateRelativeAngleRadian(
      VectorLine.fromVectors(center, origin.source),
      VectorLine.fromVectors(center, origin.target)
    )
    let theta2 = v2d.calculateRelativeAngleRadian(
      VectorLine.fromPositions(center, position.p1),
      VectorLine.fromPositions(center, position.p2)
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
      position = LineUtils.toLinePosition(shiftedCenter, c)
      return [position, curve]
    }
  }

  // Calculate the control/via points of a Bezier curve.
  const [p1, p2] = LineUtils.toVectorsFromLinePosition(position)
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

function makeZOrderedList<S extends { id: string; zIndex: number }, T>(
  states: S[],
  zOrder: ZOrderConfig<T>,
  hovered: Reactive<Set<string>>,
  selected: Reactive<Set<string>>
) {
  if (zOrder.bringToFrontOnHover && zOrder.bringToFrontOnSelected) {
    return states.sort((a, b) => {
      const hover1 = hovered.has(a.id)
      const hover2 = hovered.has(b.id)
      if (hover1 != hover2) {
        return hover1 ? 1 : -1
      }
      const selected1 = selected.has(a.id)
      const selected2 = selected.has(b.id)
      if (selected1 != selected2) {
        return selected1 ? 1 : -1
      }
      return a.zIndex - b.zIndex
    })
  } else if (zOrder.bringToFrontOnHover) {
    return states.sort((a, b) => {
      const hover1 = hovered.has(a.id)
      const hover2 = hovered.has(b.id)
      if (hover1 != hover2) {
        return hover1 ? 1 : -1
      }
      return a.zIndex - b.zIndex
    })
  } else if (zOrder.bringToFrontOnSelected) {
    return states.sort((a, b) => {
      const selected1 = selected.has(a.id)
      const selected2 = selected.has(b.id)
      if (selected1 != selected2) {
        return selected1 ? 1 : -1
      }
      return a.zIndex - b.zIndex
    })
  } else {
    return states.sort((a, b) => {
      return a.zIndex - b.zIndex
    })
  }
}
