// the states of nodes and edges

import { computed, ComputedRef, reactive, ref, Ref, toRef, unref } from "vue"
import { watch, watchEffect } from "vue"
import { inject, InjectionKey, provide } from "vue"
import { nonNull, Reactive } from "@/common/common"
import { Config, Configs, EdgeConfig, MarkerStyle, NodeConfig, OppositeNode } from "@/common/configs"
import { StrokeStyle, ShapeStyle, SelfLoopEdgeStyle } from "@/common/configs"
import { Edge, Edges, Layouts, Node, Nodes, Path, Paths } from "@/common/types"
import { LinePosition, Position } from "@/common/types"
import { useId } from "@/composables/id"
import * as NodeModel from "@/models/node"
import * as EdgeModel from "@/models/edge"
import * as EdgeGroup from "@/modules/edge/group"
import * as PathModel from "@/models/path"
import * as v2d from "@/modules/calculation/2d"
import * as LineUtils from "@/modules/calculation/line"
import * as PointUtils from "@/modules/calculation/point"
import * as NodeUtils from "@/modules/node/node"
import { VectorLine } from "@/modules/calculation/line"
import { Vector2D } from "@/modules/vector2d"
import * as V2D from "@/modules/vector2d"
import { Point2D } from "@/modules/vector2d/core"
import { updateObjectDiff } from "@/utils/object"
import { useObjectState } from "./objectState"
import { MarkerState, useMarker } from "./marker"

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
  makerState: MarkerState,
  scale: ComputedRef<number>
) {
  const summarizedEdgeStates: EdgeModel.SummarizedEdgeStates = reactive({})

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
        layouts
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
        instanceId
      )
    },
    (_edgeId, state) => {
      state.stopWatchHandle?.()
    },
    () => edgeEntries.value
  )

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

      state.path = paths.value[id]
      state.edges = computed(() => {
        const path = paths.value[id]
        return path.edges
          .map(edgeId => ({ edgeId, edge: edges.objects.value[edgeId] }))
          .filter(e => e.edge)
      })
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
  return states
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
  if (selected && config.selected) {
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
  layouts: Reactive<Layouts>
) {
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
    return Object.entries(state.oppositeNodeIds).reduce((nodes, entry) => {
      const [edgeId, nodeId] = entry as [string, string]
      const pos = layouts.nodes[nodeId]
      if (pos) nodes[edgeId] = { nodeId, pos: { ...pos } }
      return nodes
    }, {} as Record<string, OppositeNode>)
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
  instanceId: number
) {
  const { makeMarker, clearMarker } = useMarker(makerState)

  Object.assign(state, {
    origin: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
    labelPosition: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
    position: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
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

  const stopCalcHandle = watchEffect(() => {
    const edge = edges.value[id]
    if (!edge) return

    const sourceShape = nodeStates[edge.source]?.staticShape
    const targetShape = nodeStates[edge.target]?.staticShape
    if (!sourceShape || !targetShape) {
      return
    }

    const source = layouts.nodes[edge?.source] ?? { x: 0, y: 0 }
    const target = layouts.nodes[edge?.target] ?? { x: 0, y: 0 }

    // calculate the line segment between center of nodes
    const shiftedPosition = EdgeGroup.calculateEdgeShiftedPosition(
      edgeLayoutPoint.value,
      isEdgeSummarized.value ?? false,
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

    if (config.margin) {
      sourceMargin += config.margin
      targetMargin += config.margin
    }

    const isStartEdgeOfNode =
      !!config.margin || l.source.type !== "none" || l.target.type !== "none"

    // calculate self-loop edge
    if (edge.source === edge.target) {
      state.origin = LineUtils.toLinePosition(source, target)

      const selfLoopStyle = Config.values(config.selfLoop, edge)
      const [position, arc] = calculateArcPositionAndState(
        source,
        sourceShape,
        selfLoopStyle,
        isStartEdgeOfNode,
        sourceMargin,
        targetMargin,
        edgeLayoutPoint.value?.pointInGroup ?? 0,
        s
      )
      state.position = position
      state.loop = arc
      state.curve = undefined
      return
    } else {
      state.loop = undefined
    }

    if (isStartEdgeOfNode) {
      sourceMargin += sourceShapeMargin
      targetMargin += targetShapeMargin
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

      const shift = edgeLayoutPoint.value // undefined after node deletion
        ? edgeLayoutPoint.value.groupWidth / 2 - edgeLayoutPoint.value.pointInGroup
        : 0

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
    stopCalcHandle()
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

function calculateCurvePositionAndState(
  originPosition: LinePosition,
  shiftedPosition: LinePosition,
  shift: number,
  sourceMargin: number,
  targetMargin: number
): [LinePosition, EdgeModel.Curve | undefined] {
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
  let curve: EdgeModel.Curve | undefined = undefined

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

function calculateArcPositionAndState(
  nodePos: Position,
  nodeShape: ShapeStyle,
  selfLoopStyle: SelfLoopEdgeStyle,
  isStartEdgeOfNode: boolean,
  sourceMargin: number,
  targetMargin: number,
  pointInGroup: number,
  scale: number
): [LinePosition, EdgeModel.Arc] {
  const s = scale

  // calculate the center position of the Arc
  const radius = (selfLoopStyle.radius + pointInGroup / 2) * s
  const d = selfLoopStyle.offset * s + radius
  const rad = (selfLoopStyle.angle - 90) * (Math.PI / 180)
  const center = Vector2D.fromObject({
    x: nodePos.x + d * Math.cos(rad),
    y: nodePos.y + d * Math.sin(rad),
  })

  const isClockwise = selfLoopStyle.isClockwise

  let p1: Point2D | undefined, p2: Point2D | undefined
  if (isStartEdgeOfNode) {
    const intersects = PointUtils.getIntersectionOfCircles(
      center,
      radius,
      Vector2D.fromObject(nodePos),
      NodeUtils.getNodeRadius(nodeShape) * s
    )
    if (intersects) {
      [p1, p2] = intersects
      let direction = 1
      if (!isClockwise) {
        [p1, p2] = [p2, p1]
        direction = -1
      }
      if (sourceMargin !== 0 || targetMargin !== 0) {
        const sourceMoveRad = ((sourceMargin * s) / radius) * direction
        const targetMoveRad = ((targetMargin * s) / radius) * direction
        p1 = v2d.moveOnCircumference(p1, center, sourceMoveRad)
        p2 = v2d.moveOnCircumference(p2, center, -targetMoveRad)
      }
    }
  }
  if (p1 === undefined || p2 === undefined) {
    const radiusLine = Vector2D.fromObject(nodePos)
      .subtract(center)
      .normalize()
      .multiplyScalar(radius)
    let rad = 1 * (Math.PI / 180)
    if (!isClockwise) rad *= -1
    p1 = center.clone().add(V2D.rotate(radiusLine, rad))
    p2 = center.clone().add(V2D.rotate(radiusLine, -rad))
  }
  const a1 = Vector2D.fromObject(p1).subtract(center).angleDegree()
  const a2 = Vector2D.fromObject(p2).subtract(center).angleDegree()
  const angle = (a2 + 360 - a1) % 360

  const isLargeArc = angle >= 180 ? true : false
  return [
    { p1, p2 },
    {
      center,
      radius: [radius, radius],
      isLargeArc: isClockwise ? isLargeArc : !isLargeArc,
      isClockwise,
    },
  ]
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
