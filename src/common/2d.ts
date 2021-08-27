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
    minBy(hits, p => V.toLineVector(centerLine.source, p).lengthSq()) ?? centerLine.target
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

  const angle = line.v.angleDeg()
  if (angle < -90 || angle >= 90) {
    // upside down
    [sourceAbove, sourceBelow] = [sourceBelow, sourceAbove]
    ;[targetAbove, targetBelow] = [targetBelow, targetAbove]
  }
  return {
    source: { above: sourceAbove, below: sourceBelow },
    target: { above: targetAbove, below: targetBelow },
  }
}

export function calculateEdgePosition(
  linePos: LinePosition,
  sourceNodePos: Position,
  targetNodePos: Position,
  sourceNodeShape: AnyShapeStyle,
  targetNodeShape: AnyShapeStyle,
  margin: number | undefined,
  sourceMargin: number,
  targetMargin: number,
  scale: number
): LinePosition {
  const line = V.fromLinePosition(linePos)
  const normalized = line.v.clone().normalize()

  // source side
  let distance: number
  if (margin === undefined) {
    distance = sourceMargin * scale
  } else {
    sourceMargin += margin
    if (sourceNodeShape.type === "circle") {
      distance = (sourceNodeShape.radius + sourceMargin) * scale
    } else {
      const m = calculateDistanceToAvoidOverlapsWithRect(
        targetNodePos,
        sourceNodePos,
        sourceNodeShape,
        scale
      )
      distance = (m / scale + sourceMargin) * scale
    }
  }
  const sv = line.source.clone().add(normalized.clone().multiplyScalar(distance))

  // target side
  if (margin === undefined) {
    distance = targetMargin * scale
  } else {
    targetMargin += margin

    if (targetNodeShape.type === "circle") {
      distance = (targetNodeShape.radius + targetMargin) * scale
    } else {
      const m = calculateDistanceToAvoidOverlapsWithRect(
        sourceNodePos,
        targetNodePos,
        targetNodeShape,
        scale
      )
      distance = (m / scale + targetMargin) * scale
    }
  }
  const tv = line.target.clone().subtract(normalized.clone().multiplyScalar(distance))

  const [x1, y1] = sv.toArray()
  const [x2, y2] = tv.toArray()
  return { x1, y1, x2, y2 }
}

export function calculateLinePositionBetweenNodes(
  linePos: LinePosition,
  sourceNodePos: Position,
  targetNodePos: Position,
  sourceNodeShape: AnyShapeStyle,
  targetNodeShape: AnyShapeStyle,
  scale: number
): LinePosition {
  // source side
  let sourceMargin: number
  if (sourceNodeShape.type === "circle") {
    sourceMargin = sourceNodeShape.radius * scale
  } else {
    sourceMargin = calculateDistanceToAvoidOverlapsWithRect(
      targetNodePos,
      sourceNodePos,
      sourceNodeShape,
      scale
    )
  }

  // target side
  let targetMargin: number
  if (targetNodeShape.type === "circle") {
    targetMargin = targetNodeShape.radius * scale
  } else {
    targetMargin = calculateDistanceToAvoidOverlapsWithRect(
      sourceNodePos,
      targetNodePos,
      targetNodeShape,
      scale
    )
  }

  const line = V.fromLinePosition(linePos)
  return applyMarginToLineInner(line, sourceMargin, targetMargin)
}

export function applyMarginToLine(
  linePos: LinePosition,
  sourceMargin: number,
  targetMargin: number
) {
  const line = V.fromLinePosition(linePos)
  return applyMarginToLineInner(line, sourceMargin, targetMargin)
}

export function applyMarginToLineInner(line: V.Line, sourceMargin: number, targetMargin: number) {
  const normalized = line.v.clone().normalize()

  line.v.angle()

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

  return { x1, y1, x2, y2 }
}
