import { AnyShapeStyle, RectangleShapeStyle, StrokeStyle } from "@/common/configs"
import { EdgeLabelArea, LinePosition, Position } from "@/common/types"
import V, { Vector2D } from "@/modules/vector2d"
import * as PointUtils from "./point"
import * as LineUtils from "./line"
import { VectorLine } from "./line"

// /**
//  * Calculate whether a point is contained in a circle.
//  * @param point point
//  * @param center center of the circle
//  * @param radius radius of the circle
//  * @returns whether point is contained in a circle
//  */
// export function isPointContainedInCircle(
//   point: Position,
//   center: Position,
//   radius: number
// ): boolean {
//   const p = Vector2D.fromObject(point)
//   const c = Vector2D.fromObject(center)
//   const v = p.subtract(c)
//   return v.lengthSquared() < radius * radius
// }

// /**
//  * Calculate the distance of the line.
//  * @param line line
//  * @returns distance
//  */
// export function calculateDistance(line: LinePosition): number {
//   return V.distance(line.p1, line.p2)
// }

/**
 * Get the distance that a line should be away from the
 * edge to avoid contacting a rounded rectangle.
 * @param sourcePos source position of the line
 * @param targetPos target position of the line
 * @param rect rectangle style
 * @param scale scale factor
 * @returns distance from target position
 */
function calculateDistanceToAvoidOverlapsWithRect(
  sourcePos: Position,
  targetPos: Position, // position of the target rounded rectangle
  rect: RectangleShapeStyle,
  scale: number
) {
  const centerLine = VectorLine.fromPositions(sourcePos, targetPos)
  const halfWidth = ((rect.width + rect.strokeWidth) / 2) * scale
  const halfHeight = ((rect.height + rect.strokeWidth) / 2) * scale

  const borderRadius =
    rect.borderRadius > 0 ? (rect.borderRadius + rect.strokeWidth / 2) * scale : 0

  // check whether it crosses over the vertical or horizontal boundary
  const angleVRad = (centerLine.v.angle() - Math.PI / 2) % Math.PI
  const angleHRad = Math.PI / 2 - (angleVRad % Math.PI)
  const w = halfHeight * Math.abs(Math.tan(angleVRad))
  const h = halfWidth * Math.abs(Math.tan(angleHRad))
  const isCrossedVLine = w <= halfWidth - borderRadius
  const isCrossedHLine = h <= halfHeight - borderRadius
  if (isCrossedVLine || isCrossedHLine || borderRadius === 0) {
    if (isCrossedVLine) {
      return Math.sqrt(halfHeight ** 2 + w ** 2)
    } else {
      return Math.sqrt(halfWidth ** 2 + h ** 2)
    }
  } else {
    // on the border radius: calculate the center of circles
    const left = targetPos.x - halfWidth + borderRadius
    const top = targetPos.y - halfHeight + borderRadius
    const right = targetPos.x + halfWidth - borderRadius
    const bottom = targetPos.y + halfHeight - borderRadius
    const vertexes = [
      new Vector2D(left, top),
      new Vector2D(right, top),
      new Vector2D(right, bottom),
      new Vector2D(left, bottom),
    ]
    const index = Math.floor(((centerLine.v.angleDegree() + 360) % 360) / 90)
    const centerOfNearestCircle = vertexes[index]
    const point = PointUtils.getIntersectionOfLineTargetAndCircle(
      centerLine.source,
      PointUtils.getNearestPoint(centerOfNearestCircle, centerLine),
      centerOfNearestCircle,
      borderRadius
    )
    return point
      ? LineUtils.toLineVector(point, centerLine.target).length()
      : LineUtils.toLineVector(centerOfNearestCircle, centerLine.target).length() + borderRadius
  }
}

/**
 * Calculate the position to display the edge label from the
 * positions of the edge.
 * @param linePos line segment between the outermost of the nodes
 * @param edgeStyle stroke style of edges
 * @param margin margin from line
 * @param padding padding from outside
 * @param scale scale factor
 * @returns edge label display area
 */
export function calculateEdgeLabelArea(
  linePos: LinePosition,
  edgeStyle: StrokeStyle,
  margin: number,
  padding: number,
  scale: number
): EdgeLabelArea {
  // the line segment between the outermost of the nodes
  const line = VectorLine.fromLinePosition(linePos)
  const normalized = line.v.clone().normalize()

  // source side
  const sv =
    padding === 0
      ? line.source
      : line.source.clone().add(normalized.clone().multiplyScalar(padding * scale))

  // target side
  const tv =
    padding === 0
      ? line.target
      : line.target.clone().subtract(normalized.clone().multiplyScalar(padding * scale))

  // margin for edges
  const labelMargin = (edgeStyle.width / 2 + margin) * scale
  const vMargin = new Vector2D(-normalized.y, normalized.x).multiplyScalar(labelMargin)
  let sourceAbove = V.subtract(sv, vMargin)
  let sourceBelow = V.add(sv, vMargin)
  let targetAbove = V.subtract(tv, vMargin)
  let targetBelow = V.add(tv, vMargin)

  const angle = line.v.angleDegree()
  if (angle < -90 || angle >= 90) {
    // upside down
    ;[sourceAbove, sourceBelow] = [sourceBelow, sourceAbove]
    ;[targetAbove, targetBelow] = [targetBelow, targetAbove]
  }
  return {
    source: { above: sourceAbove, below: sourceBelow },
    target: { above: targetAbove, below: targetBelow },
  }
}

/**
 * Calculate the distances between center of node and edge of node.
 * @param sourceNodePos position of source node
 * @param targetNodePos position of target node
 * @param sourceNodeShape shape config of source node
 * @param targetNodeShape shape config of target node
 * @returns the distances
 */
export function calculateDistancesFromCenterOfNodeToEndOfNode(
  sourceNodePos: Position,
  targetNodePos: Position,
  sourceNodeShape: AnyShapeStyle,
  targetNodeShape: AnyShapeStyle
): [number, number] {
  // source side
  let distance1: number
  if (sourceNodeShape.type === "circle") {
    distance1 = sourceNodeShape.radius + (sourceNodeShape.strokeWidth / 2)
  } else {
    distance1 = calculateDistanceToAvoidOverlapsWithRect(
      targetNodePos,
      sourceNodePos,
      sourceNodeShape,
      1 // scale
    )
  }

  // target side
  let distance2: number
  if (targetNodeShape.type === "circle") {
    distance2 = targetNodeShape.radius + (targetNodeShape.strokeWidth / 2)
  } else {
    distance2 = calculateDistanceToAvoidOverlapsWithRect(
      sourceNodePos,
      targetNodePos,
      targetNodeShape,
      1 // scale
    )
  }

  return [distance1, distance2]
}

/**
 * Calculates the position of a given distance along the circumference.
 * @param pos original position
 * @param center center of the circle
 * @param radian radius of the circle
 * @returns the moved position
 */
export function moveOnCircumference(pos: Position, center: Position, radian: number) {
  const { x, y } = pos
  const dx = x - center.x
  const dy = y - center.y

  return {
    x: dx * Math.cos(radian) - dy * Math.sin(radian) + center.x,
    y: dx * Math.sin(radian) + dy * Math.cos(radian) + center.y,
  }
}

/**
 * Reverse the direction of the angle.
 * @param theta angle
 * @returns reversed angle
 */
export function reverseAngleRadian(theta: number): number {
  if (theta > 0) {
    return -(Math.PI * 2 - theta)
  } else {
    return Math.PI * 2 + theta
  }
}

export function calculateBezierCurveControlPoint(
  p1: Vector2D,
  center: Vector2D,
  p2: Vector2D,
  theta0: number
): Vector2D[] {
  const control: Vector2D[] = []
  const centerToSource = VectorLine.fromVectors(center, p1)
  const centerToTarget = VectorLine.fromVectors(center, p2)

  let theta = calculateRelativeAngleRadian(centerToSource, centerToTarget)
  if (theta0 * theta < 0) {
    theta = reverseAngleRadian(theta)
  }
  const middle = Vector2D.fromObject(moveOnCircumference(p1, center, -theta / 2))
  const centerToMp = VectorLine.fromVectors(center, middle)
  const mpTangent = LineUtils.calculatePerpendicularLine(centerToMp)

  const theta1 = calculateRelativeAngleRadian(centerToSource, centerToMp)
  let tangent = LineUtils.calculatePerpendicularLine(centerToSource)
  if (Math.abs(theta1) < Math.PI / 2) {
    const cp = PointUtils.getIntersectionPointOfLines(tangent, mpTangent)
    control.push(cp)
  } else {
    // If greater than 90 degrees, go through the midpoint.
    const mp = Vector2D.fromObject(moveOnCircumference(middle, center, theta1 / 2))
    const tangent2 = LineUtils.calculatePerpendicularLine(
      VectorLine.fromVectors(center, Vector2D.fromObject(mp))
    )
    const cp1 = PointUtils.getIntersectionPointOfLines(tangent, tangent2)
    const cp2 = PointUtils.getIntersectionPointOfLines(tangent2, mpTangent)
    control.push(cp1, mp, cp2)
  }

  control.push(middle)

  const theta2 = calculateRelativeAngleRadian(centerToTarget, centerToMp)
  tangent = LineUtils.calculatePerpendicularLine(centerToTarget)
  if (Math.abs(theta2) < Math.PI / 2) {
    const cp = PointUtils.getIntersectionPointOfLines(tangent, mpTangent)
    control.push(cp)
  } else {
    // If greater than 90 degrees, go through the midpoint.
    const mp = Vector2D.fromObject(moveOnCircumference(middle, center, theta2 / 2))
    const tangent2 = LineUtils.calculatePerpendicularLine(
      VectorLine.fromVectors(center, Vector2D.fromObject(mp))
    )
    const cp1 = PointUtils.getIntersectionPointOfLines(mpTangent, tangent2)
    const cp2 = PointUtils.getIntersectionPointOfLines(tangent2, tangent)
    control.push(cp1, mp, cp2)
  }

  return control
}

export function calculateRelativeAngleRadian(line1: VectorLine, line2: VectorLine) {
  return Math.atan2(
    line1.v.y * line2.v.x - line1.v.x * line2.v.y,
    line1.v.x * line2.v.x + line1.v.y * line2.v.y
  )
}

export function calculateCircleCenterAndRadiusBy3Points(
  p1: Vector2D,
  p2: Vector2D,
  p3: Vector2D
): [Vector2D, number] {
  const x1 = p1.x
  const y1 = p1.y
  const x2 = p2.x
  const y2 = p2.y
  const x3 = p3.x
  const y3 = p3.y
  const x12 = x1 - x2
  const y12 = y1 - y2
  const x32 = x3 - x2
  const y32 = y3 - y2

  if ((x12 === 0 && y12 === 0) || (x32 === 0 && y32 === 0)) {
    // Cannot determine the curve if two or more of the three points are in the same position.
    return [p1, 0];
  }

  const x =
    (y32 * (x12 * (x1 + x2) + y12 * (y1 + y2)) - y12 * (x32 * (x3 + x2) + y32 * (y3 + y2))) /
    (2 * x12 * y32 - 2 * y12 * x32)
  const y =
    (-x32 * (x12 * (x1 + x2) + y12 * (y1 + y2)) + x12 * (x32 * (x3 + x2) + y32 * (y3 + y2))) /
    (2 * x12 * y32 - 2 * y12 * x32)

  const radius = Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2))
  const center = new Vector2D(x, y)
  return [center, radius]
}
