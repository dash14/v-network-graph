import { AnyShapeStyle, RectangleShapeStyle, StrokeStyle } from "./configs"
import { LinePosition, Position } from "./types"
import * as V from "../common/vector"
import minBy from "lodash-es/minBy"

interface Line {
  source: Position
  target: Position
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
  return V.getIntersectionOfLineTargetAndCircle(
    V.Vector.fromObject(targetSide ? line.source : line.target),
    V.Vector.fromObject(targetSide ? line.target : line.source),
    V.Vector.fromObject(center),
    radius
  )?.toObject() ?? null
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
  return v.lengthSq() < radius * radius
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
      V.Vector.fromArray([right, bottom]),
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
      V.Vector.fromArray([right - borderRadius + hypo, bottom - borderRadius + hypo]),
    )
  }
  const hits = vertexes.map(p => V.getNearestPoint(p, centerLine))
  const minP = minBy(hits, p => V.toLineVector(centerLine.source, p).lengthSq()) ?? centerLine.target
  return V.toLineVector(minP, centerLine.target).length()
}

/**
 * Calculate the position to display the edge label from the
 * positions of the edge.
 * @param linePos position of the line
 * @param edgeStyle stroke style of edges
 * @param sourceNodePos position of the source node
 * @param targetNodePos position of the target node
 * @param sourceNodeShape shape style of the source node
 * @param targetNodeShape shape style of the target node
 * @param margin margin from line
 * @param scale scale factor
 * @returns edge label display area
 */
export function calculateEdgeLabelArea(
  linePos: LinePosition,
  edgeStyle: StrokeStyle,
  sourceNodePos: Position,
  targetNodePos: Position,
  sourceNodeShape: AnyShapeStyle,
  targetNodeShape: AnyShapeStyle,
  margin: number,
  scale: number
) {
  const line = V.fromLinePosition(linePos)
  const normalized = line.v.clone().normalize()

  // source side
  let sv: V.Vector
  if (sourceNodeShape.type === "circle") {
    const radius = (sourceNodeShape.radius + margin) * scale
    const d = normalized.clone().multiplyScalar(radius)
    sv = line.source.clone().add(d)
  } else {
    const m = calculateDistanceToAvoidOverlapsWithRect(
      targetNodePos,
      sourceNodePos,
      sourceNodeShape,
      scale
    )
    const nm = (m / scale + margin) * scale
    const d = normalized.clone().multiplyScalar(nm)
    sv = line.source.clone().add(d)
  }

  // target side
  let tv: V.Vector
  if (targetNodeShape.type === "circle") {
    const radius = (targetNodeShape.radius + margin) * scale
    const d = normalized.clone().multiplyScalar(radius)
    tv = line.target.clone().subtract(d)
  } else {
    const m = calculateDistanceToAvoidOverlapsWithRect(
      sourceNodePos,
      targetNodePos,
      targetNodeShape,
      scale
    )
    const nm = (m / scale + margin) * scale
    const d = normalized.clone().multiplyScalar(nm)
    tv = line.target.clone().subtract(d)
  }

  // margin for edges
  const labelMargin = (edgeStyle.width / 2 + margin) * scale
  const vMargin = V.Vector.fromArray([-normalized.y, normalized.x]).multiplyScalar(labelMargin)
  let sourceAbove = sv.clone().subtract(vMargin).toObject() as Position
  let sourceBelow = sv.clone().add(vMargin).toObject() as Position
  let targetAbove = tv.clone().subtract(vMargin).toObject() as Position
  let targetBelow = tv.clone().add(vMargin).toObject() as Position

  const angle = line.v.angleDeg()
  if (angle < -90 || angle >= 90) {
    // upside down
    [sourceAbove, sourceBelow] = [sourceBelow, sourceAbove];
    [targetAbove, targetBelow] = [targetBelow, targetAbove]
  }
  return {
    source: { above: sourceAbove, below: sourceBelow },
    target: { above: targetAbove, below: targetBelow },
  }
}