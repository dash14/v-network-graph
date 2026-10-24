import { toRaw } from "vue"
import { EdgeKeepOrderType, EdgeType, SelfLoopEdgeStyle, ShapeStyle } from "@/common/configs"
import { LinePosition, Position } from "@/common/types"
import { Arc, Curve, EdgeLayoutPoint, Line } from "@/models/edge"
import * as v2d from "@/modules/calculation/2d"
import * as LineUtils from "@/modules/calculation/line"
import { VectorLine } from "@/modules/calculation/line"
import { quadraticCurveCommands } from "@/modules/calculation/path"
import * as PointUtils from "@/modules/calculation/point"
import { calculateEdgeShiftedPosition } from "@/modules/edge/group"
import * as NodeUtils from "@/modules/node/node"
import { Vector2D } from "@/modules/vector2d"
import * as V2D from "@/modules/vector2d"
import { Point2D } from "@/modules/vector2d/core"

// -----------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------

export interface EdgeGeometryInput {
  source: Position
  target: Position
  sourceShape: ShapeStyle
  targetShape: ShapeStyle
  layoutPoint: EdgeLayoutPoint | undefined
  summarized: boolean
  line: Pick<Line, "normalWidth" | "source" | "target">
  type: EdgeType
  margin: number | null
  keepOrder: EdgeKeepOrderType
  /** The style of a self-loop, or undefined for an edge between two nodes. */
  selfLoop: SelfLoopEdgeStyle | undefined
  scale: number
}

export interface EdgeGeometry {
  origin: LinePosition // line segment between center of nodes
  labelPosition: LinePosition // line segment between the outermost of the nodes for labels
  position: LinePosition // line segments to be displayed with margins applied
  curve: Curve | undefined
  loop: Arc | undefined
}

// -----------------------------------------------------------------------
// Exported functions
// -----------------------------------------------------------------------

/**
 * Calculate where an edge is drawn.
 * @param input the positions, shapes and styles that the edge depends on
 * @returns the geometry of the edge
 */
export function calculateEdgeGeometry(input: EdgeGeometryInput): EdgeGeometry {
  const { source, target, sourceShape, targetShape, layoutPoint, summarized, line: l } = input
  const s = input.scale

  // calculate the line segment between center of nodes
  const shiftedPosition = calculateEdgeShiftedPosition(
    layoutPoint,
    summarized,
    source,
    target,
    s,
    input.keepOrder
  )

  const [sourceShapeMargin, targetShapeMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
    source,
    target,
    sourceShape,
    targetShape
  )

  // calculate the line segment between the outermost of the nodes
  const labelPosition = LineUtils.applyMargin(
    shiftedPosition,
    sourceShapeMargin * s,
    targetShapeMargin * s
  )

  // calculate margins
  let sourceMargin = 0
  let targetMargin = 0
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

  if (input.margin) {
    sourceMargin += input.margin
    targetMargin += input.margin
  }

  const isStartEdgeOfNode = !!input.margin || l.source.type !== "none" || l.target.type !== "none"

  // calculate self-loop edge
  if (input.selfLoop) {
    const [position, loop] = calculateArcGeometry(
      source,
      sourceShape,
      input.selfLoop,
      isStartEdgeOfNode,
      sourceMargin,
      targetMargin,
      layoutPoint?.pointInGroup ?? 0,
      s
    )
    const origin = LineUtils.toLinePosition(source, target)
    return { origin, labelPosition, position, curve: undefined, loop }
  }

  if (isStartEdgeOfNode) {
    sourceMargin += sourceShapeMargin
    targetMargin += targetShapeMargin
  }

  // calculate the line segments to be displayed with margins applied
  if (input.type === "straight" || summarized) {
    const origin = shiftedPosition
    const position =
      sourceMargin === 0 && targetMargin === 0
        ? origin
        : LineUtils.applyMargin(origin, sourceMargin * s, targetMargin * s)
    return { origin, labelPosition, position, curve: undefined, loop: undefined }
  }

  // curve
  const origin = LineUtils.toLinePosition(source, target)

  const shift = layoutPoint // undefined after node deletion
    ? layoutPoint.groupWidth / 2 - layoutPoint.pointInGroup
    : 0

  const [position, curve] = calculateCurveGeometry(
    origin,
    shiftedPosition,
    shift,
    sourceMargin * s,
    targetMargin * s
  )
  return { origin, labelPosition, position, curve, loop: undefined }
}

interface DrawnEdge {
  position: LinePosition
  curve?: Curve
  loop?: Arc
}

/**
 * Make the path commands that draw an edge.
 * @param edge the geometry of the edge
 * @returns the value of the `d` attribute
 */
export function edgePathOf(edge: DrawnEdge): string {
  const p = edge.position
  if (edge.loop) {
    const { radius, isLargeArc, isClockwise } = edge.loop
    const [rx, ry] = radius
    const f1 = isLargeArc ? 1 : 0
    const f2 = isClockwise ? 1 : 0
    return `M ${p.p1.x} ${p.p1.y} A ${rx} ${ry} 0 ${f1} ${f2} ${p.p2.x} ${p.p2.y}`
  } else if (edge.curve) {
    const points = [...edge.curve.control, { x: p.p2.x, y: p.p2.y }]
    return [`M ${p.p1.x} ${p.p1.y}`, ...quadraticCurveCommands(points)].join(" ")
  } else {
    return `M ${p.p1.x} ${p.p1.y} L ${p.p2.x} ${p.p2.y}`
  }
}

/**
 * Calculate the length of the drawn line of an edge.
 * @param edge the geometry of the edge
 * @returns the length
 */
export function edgeLengthOf(edge: DrawnEdge): number {
  return segmentsOf(edge).reduce((sum, s) => sum + s.length, 0)
}

/**
 * Calculate the point at a distance along the drawn line of an edge, as
 * `SVGGeometryElement.getPointAtLength()` does.
 * @param edge the geometry of the edge
 * @param distance the distance from the start, clamped to the line
 * @returns the point
 */
export function pointAlongEdge(edge: DrawnEdge, distance: number): Position {
  const segments = segmentsOf(edge)
  let rest = Math.max(distance, 0)
  for (const segment of segments) {
    if (rest <= segment.length) return segment.pointAt(rest)
    rest -= segment.length
  }
  const { p2 } = edge.position
  return { x: p2.x, y: p2.y }
}

// -----------------------------------------------------------------------
// Private functions
// -----------------------------------------------------------------------

interface Segment {
  length: number
  pointAt: (distance: number) => Position
}

// Each placement makes a new position, so the segments are kept for as long as it is drawn.
const segmentCache = new WeakMap<LinePosition, Segment[]>()

function segmentsOf(edge: DrawnEdge): Segment[] {
  const key = toRaw(edge.position)
  let segments = segmentCache.get(key)
  if (!segments) {
    segments = measureSegments(edge)
    segmentCache.set(key, segments)
  }
  return segments
}

function measureSegments(edge: DrawnEdge): Segment[] {
  const { p1, p2 } = edge.position
  if (edge.loop) {
    return [arcSegment(p1, p2, edge.loop)]
  } else if (edge.curve) {
    const points = [p1, ...edge.curve.control, p2]
    const segments: Segment[] = []
    for (let i = 0; i + 2 < points.length; i += 2) {
      segments.push(quadraticSegment(points[i], points[i + 1], points[i + 2]))
    }
    return segments
  } else {
    return [lineSegment(p1, p2)]
  }
}

function lineSegment(p1: Position, p2: Position): Segment {
  const length = Math.hypot(p2.x - p1.x, p2.y - p1.y)
  return {
    length,
    pointAt: d => {
      const t = length === 0 ? 0 : d / length
      return { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t }
    },
  }
}

function arcSegment(p1: Position, p2: Position, arc: Arc): Segment {
  const { center } = arc
  const radius = arc.radius[0]
  const start = Math.atan2(p1.y - center.y, p1.x - center.x)
  const end = Math.atan2(p2.y - center.y, p2.x - center.x)
  // A clockwise arc on screen, where y points down, goes toward larger angles.
  const turn = 2 * Math.PI
  const sweep = arc.isClockwise
    ? (((end - start) % turn) + turn) % turn
    : -((((start - end) % turn) + turn) % turn)
  return {
    length: Math.abs(sweep) * radius,
    pointAt: d => {
      const angle = start + Math.sign(sweep) * (d / radius)
      return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) }
    },
  }
}

// Gauss-Legendre nodes and weights on [-1, 1], exact enough for the speed of a quadratic curve.
const GAUSS_POINTS = [
  [-0.9324695142031521, 0.1713244923791704],
  [-0.6612093864662645, 0.3607615730481386],
  [-0.2386191860831969, 0.467913934572691],
  [0.2386191860831969, 0.467913934572691],
  [0.6612093864662645, 0.3607615730481386],
  [0.9324695142031521, 0.1713244923791704],
]

function quadraticSegment(p0: Position, c: Position, p2: Position): Segment {
  const pointAtT = (t: number) => {
    const u = 1 - t
    return {
      x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y,
    }
  }
  const speed = (t: number) => {
    const dx = 2 * ((1 - t) * (c.x - p0.x) + t * (p2.x - c.x))
    const dy = 2 * ((1 - t) * (c.y - p0.y) + t * (p2.y - c.y))
    return Math.hypot(dx, dy)
  }
  const lengthTo = (t: number) =>
    (GAUSS_POINTS.reduce((sum, [x, w]) => sum + w * speed((t * (x + 1)) / 2), 0) * t) / 2
  const length = lengthTo(1)
  return {
    length,
    pointAt: d => {
      let lo = 0
      let hi = 1
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2
        if (lengthTo(mid) < d) lo = mid
        else hi = mid
      }
      return pointAtT((lo + hi) / 2)
    },
  }
}

function calculateCurveGeometry(
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

  if (radius === 0) {
    return [originPosition, curve]
  } else if (shift === 0) {
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

function calculateArcGeometry(
  nodePos: Position,
  nodeShape: ShapeStyle,
  selfLoopStyle: SelfLoopEdgeStyle,
  isStartEdgeOfNode: boolean,
  sourceMargin: number,
  targetMargin: number,
  pointInGroup: number,
  scale: number
): [LinePosition, Arc] {
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
      ;[p1, p2] = intersects
      let direction = 1
      if (!isClockwise) {
        ;[p1, p2] = [p2, p1]
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
