import { EdgeKeepOrderType, EdgeType, SelfLoopEdgeStyle, ShapeStyle } from "@/common/configs"
import { LinePosition, Position } from "@/common/types"
import { Arc, Curve, EdgeLayoutPoint, Line } from "@/models/edge"
import * as v2d from "@/modules/calculation/2d"
import * as LineUtils from "@/modules/calculation/line"
import { VectorLine } from "@/modules/calculation/line"
import * as PointUtils from "@/modules/calculation/point"
import { calculateEdgeShiftedPosition } from "@/modules/edge/group"
import * as NodeUtils from "@/modules/node/node"
import { Vector2D } from "@/modules/vector2d"
import * as V2D from "@/modules/vector2d"
import { Point2D } from "@/modules/vector2d/core"

// -----------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------

export interface EdgePlacementInput {
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
export function calculateEdgeGeometry(input: EdgePlacementInput): EdgeGeometry {
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
    const [position, loop] = calculateArcPositionAndState(
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

  const [position, curve] = calculateCurvePositionAndState(
    origin,
    shiftedPosition,
    shift,
    sourceMargin * s,
    targetMargin * s
  )
  return { origin, labelPosition, position, curve, loop: undefined }
}

// -----------------------------------------------------------------------
// Private functions
// -----------------------------------------------------------------------

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

function calculateArcPositionAndState(
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
