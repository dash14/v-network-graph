import Victor from "victor"
import { AnyShapeStyle, RectangleShapeStyle, StrokeStyle } from "./configs"
import { LinePosition, Position } from "./types"
import * as V from "../common/vector"
import minBy from "lodash-es/minBy"

export interface Line {
  source: Position
  target: Position
}

function lineVector(line: Line): Victor {
  return Victor.fromObject(line.target).subtract(Victor.fromObject(line.source))
}

/**
 * Calculate the nearest point from a point to a line.
 * @param p point
 * @param line line
 * @returns point on the line
 */
function getNearestPoint(p: Victor, line: Line): Victor {
  const n = lineVector(line).normalize()

  // Let `a` be a vector from any one point on a line to a point
  const lp = Victor.fromObject(line.source)
  const a = p.clone().subtract(lp)

  // Inner product of `n` and `a`
  const dot = n.dot(a)

  // The nearest point is the sum of a point on the line and a
  // vector of n multiplied by dot.
  const near = lp.add(n.multiplyScalar(dot))

  return near
}

/**
 * Calculate the intersection of a line and a circle.
 * @param line line
 * @param targetSide side of the line where the node is located. true: target side, false: source side
 * @param center center of the circle
 * @param radius radius of the circle
 * @returns intersection point
 */
export function getIntersectPointLineAndCircle(
  line: Line,
  targetSide: boolean,
  center: Position,
  radius: number
): Position | null {
  // Does the node contain a point?
  const p = targetSide ? Victor.fromObject(line.target) : Victor.fromObject(line.source)
  const c = Victor.fromObject(center)
  const contains = p.subtract(c).lengthSq() < radius * radius

  if (!contains) return null // Not contained.

  // If contained, calculate the intersection point.

  // Find the nearest point `h` between `c` and the line
  const h = getNearestPoint(c, line)

  // Let `hp` be the vector from `c` to `h`.
  const hp = h.clone().subtract(c)
  const hpLen = hp.length()

  // If `hpLen` is larger than the radius of the circle,
  // there is no intersection.
  if (radius < hpLen) return null

  // When a straight line and a circle are tangent, `hpLen` is `r`.
  // Then the point of contact is the nearest point between the
  // center and the line.
  if (radius === hpLen) return h.toObject()

  // Let `t` be the distance from `h` to the contact point, and
  // derive t from the Three Square Theorem.
  const t = Math.sqrt(radius ** 2 - hpLen ** 2)

  // Let `tv` be the vector of the normalized direction vector of
  // the line multiplied by t
  // - intersection point 1：p + tv
  // - intersection point 2：p - tv
  const tv = lineVector(line).normalize().multiplyScalar(t)

  // Calculate the addition or subtraction depending on which side
  // of the line to focus on.
  if (targetSide) {
    return h.subtract(tv)
  } else {
    return h.add(tv)
  }
}

/**
 * Calculate the intersection of two lines.
 * @param line1 line 1
 * @param line2 line 2
 * @returns intersection point
 */
export function getIntersectionPointOfLines(line1: Line, line2: Line): Position {
  const p2 = Victor.fromObject(line2.source)
  const v = p2.clone().subtract(Victor.fromObject(line1.source))

  const v1 = lineVector(line1)
  const v2 = lineVector(line2)

  const t2 = v.cross(v1) / v1.cross(v2)

  return p2.add(v2.multiplyScalar(t2)).toObject()
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
  const p = Victor.fromObject(point)
  const c = Victor.fromObject(center)
  const v = p.subtract(c)
  return v.lengthSq() < radius * radius
}


// 角丸四角形に触れないようにするための距離を取得する

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

  if (borderRadius == 0) {
    // 矩形の頂点と直線との最近傍点を算出する
    vertexes.push(
      V.Vector.fromArray([left, top]),
      V.Vector.fromArray([left, bottom]),
      V.Vector.fromArray([right, top]),
      V.Vector.fromArray([right, bottom]),
    )
  } else {
    // 四隅と角丸ではない直線部分の頂点と、直線との最近傍点を算出する
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

export function calculateEdgeLabelArea(
  linePos: LinePosition,
  edgeStyle: StrokeStyle,
  sourceNodePos: Position,
  targetNodePos: Position,
  sourceNodeShape: AnyShapeStyle,
  targetNodeShape: AnyShapeStyle,
  margin: number,
  padding: number,
  scale: number
) {
  const line = V.fromLinePosition(linePos)
  const normalized = line.v.clone().normalize()

  // source side
  let sv: V.Vector
  if (sourceNodeShape.type === "circle") {
    const radius = (sourceNodeShape.radius + padding) * scale
    const d = normalized.clone().multiplyScalar(radius)
    sv = line.source.clone().add(d)
  } else {
    const m = calculateDistanceToAvoidOverlapsWithRect(
      targetNodePos,
      sourceNodePos,
      sourceNodeShape,
      scale
    )
    const nm = (m / scale + padding) * scale
    const d = normalized.clone().multiplyScalar(nm)
    sv = line.source.clone().add(d)
  }

  // target side
  let tv: V.Vector
  if (targetNodeShape.type === "circle") {
    const radius = (targetNodeShape.radius + padding) * scale
    const d = normalized.clone().multiplyScalar(radius)
    tv = line.target.clone().subtract(d)
  } else {
    const m = calculateDistanceToAvoidOverlapsWithRect(
      sourceNodePos,
      targetNodePos,
      targetNodeShape,
      scale
    )
    const nm = (m / scale + padding) * scale
    const d = normalized.clone().multiplyScalar(nm)
    tv = line.target.clone().subtract(d)
  }

  // margin for edges
  const labelMargin = (edgeStyle.width / 2 + margin) * scale
  const vMargin = V.Vector.fromArray([-normalized.y, normalized.x]).multiplyScalar(labelMargin)
  let sourceAbove = sv.clone().subtract(vMargin).toObject()
  let sourceBelow = sv.clone().add(vMargin).toObject()
  let targetAbove = tv.clone().add(vMargin).toObject()
  let targetBelow = tv.clone().subtract(vMargin).toObject()

  const angle = line.v.angleDeg()
  if (angle < -90 || angle >= 90) {
    // 上下逆転
    [sourceAbove, sourceBelow] = [sourceBelow, sourceAbove];
    [targetAbove, targetBelow] = [targetBelow, targetAbove]
  }
  return {
    source: { above: sourceAbove, below: sourceBelow },
    target: { above: targetAbove, below: targetBelow },
  }
}