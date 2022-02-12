import { AnyShapeStyle, RectangleShapeStyle, StrokeStyle } from "./configs"
import { LinePosition, Position } from "./types"
import * as V from "../common/vector"
import * as Vector from "@/modules/vector2d"
import minBy from "lodash-es/minBy"

interface Line {
  source: Position
  target: Position
}

/**
 * Convert `LinePosition` to list of `Position`
 * @param line `LinePosition` instance
 * @returns list of `Position` instance
 */
export function lineTo2Positions(line: LinePosition): [Position, Position] {
  return [line.p1, line.p2]
}

/**
 * Convert two `Position` to `LinePosition`
 * @param p1 source position of the line
 * @param p2 target position of the line
 * @returns `LinePosition` instance
 */
export function positionsToLinePosition(p1: Position, p2: Position): LinePosition {
  return { p1, p2 }
}

/**
 * Calculate the intersection of a line and a circle.
 * @param line line
 * @param targetSide side of the line where the node is located. true: target side, false: source side
 * @param center center of the circle
 * @param radius radius of the circle
 * @returns intersection point
 */
export function getIntersectionOfLineAndCircle(
  line: Line,
  targetSide: boolean,
  center: Position,
  radius: number
): Position | null {
  return (
    V.getIntersectionOfLineTargetAndCircle(
      V.Vector.fromObject(targetSide ? line.source : line.target),
      V.Vector.fromObject(targetSide ? line.target : line.source),
      V.Vector.fromObject(center),
      radius
    )?.toObject() ?? null
  )
}

/**
 * Calculate the intersection of two lines.
 * @param line1 line 1
 * @param line2 line 2
 * @returns intersection point
 */
export function getIntersectionPointOfLines(line1: Line, line2: Line): Position {
  const l1 = V.fromPositions(line1.source, line1.target)
  const l2 = V.fromPositions(line2.source, line2.target)
  return V.getIntersectionPointOfLines(l1, l2).toObject()
}

/**
 * Calculate whether a point is contained in a circle.
 * @param point point
 * @param center center of the circle
 * @param radius radius of the circle
 * @returns whether point is contained in a circle
 */
export function isPointContainedInCircle(
  point: Position,
  center: Position,
  radius: number
): boolean {
  const p = V.Vector.fromObject(point)
  const c = V.Vector.fromObject(center)
  const v = p.subtract(c)
  return v.lengthSquared() < radius * radius
}

/**
 * Calculate the distance of the line.
 * @param line line
 * @returns distance
 */
export function calculateDistance(line: LinePosition): number {
  return Vector.distance(line.p1, line.p2)
}

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
  targetPos: Position, // 対象角丸四角形の位置
  rect: RectangleShapeStyle,
  scale: number
) {
  const centerLine = V.fromPositions(sourcePos, targetPos)
  const left = targetPos.x - (rect.width / 2) * scale
  const top = targetPos.y - (rect.height / 2) * scale
  const right = targetPos.x + (rect.width / 2) * scale
  const bottom = targetPos.y + (rect.height / 2) * scale
  const vertexes = []
  const borderRadius = rect.borderRadius * scale

  // Calculate the nearest neighbor points of the vertices
  // and lines of a figure.
  if (borderRadius == 0) {
    // Since it is a simple rectangle, the four corners are the vertices.
    vertexes.push(
      V.Vector.fromArray([left, top]),
      V.Vector.fromArray([left, bottom]),
      V.Vector.fromArray([right, top]),
      V.Vector.fromArray([right, bottom])
    )
  } else {
    // The edge of each line and the center of the rounded corner are
    // the vertices.
    const hypo = borderRadius * Math.sin(Math.PI / 4) // 45deg
    vertexes.push(
      V.Vector.fromArray([left + borderRadius, top]),
      V.Vector.fromArray([left, top + borderRadius]),
      V.Vector.fromArray([left + borderRadius - hypo, top + borderRadius - hypo]),
      V.Vector.fromArray([left + borderRadius, bottom]),
      V.Vector.fromArray([left, bottom - borderRadius]),
      V.Vector.fromArray([left + borderRadius - hypo, bottom - borderRadius + hypo]),
      V.Vector.fromArray([right - borderRadius, top]),
      V.Vector.fromArray([right, top + borderRadius]),
      V.Vector.fromArray([right - borderRadius + hypo, top + borderRadius - hypo]),
      V.Vector.fromArray([right - borderRadius, bottom]),
      V.Vector.fromArray([right, bottom - borderRadius]),
      V.Vector.fromArray([right - borderRadius + hypo, bottom - borderRadius + hypo])
    )
  }
  const hits = vertexes.map(p => V.getNearestPoint(p, centerLine))
  const minP =
    minBy(hits, p => V.toLineVector(centerLine.source, p).lengthSquared()) ?? centerLine.target
  return V.toLineVector(minP, centerLine.target).length()
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
) {
  // the line segment between the outermost of the nodes
  const line = V.fromLinePosition(linePos)
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
  const vMargin = V.Vector.fromArray([-normalized.y, normalized.x]).multiplyScalar(labelMargin)
  let sourceAbove = sv.clone().subtract(vMargin).toObject() as Position
  let sourceBelow = sv.clone().add(vMargin).toObject() as Position
  let targetAbove = tv.clone().subtract(vMargin).toObject() as Position
  let targetBelow = tv.clone().add(vMargin).toObject() as Position

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
    distance1 = sourceNodeShape.radius
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
    distance2 = targetNodeShape.radius
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
 * Calculates the line position to which the margin is applied.
 * @param linePos original position of the line
 * @param sourceMargin margin for source side
 * @param targetMargin margin for target side
 * @returns the line position
 */
export function applyMarginToLine(
  linePos: LinePosition,
  sourceMargin: number,
  targetMargin: number
): LinePosition {
  const line = V.fromLinePosition(linePos)
  return applyMarginToLineInner(line, sourceMargin, targetMargin)
}

function applyMarginToLineInner(
  line: V.Line,
  sourceMargin: number,
  targetMargin: number
): LinePosition {
  const normalized = line.v.clone().normalize()

  const sv = line.source.clone().add(normalized.clone().multiplyScalar(sourceMargin))

  const tv = line.target.clone().subtract(normalized.clone().multiplyScalar(targetMargin))

  let [x1, y1] = sv.toArray()
  let [x2, y2] = tv.toArray()

  const check = V.toLineVector(sv, tv)
  if (line.v.angle() * check.angle() < 0) {
    // reversed
    const c1 = V.Vector.fromArray([(x1 + x2) / 2, (y1 + y2) / 2])
    const c2 = c1.clone().add(normalized.multiplyScalar(0.5))
    ;[x1, y1] = c1.toArray()
    ;[x2, y2] = c2.toArray()
  }

  return { p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 } }
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

export function inverseLine(line: LinePosition): LinePosition {
  return { p1: line.p2, p2: line.p1 }
}

export function calculateBezierCurveControlPoint(
  p1: V.Vector,
  center: V.Vector,
  p2: V.Vector,
  theta0: number
): V.Vector[] {
  const control: V.Vector[] = []
  const centerToSource = V.fromVectors(center, p1)
  const centerToTarget = V.fromVectors(center, p2)

  let theta = V.calculateRelativeAngleRadian(centerToSource, centerToTarget)
  if (theta0 * theta < 0) {
    theta = reverseAngleRadian(theta)
  }
  const middle = V.Vector.fromObject(moveOnCircumference(p1, center, -theta / 2))
  const centerToMp = V.fromVectors(center, middle)
  const mpTangent = V.calculatePerpendicularLine(centerToMp)

  const theta1 = V.calculateRelativeAngleRadian(centerToSource, centerToMp)
  let tangent = V.calculatePerpendicularLine(centerToSource)
  if (Math.abs(theta1) < Math.PI / 2) {
    const cp = V.getIntersectionPointOfLines(tangent, mpTangent)
    control.push(cp)
  } else {
    // If greater than 90 degrees, go through the midpoint.
    const mp = V.Vector.fromObject(moveOnCircumference(middle, center, theta1 / 2))
    const tangent2 = V.calculatePerpendicularLine(V.fromVectors(center, V.Vector.fromObject(mp)))
    const cp1 = V.getIntersectionPointOfLines(tangent, tangent2)
    const cp2 = V.getIntersectionPointOfLines(tangent2, mpTangent)
    control.push(cp1, mp, cp2)
  }

  control.push(middle)

  const theta2 = V.calculateRelativeAngleRadian(centerToTarget, centerToMp)
  tangent = V.calculatePerpendicularLine(centerToTarget)
  if (Math.abs(theta2) < Math.PI / 2) {
    const cp = V.getIntersectionPointOfLines(tangent, mpTangent)
    control.push(cp)
  } else {
    // If greater than 90 degrees, go through the midpoint.
    const mp = V.Vector.fromObject(moveOnCircumference(middle, center, theta2 / 2))
    const tangent2 = V.calculatePerpendicularLine(V.fromVectors(center, V.Vector.fromObject(mp)))
    const cp1 = V.getIntersectionPointOfLines(mpTangent, tangent2)
    const cp2 = V.getIntersectionPointOfLines(tangent2, tangent)
    control.push(cp1, mp, cp2)
  }

  return control
}
