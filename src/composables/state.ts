// the states of nodes and edges

import { computed, ComputedRef, reactive, Ref, toRef, unref, UnwrapRef } from "vue"
import { watch, watchEffect, WatchStopHandle } from "vue"
import { inject, InjectionKey, provide } from "vue"
import { nonNull, Reactive } from "../common/common"
import { Config, Configs, EdgeConfig, MarkerStyle, NodeConfig } from "../common/configs"
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

interface Curve {
  enable: boolean
  center: Position
  circle: {
    center: Position
    radius: number
  }
  control: Position[]
}

interface EdgeStateDatum {
  line: Ref<Line>
  selected: boolean
  hovered: boolean
  origin: LinePosition // line segment between center of nodes
  labelPosition: LinePosition // line segment between the outermost of the nodes for labels
  position: LinePosition // line segments to be displayed with margins applied
  curve?: Curve
  sourceMarkerId?: string
  targetMarkerId?: string
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
  const edgeGroupStates = EdgeGroup.makeEdgeGroupStates(nodes, edges, configs)

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
    line: undefined as any, // specify later
    selected,
    hovered: false,
    curve: undefined,
    origin: { x1: 0, y1: 0, x2: 0, y2: 0 },
    labelPosition: { x1: 0, y1: 0, x2: 0, y2: 0 },
    position: { x1: 0, y1: 0, x2: 0, y2: 0 },
    stopWatchHandle: () => {},
  }

  const state = states[id] as any as EdgeStateDatum

  const line = computed<Line>(() => {
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
  const control = []
  const [p1, p2] = V.toVectorsFromLinePosition(position)
  const centerToSource = V.fromVectors(center, p1)
  const centerToTarget = V.fromVectors(center, p2)

  let theta = V.calculateRelativeAngleRadian(centerToSource, centerToTarget)
  if (theta0 * theta < 0) {
    theta = v2d.reverseAngleRadian(theta)
  }
  const middle = V.Vector.fromObject(v2d.moveOnCircumference(p1, center, -theta / 2))
  const centerToMp = V.fromVectors(center, middle)
  const mpTangent = V.calculatePerpendicularLine(centerToMp)

  const theta1 = V.calculateRelativeAngleRadian(centerToSource, centerToMp)
  let tangent = V.calculatePerpendicularLine(centerToSource)
  if (Math.abs(theta1) < Math.PI / 2) {
    const cp = V.getIntersectionPointOfLines(tangent, mpTangent).toObject()
    control.push(cp)
  } else {
    // If greater than 90 degrees, go through the midpoint.
    const mp = v2d.moveOnCircumference(middle, center, theta1 / 2)
    const tangent2 = V.calculatePerpendicularLine(V.fromVectors(center, V.Vector.fromObject(mp)))
    const cp1 = V.getIntersectionPointOfLines(tangent, tangent2).toObject()
    const cp2 = V.getIntersectionPointOfLines(tangent2, mpTangent).toObject()
    control.push(cp1, mp, cp2)
  }

  control.push(middle.toObject())

  const theta2 = V.calculateRelativeAngleRadian(centerToTarget, centerToMp)
  tangent = V.calculatePerpendicularLine(centerToTarget)
  if (Math.abs(theta2) < Math.PI / 2) {
    const cp = V.getIntersectionPointOfLines(tangent, mpTangent).toObject()
    control.push(cp)
  } else {
    // If greater than 90 degrees, go through the midpoint.
    const mp = v2d.moveOnCircumference(middle, center, theta2 / 2)
    const tangent2 = V.calculatePerpendicularLine(V.fromVectors(center, V.Vector.fromObject(mp)))
    const cp1 = V.getIntersectionPointOfLines(mpTangent, tangent2).toObject()
    const cp2 = V.getIntersectionPointOfLines(tangent2, tangent).toObject()
    control.push(cp1, mp, cp2)
  }

  curve = {
    enable: true,
    center: shiftedCenter.toObject(),
    circle: { center, radius },
    control,
  }
  return [position, curve]
}
